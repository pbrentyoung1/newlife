import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { test } from "node:test";
import { createSermonAdmin, youtubeId } from "../scripts/lib/sermon-admin.mjs";

const origin = "https://newlife-editor.hostingersite.com";
const authorization = `Basic ${Buffer.from("editor:local-test-only").toString("base64")}`;

function fixture() {
  let sermon;
  const events = [];
  const writes = [];
  const names = {};
  const scripture = [];
  const topics = [];
  const changes = {
    async beginTransaction() {}, async commit() {}, async rollback() {}, release() {},
    async execute(sql, values) {
      if (sql.startsWith("SELECT") && sql.includes("FOR UPDATE")) return [[sermon]];
      if (sql.startsWith("UPDATE") && (sql.includes("'published'") || sql.includes("'withdrawn'"))) {
        sermon.state = sql.includes("'withdrawn'") ? "withdrawn" : "published";
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith("INSERT INTO sermon_publication_events")) {
        events.push(values);
        return [{ affectedRows: 1 }];
      }
      return pool.execute(sql, values);
    },
  };
  const pool = {
    async getConnection() { return changes; },
    async execute(sql, values) {
      if (sql.startsWith("SELECT")) {
        if (sql.includes("AS speaker")) return [[names]];
        if (sql.includes("FROM sermon_scripture")) return [scripture];
        if (sql.includes("FROM sermon_topic_links")) return [topics];
        if (!sermon) return [[]];
        if (sql.includes("OR youtube_video_id")) {
          return [values[0] === sermon.slug || values[1] === sermon.youtube_video_id ? [sermon] : []];
        }
        return [sql.includes("WHERE slug") ? values[0] === sermon.slug ? [sermon] : [] : [sermon]];
      }
      writes.push(sql);
      if (sql.startsWith("INSERT INTO sermons ")) {
        const [slug, title, youtube_video_id, summary, preached_on] = values;
        sermon = { id: 12, slug, title, youtube_video_id, summary, preached_on, state: "draft" };
        return [{ affectedRows: 1, insertId: 12 }];
      }
      if (sql.startsWith("INSERT INTO sermon_speakers")) names.speaker = values[1];
      if (sql.startsWith("INSERT INTO sermon_series")) names.series = values[1];
      if (sql.startsWith("INSERT INTO sermon_scripture")) scripture.push({ citation: values[7] });
      if (sql.startsWith("INSERT INTO sermon_topics")) topics.push({ label: values[1] });
      if (sql.startsWith("DELETE FROM sermon_scripture")) scripture.length = 0;
      if (sql.startsWith("DELETE FROM sermon_topic_links")) topics.length = 0;
      if (/^(?:INSERT INTO sermon_|DELETE FROM sermon_|UPDATE sermons SET speaker_id)/.test(sql)) {
        return [{ affectedRows: 1, insertId: 30 + writes.length }];
      }
      if (sql.includes("SET title") && ["draft", "in_review"].includes(sermon.state)) {
        const [title, youtube_video_id, summary, preached_on] = values;
        Object.assign(sermon, { title, youtube_video_id, summary, preached_on, state: "draft" });
      } else if (sql.includes("SET state='in_review'") && ["draft", "withdrawn"].includes(sermon.state)) {
        sermon.state = "in_review";
      } else if (sql.includes("SET state='approved'") && sermon.state === "in_review") {
        sermon.state = "approved";
        sermon.reviewed_by = values[0];
      } else {
        return [{ affectedRows: 0 }];
      }
      return [{ affectedRows: 1 }];
    },
  };
  const handler = createSermonAdmin({ pool, origin, username: "editor", password: "local-test-only", actor: "Staging editor" });
  async function request(url, { method = "GET", fields, upload, authorized = true, requestOrigin = origin } = {}) {
    let body = fields ? Buffer.from(new URLSearchParams(fields).toString()) : null;
    let contentType = "application/x-www-form-urlencoded";
    if (upload) {
      const formData = new FormData();
      formData.set("markdown", new Blob([upload.text], { type: "text/markdown" }), upload.filename ?? "sermon.md");
      const encoded = new Response(formData);
      body = Buffer.from(await encoded.arrayBuffer());
      contentType = encoded.headers.get("content-type");
    }
    const req = Readable.from(body ? [body] : []);
    Object.assign(req, { method, url, headers: { authorization: authorized ? authorization : undefined,
      origin: requestOrigin, "content-type": contentType } });
    const result = { headers: {} };
    await handler(req, {
      setHeader(key, value) { result.headers[key] = value; },
      writeHead(status, prefs) {
        result.status = status;
        Object.assign(result.headers, prefs);
        return this;
      },
      end(body = "") { result.body = body; },
    });
    return result;
  }
  return { request, events, writes, state: () => sermon?.state };
}

