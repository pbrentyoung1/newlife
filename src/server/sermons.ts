import { createPool, type Pool, type RowDataPacket } from "mysql2/promise";

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

export async function listPublishedSermons(page: number) {
  const [rows] = await database().execute<PublishedSermon[]>(
    {
      sql: `SELECT ${columns} FROM public_sermons
            ORDER BY preached_on DESC, id DESC LIMIT ? OFFSET ?`,
      timeout: 4000,
    },
    [pageSize + 1, (page - 1) * pageSize],
  );
  return { sermons: rows.slice(0, pageSize), hasNext: rows.length > pageSize };
}

export async function getPublishedSermon(slug: string) {
  if (slug.length > 180 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  const db = database();
  const [rows] = await db.execute<PublishedSermon[]>(
    { sql: `SELECT ${columns} FROM public_sermons WHERE slug = ?`, timeout: 4000 },
    [slug],
  );
  const sermon = rows[0];
  if (!sermon) return null;

  const [scripture] = await db.execute<Scripture[]>(
    {
      sql: "SELECT citation FROM public_sermon_scripture WHERE sermon_id = ? ORDER BY sort_order",
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
