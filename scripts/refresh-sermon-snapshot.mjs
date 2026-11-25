import mysql from "mysql2/promise";
import { replaceSnapshot } from "./lib/sermon-snapshot.mjs";

const { EDITORIAL_DB_NAME, EDITORIAL_DB_USER, EDITORIAL_DB_PASSWORD, SERMON_SNAPSHOT_PATH } = process.env;
let source;
try {
  if (!process.argv.includes("--apply-staging") || !/^u[0-9]+_newlife_stage$/.test(EDITORIAL_DB_NAME ?? "") ||
      !EDITORIAL_DB_USER || !EDITORIAL_DB_PASSWORD || !SERMON_SNAPSHOT_PATH) {
    throw new Error("Staging refresh configuration is missing");
  }
  source = await mysql.createConnection({
    host: "127.0.0.1",
    port: 3306,
    database: EDITORIAL_DB_NAME,
    user: EDITORIAL_DB_USER,
    password: EDITORIAL_DB_PASSWORD,
    connectTimeout: 4000,
    dateStrings: true,
  });
  const [[lock]] = await source.execute("SELECT GET_LOCK(?, 0) AS acquired", [`${EDITORIAL_DB_NAME}:sqlite-publication`]);
  if (lock.acquired !== 1) {
    console.info("Another staging snapshot refresh is already running.");
  } else {
    const snapshotTime = Date.now();
    await source.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
    await source.query("START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY");
    const [sermons] = await source.query({
      sql: "SELECT id, slug, youtube_video_id, title, summary, preached_on, speaker_name, series_title FROM public_sermons ORDER BY id",
      timeout: 8000,
    });
    const [scripture] = await source.query({
      sql: "SELECT sermon_id, sort_order, citation FROM public_sermon_scripture ORDER BY sermon_id, sort_order",
      timeout: 8000,
    });
    await source.commit();
    const sermonIds = new Set(sermons.map(row => row.id));
    replaceSnapshot(SERMON_SNAPSHOT_PATH, sermons, scripture.filter(row => sermonIds.has(row.sermon_id)), snapshotTime);
    console.info(`Refreshed staging snapshot with ${sermons.length} published sermons.`);
  }
} catch (error) {
  // Driver errors can contain SQL or connection details.
  console.error(`Staging snapshot refresh failed (${error?.code ?? "CONFIG_OR_SNAPSHOT_ERROR"}).`);
  process.exitCode = 1;
} finally {
  await source?.end();
}
