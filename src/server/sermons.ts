import { createPool, type Pool, type RowDataPacket } from "mysql2/promise";
import { isAbsolute } from "node:path";
import { DatabaseSync } from "node:sqlite";

export interface PublishedSermon extends RowDataPacket {
  id: number;
  slug: string;
  youtube_video_id: string;
  title: string;
  summary: string;
  preached_on: string | null;
  speaker_name: string | null;
  series_title: string | null;
}

interface Scripture extends RowDataPacket {
  citation: string;
}

let pool: Pool | undefined;

function database(): Pool {
  if (pool) return pool;
  const { PUBLICATION_DB_NAME, PUBLICATION_DB_USER, PUBLICATION_DB_PASSWORD } = process.env;
  if (!PUBLICATION_DB_NAME || !PUBLICATION_DB_USER || !PUBLICATION_DB_PASSWORD) {
    throw new Error("Sermon reader database settings are missing");
  }
  pool = createPool({
    host: "127.0.0.1",
    port: 3306,
    user: PUBLICATION_DB_USER,
    password: PUBLICATION_DB_PASSWORD,
    database: PUBLICATION_DB_NAME,
    connectionLimit: 4,
    queueLimit: 16,
    connectTimeout: 4000,
    dateStrings: true,
    multipleStatements: false,
  });
  return pool;
}

const columns = "id, slug, youtube_video_id, title, summary, preached_on, speaker_name, series_title";
const pageSize = 30;

function readSnapshot<T>(path: string, read: (db: DatabaseSync) => T): T {
  if (!isAbsolute(path)) throw new Error("Invalid sermon snapshot path");
  const db = new DatabaseSync(path, { readOnly: true });
  try {
    const version = db.prepare("PRAGMA user_version").get()?.user_version;
    const updated = db.prepare("SELECT created_at_ms FROM snapshot_metadata").get()?.created_at_ms;
    if (version !== 1 || typeof updated !== "number" || Date.now() - updated > 5 * 60_000) {
      throw new Error("The published sermon snapshot is stale or incompatible");
    }
    return read(db);
  } finally {
    db.close();
  }
}

export async function listPublishedSermons(page: number) {
  const query = `SELECT ${columns} FROM public_sermons
                 ORDER BY preached_on DESC, id DESC LIMIT ? OFFSET ?`;
  const parameters = [pageSize + 1, (page - 1) * pageSize] as const;
  const snapshot = process.env.SERMON_SNAPSHOT_PATH;
  if (snapshot !== undefined) {
    return readSnapshot(snapshot, db => {
      const rows = db.prepare(query).all(...parameters) as PublishedSermon[];
      return { sermons: rows.slice(0, pageSize), hasNext: rows.length > pageSize };
    });
  }
  const [rows] = await database().execute<PublishedSermon[]>(
    { sql: query, timeout: 4000 },
    [...parameters],
  );
  return { sermons: rows.slice(0, pageSize), hasNext: rows.length > pageSize };
}

export async function getPublishedSermon(slug: string) {
  if (slug.length > 180 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  const sermonQuery = `SELECT ${columns} FROM public_sermons WHERE slug = ?`;
  const scriptureQuery = "SELECT citation FROM public_sermon_scripture WHERE sermon_id = ? ORDER BY sort_order";
  const snapshot = process.env.SERMON_SNAPSHOT_PATH;
  if (snapshot !== undefined) {
    return readSnapshot(snapshot, db => {
      const sermon = db.prepare(sermonQuery).get(slug) as PublishedSermon | undefined;
      if (!sermon) return null;
      const scripture = db.prepare(scriptureQuery).all(sermon.id) as Scripture[];
      return { sermon, scripture };
    });
  }
  const db = database();
  const [rows] = await db.execute<PublishedSermon[]>(
    { sql: sermonQuery, timeout: 4000 },
    [slug],
  );
  const sermon = rows[0];
  if (!sermon) return null;

  const [scripture] = await db.execute<Scripture[]>(
    {
      sql: scriptureQuery,
      timeout: 4000,
    },
    [sermon.id],
  );
  return { sermon, scripture };
}

export function sermonDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" })
    .format(new Date(`${isoDate}T00:00:00Z`));
}
