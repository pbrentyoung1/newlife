import mysql from "mysql2/promise";

const sourceName = process.env.EDITORIAL_DB_NAME;
const targetName = process.env.PUBLICATION_DB_NAME;
const sourceAccount = sourceName?.match(/^(u[0-9]+)_newlife_stage$/)?.[1];
const targetAccount = targetName?.match(/^(u[0-9]+)_newlife_pub(?:_b)?$/)?.[1];
if (!sourceAccount || sourceAccount !== targetAccount) {
  throw new Error("This publisher requires the matching New Life staging databases");
}
if (!process.argv.includes("--apply-staging")) {
  throw new Error("Pass --apply-staging to replace the staging publication snapshot");
}

function connect(prefix, database) {
  const user = process.env[`${prefix}_DB_USER`];
  const password = process.env[`${prefix}_DB_PASSWORD`];
  if (!user || !password) throw new Error(`Missing ${prefix} database credentials`);
  return mysql.createConnection({
    host: "127.0.0.1",
    port: 3306,
    database,
    user,
    password,
    connectTimeout: 4000,
    dateStrings: true,
  });
}

let source;
let target;
try {
  target = await connect("PUBLICATION", targetName);
  const [[lock]] = await target.execute("SELECT GET_LOCK(?, 5) AS acquired", [`${targetName}:publication`]);
  if (lock.acquired !== 1) throw new Error("Another publication refresh is running");
  source = await connect("EDITORIAL", sourceName);
  await source.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
  await source.query("START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY");
  const [sermons] = await source.query(
    "SELECT id, slug, youtube_video_id, title, summary, preached_on, speaker_name, series_title FROM public_sermons",
  );
  const [scripture] = await source.query(
    "SELECT sermon_id, sort_order, citation FROM public_sermon_scripture",
  );
  await source.commit();

  await target.beginTransaction();
  await target.query("DELETE FROM public_sermon_scripture");
  await target.query("DELETE FROM public_sermons");
  for (const s of sermons) {
    await target.execute(
      `INSERT INTO public_sermons (id, slug, youtube_video_id, title, summary, preached_on, speaker_name, series_title)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [s.id, s.slug, s.youtube_video_id, s.title, s.summary, s.preached_on, s.speaker_name, s.series_title],
    );
  }
  for (const r of scripture) {
    await target.execute(
      "INSERT INTO public_sermon_scripture (sermon_id, sort_order, citation) VALUES (?, ?, ?)",
      [r.sermon_id, r.sort_order, r.citation],
    );
  }
  await target.commit();
  console.info(`Published staging snapshot with ${sermons.length} sermons and ${scripture.length} Scripture references.`);
} catch (error) {
  if (target) await target.rollback().catch(() => {});
  const code = typeof error?.code === "string" ? error.code : "PUBLICATION_FAILED";
  console.error(`Staging publication failed (${code}).`);
  process.exitCode = 1;
} finally {
  await Promise.allSettled([source?.end(), target?.end()]);
}