const form = { title: "A <sermon>", slug: "a-sermon", video: "https://youtu.be/ZT8mUERsq5Q",
  date: "2026-11-15", summary: "Testing staging." };

test("authentication and same-origin checks run before any draft writes", async () => {
  const { request, writes } = fixture();
  const anonymous = await request("/", { authorized: false });
  assert.equal(anonymous.status, 401);
  assert.match(anonymous.headers["WWW-Authenticate"], /^Basic /);
  assert.equal(anonymous.headers["Cache-Control"], "no-store");
  const editor = await request("/");
  assert.equal(editor.headers["Referrer-Policy"], "same-origin");
  assert.equal((await request("/sermons", { method: "POST", fields: form, requestOrigin: "https://other.example" })).status, 403);
  assert.equal((await request("/sermons", { method: "POST", fields: form, requestOrigin: "null" })).status, 403);
  assert.equal((await request("/sermons/a-sermon/publish")).status, 404);
  assert.equal(writes.length, 0);
});

test("a browser can save, review, approve, publish, and withdraw with audit events", async () => {
  const { request, events, state } = fixture();
  const post = (path, fields = {}) => request(path, { method: "POST", fields });
  const draft = await post("/sermons", form);
  assert.equal(draft.status, 303);
  assert.equal(draft.headers.Location, "/sermons/a-sermon?notice=created");
  assert.match((await request(draft.headers.Location)).body, /A &lt;sermon&gt;/);
  assert.equal((await post("/sermons/a-sermon/publish")).status, 409);
  assert.equal((await post("/sermons/a-sermon/review")).status, 303);
  assert.equal((await post("/sermons/a-sermon/approve")).status, 422);
  assert.equal((await post("/sermons/a-sermon/edit", form)).status, 303);
  assert.equal(state(), "draft");
  assert.equal((await post("/sermons/a-sermon/approve", { confirmed: "yes" })).status, 409);
  assert.equal((await post("/sermons/a-sermon/review")).status, 303);
  assert.equal((await post("/sermons/a-sermon/approve", { confirmed: "yes" })).status, 303);
  assert.equal((await post("/sermons/a-sermon/publish")).status, 303);
  assert.equal(state(), "published");
  assert.equal((await post("/sermons/a-sermon/withdraw")).status, 422);
  assert.equal((await post("/sermons/a-sermon/withdraw", { confirmed: "yes" })).status, 303);
  assert.equal(state(), "withdrawn");
  assert.deepEqual(events, [[12, "publish", "Staging editor"], [12, "withdraw", "Staging editor"]]);
});

test("video IDs are accepted only as direct IDs or from official YouTube hosts", () => {
  assert.equal(youtubeId("ZT8mUERsq5Q"), "ZT8mUERsq5Q");
  assert.equal(youtubeId("https://www.youtube.com/watch?v=ZT8mUERsq5Q"), "ZT8mUERsq5Q");
  assert.equal(youtubeId("https://youtu.be.evil.example/ZT8mUERsq5Q"), null);
  assert.equal(youtubeId("https://www.youtube.com@evil.example/watch?v=ZT8mUERsq5Q"), null);
});

