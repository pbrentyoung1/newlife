import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { replaceSnapshot } from "../scripts/lib/sermon-snapshot.mjs";

const sermon = {
  id: 10,
  slug: "staging-test",
  youtube_video_id: "stageDraft1",
  title: "Staging test",
  summary: "Synthetic staging test.",
  preached_on: null,
  speaker_name: null,
  series_title: null,
};

test("published files are readable, reject writes, and are replaced atomically", async context => {
  const dir = await mkdtemp(join(tmpdir(), "newlife-snapshot-test-"));
  context.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, "snapshot.sqlite");
  const citation = { sermon_id: 10, sort_order: 1, citation: "John 3:16" };
  replaceSnapshot(path, [sermon], [citation], 1234);
  const initial = new DatabaseSync(path, { readOnly: true });
  try {
    assert.equal(initial.prepare("SELECT created_at_ms FROM snapshot_metadata").get().created_at_ms, 1234);
    assert.equal(initial.prepare("SELECT slug FROM public_sermons").get().slug, sermon.slug);
    assert.equal(initial.prepare("SELECT citation FROM public_sermon_scripture").get().citation, citation.citation);
    assert.throws(() => initial.exec("DELETE FROM public_sermons"), /readonly/i);
    assert.throws(() => replaceSnapshot(path, [], [citation]), /FOREIGN KEY/);
    replaceSnapshot(path, [], [], 2234);
    const withdrawn = new DatabaseSync(path, { readOnly: true });
    try {
      assert.equal(withdrawn.prepare("SELECT COUNT(*) AS n FROM public_sermons").get().n, 0);
      assert.equal(withdrawn.prepare("SELECT created_at_ms FROM snapshot_metadata").get().created_at_ms, 2234);
      assert.equal(initial.prepare("SELECT COUNT(*) AS n FROM public_sermons").get().n, 1);
    } finally {
      withdrawn.close();
    }
  } finally {
    initial.close();
  }
});
