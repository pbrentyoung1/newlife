import { chmodSync, closeSync, fsyncSync, mkdtempSync, openSync, renameSync, rmSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const schema = `
  PRAGMA user_version = 1;
  CREATE TABLE snapshot_metadata (created_at_ms INTEGER NOT NULL) STRICT;
  CREATE TABLE public_sermons (
    id INTEGER PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    youtube_video_id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    preached_on TEXT,
    speaker_name TEXT,
    series_title TEXT
  ) STRICT;
  CREATE INDEX publication_order ON public_sermons (preached_on DESC, id DESC);
  CREATE TABLE public_sermon_scripture (
    sermon_id INTEGER NOT NULL REFERENCES public_sermons(id),
    sort_order INTEGER NOT NULL,
    citation TEXT NOT NULL,
    PRIMARY KEY (sermon_id, sort_order)
  ) STRICT;
`;

export function replaceSnapshot(path, sermons, scripture, createdAt = Date.now()) {
  if (!isAbsolute(path)) throw new Error("The staging snapshot path must be absolute");
  const temporary = mkdtempSync(join(dirname(path), ".sermon-snapshot-"));
  const next = join(temporary, "snapshot.sqlite");
  try {
    const db = new DatabaseSync(next);
    try {
      db.exec("PRAGMA journal_mode = DELETE; PRAGMA synchronous = FULL; BEGIN");
      db.exec(schema);
      db.prepare("INSERT INTO snapshot_metadata VALUES (?)").run(createdAt);
      const insertSermon = db.prepare("INSERT INTO public_sermons VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
      const insertCitation = db.prepare("INSERT INTO public_sermon_scripture VALUES (?, ?, ?)");
      for (const row of sermons) {
        insertSermon.run(row.id, row.slug, row.youtube_video_id, row.title, row.summary,
          row.preached_on, row.speaker_name, row.series_title);
      }
      for (const row of scripture) insertCitation.run(row.sermon_id, row.sort_order, row.citation);
      db.exec("COMMIT");
    } finally {
      db.close();
    }
    chmodSync(next, 0o400);
    const descriptor = openSync(next, "r");
    try {
      fsyncSync(descriptor);
    } finally {
      closeSync(descriptor);
    }
    renameSync(next, path);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}