const markdown = `---
version: 1
title: "Grace & <hope>"
youtube_url: "https://youtu.be/stagemd0001"
date: 2026-11-22
summary: |
  Review this summary first.
speaker: "Example speaker"
series: "Example series"
scripture:
  - "John 3:16–18"
  - "Psalm 23"
topics:
  - "Grace"
---
Private transcript body that must be skipped.
`;

test("a Markdown file prefills an editable draft without writing, then Save draft persists reviewed fields", async () => {
  const { request, writes, state } = fixture();
  const example = await request("/sermon-import-example.md");
  assert.equal(example.status, 200);
  assert.match(example.headers["Content-Disposition"], /attachment/);
  assert.match(example.body, /^---\nversion: 1/);
  const preview = await request("/sermons/import", { method: "POST", upload: { text: markdown } });
  assert.equal(preview.status, 200);
  assert.match(preview.body, /name="title"[^>]*value="Grace &amp; &lt;hope&gt;"/);
  assert.match(preview.body, /name="slug"[^>]*value="grace-hope"/);
  assert.match(preview.body, /name="video"[^>]*value="https:\/\/youtu.be\/stagemd0001"/);
  assert.match(preview.body, /name="date" value="2026-11-22"/);
  assert.match(preview.body, /name="speaker"[^>]*value="Example speaker"/);
  assert.match(preview.body, /name="series"[^>]*value="Example series"/);
  assert.match(preview.body, /name="scripture"[^>]*>John 3:16–18\nPsalm 23/);
  assert.match(preview.body, /name="topics"[^>]*>Grace/);
  assert.match(preview.body, /i.ytimg.com\/vi\/stagemd0001\/hqdefault.jpg/);
  assert.match(preview.body, /Markdown body was skipped/);
  assert.doesNotMatch(preview.body, /Private transcript body/);
  assert.equal(writes.length, 0);
  assert.equal(state(), undefined);

  const saved = await request("/sermons", { method: "POST", fields: {
    title: "Reviewed title", slug: "grace-hope", video: "stagemd0001", date: "2026-11-22",
    summary: "Reviewed summary", speaker: "Example speaker", series: "Example series",
    scripture: "John 3:16–18\nPsalm 23", topics: "Grace",
  } });
  assert.equal(saved.status, 303);
  assert.equal(state(), "draft");
  const detail = await request(saved.headers.Location);
  assert.match(detail.body, /Reviewed title/);
  assert.match(detail.body, /Speaker: Example speaker/);
  assert.match(detail.body, /Series: Example series/);
  assert.match(detail.body, /Scripture: John 3:16–18, Psalm 23/);
  assert.match(detail.body, /Topics: Grace/);

  const duplicate = await request("/sermons/import", { method: "POST", upload: { text: markdown } });
  assert.match(duplicate.body, /already uses this URL slug or YouTube video/);
  assert.equal(state(), "draft");
});

test("Markdown import flags malformed uploads, unsupported fields, and missing values without writes", async () => {
  const { request, writes } = fixture();
  const post = (text, filename = "sample.md", extras = {}) =>
    request("/sermons/import", { method: "POST", upload: { text, filename }, ...extras });
  assert.equal((await post(markdown, "sample.txt")).status, 422);
  assert.equal((await post("ordinary Markdown")).status, 422);
  assert.equal((await post(markdown.replace("version: 1", "version: 2"))).status, 422);
  assert.equal((await post(markdown.replace("version: 1", "version: 1\ntranscript: source"))).status, 422);
  assert.equal((await post(markdown.replace("version: 1", "version: 1\ntitle: duplicate"))).status, 422);
  assert.equal((await post(markdown + "x".repeat(140 * 1024))).status, 422);
  assert.equal((await post(markdown, "sample.md", { requestOrigin: "https://other.example" })).status, 403);
  assert.equal((await post(markdown, "sample.md", { authorized: false })).status, 401);
  const incomplete = await post(markdown.replace(/^youtube_url:.*\n/m, ""));
  assert.equal(incomplete.status, 200);
  assert.match(incomplete.body, /Enter an official YouTube watch link/);
  assert.equal(writes.length, 0);
});
