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
  const changes = {
    async beginTransaction() {}, async commit() {}, async rollback() {}, release() {},
    async execute(sql, values) {
      if (sql.startsWith("SELECT")) return [[sermon]];
      if (sql.startsWith("UPDATE")) sermon.state = sql.includes("'withdrawn'") ? "withdrawn" : "published";
      if (sql.startsWith("INSERT")) events.push(values);
      return [{ affectedRows: 1 }];
    },
  };
  const pool = {
    async getConnection() { return changes; },
    async execute(sql, values) {
      if (sql.startsWith("SELECT")) {
        if (!sermon) return [[]];
        return [sql.includes("WHERE slug") ? values[0] === sermon.slug ? [sermon] : [] : [sermon]];
      }
      writes.push(sql);
      if (sql.startsWith("INSERT")) {
        const [slug, title, youtube_video_id, summary, preached_on] = values;
        sermon = { id: 12, slug, title, youtube_video_id, summary, preached_on, state: "draft" };
        return [{ affectedRows: 1 }];
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
  async function request(url, { method = "GET", fields, authorized = true, requestOrigin = origin } = {}) {
    const req = Readable.from(fields ? [Buffer.from(new URLSearchParams(fields).toString())] : []);
    Object.assign(req, { method, url, headers: { authorization: authorized ? authorization : undefined,
      origin: requestOrigin, "content-type": "application/x-www-form-urlencoded" } });
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
