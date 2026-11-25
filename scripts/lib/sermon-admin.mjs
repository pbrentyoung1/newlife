import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { catalogKey, draftMetadata, metadataFields, readDraftMetadata, writeDraftMetadata } from "./sermon-draft-metadata.mjs";
import { FormError, readBody, readSermonMarkdown, sampleMarkdown, slugify } from "./sermon-markdown.mjs";
import { changePublication } from "./sermon-publication.mjs";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const videoPattern = /^[A-Za-z0-9_-]{11}$/;
const states = {
  draft: "Draft", in_review: "In review", approved: "Approved",
  published: "Published or scheduled", withdrawn: "Withdrawn",
};
const pageSize = 30;
const columns = "id, slug, youtube_video_id, title, summary, preached_on, state, reviewed_by, reviewed_at, published_at";
const library = "https://legendary-white-clam-37.hostingersite.com/watch/sermons/";

const escape = value => String(value ?? "").replace(/[&<>"']/g, char =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const digest = value => createHash("sha256").update(value).digest();
const detail = slug => `/sermons/${encodeURIComponent(slug)}`;
const importFields = {
  title: "Title", slug: "URL slug", video: "YouTube video", date: "Sermon date", summary: "Summary",
  speaker: "Speaker", series: "Series", scripture: "Scripture", topics: "Topics",
};
const draftColumns = { title: "title", slug: "slug", video: "youtube_video_id", date: "preached_on", summary: "summary" };
class ImportConflict extends FormError {}

export function youtubeId(value) {
  if (videoPattern.test(value)) return value;
  let url;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  if (url.hostname === "youtu.be") return videoPattern.test(url.pathname.slice(1)) ? url.pathname.slice(1) : null;
  if (!["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)) return null;
  const id = url.pathname === "/watch" ? url.searchParams.get("v") : url.pathname.match(/^\/live\/([^/]+)$/)?.[1];
  return id && videoPattern.test(id) ? id : null;
}

function draftValues(form, existingSlug, included = null) {
  const title = (form.get("title") ?? "").trim();
  const slug = existingSlug ?? (form.get("slug") ?? "").trim().toLowerCase();
  const video = youtubeId((form.get("video") ?? "").trim());
  const summary = (form.get("summary") ?? "").trim();
  const date = (form.get("date") ?? "").trim();
  const check = field => !included || Object.hasOwn(included, field);
  if (check("title") && (!title || title.length > 240)) throw new FormError("Enter a title of up to 240 characters.");
  if (check("slug") && (slug.length > 180 || !slugPattern.test(slug))) throw new FormError("Enter a URL slug with lowercase letters, numbers, and hyphens.");
  if (check("video") && !video) throw new FormError("Enter an official YouTube watch link or its 11-character video ID.");
  if (check("summary") && (!summary || summary.length > 4000)) throw new FormError("Enter a summary of up to 4,000 characters.");
  if (check("date") && date) {
    const parsed = new Date(`${date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < "1900-01-01" || !Number.isFinite(parsed.getTime())
      || parsed.toISOString().slice(0, 10) !== date) throw new FormError("Enter a valid sermon date.");
  }
  return { title, slug, video, summary, date: date || null };
}

async function readForm(request) {
  if (request.headers["content-type"]?.split(";")[0] !== "application/x-www-form-urlencoded") {
    throw new FormError("Submit the form from the staging admin page.");
  }
  const body = await readBody(request, 128 * 1024, "The form is too large.");
  return new URLSearchParams(body.toString("utf8"));
}

async function writeDraft(database, { title, slug, video, summary, date }, editing) {
  if (!editing) {
    const [result] = await database.execute("INSERT INTO sermons (slug, title, youtube_video_id, summary, preached_on) VALUES (?, ?, ?, ?, ?)",
      [slug, title, video, summary, date]);
    return result;
  }
  const [result] = await database.execute("UPDATE sermons SET title=?, youtube_video_id=?, summary=?, preached_on=?, state='draft', reviewed_by=NULL, reviewed_at=NULL WHERE slug=? AND state IN ('draft','in_review')",
    [title, video, summary, date, slug]);
  return result;
}

async function saveDraft(pool, draft, metadata, record) {
  const changingMetadata = metadata && (record || metadata.speaker || metadata.series || metadata.citations.length || metadata.topics.length);
  if (!changingMetadata) return writeDraft(pool, draft, Boolean(record));
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await writeDraft(connection, draft, Boolean(record));
    if (result.affectedRows) await writeDraftMetadata(connection, record?.id ?? result.insertId, metadata);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

const styles = `*{box-sizing:border-box}body{margin:0;background:#f4f5f1;color:#243328;font:16px/1.5 system-ui,sans-serif}
main{max-width:780px;margin:auto;padding:1.5rem}h1,h2{line-height:1.2}a{color:#235f49}
section,article{background:#fff;border:1px solid #d6dfd5;border-radius:.6rem;padding:1.25rem;margin:1rem 0}
label{display:block;font-weight:650;margin-top:.85rem}input:not([type=checkbox]),textarea{display:block;width:100%;font:inherit;padding:.45rem;border:1px solid #78877b;border-radius:.25rem}
textarea{min-height:8rem}button{font:inherit;font-weight:650;padding:.4rem .8rem;margin-top:.8rem;background:#285b47;color:white;border:1px solid #285b47;border-radius:.3rem;cursor:pointer}
details{margin-top:1rem}summary{cursor:pointer;font-weight:650}details textarea{min-height:4rem}.thumbnail{width:12rem;max-width:100%;height:auto;border-radius:.3rem}
.import-table{overflow-x:auto}table{width:100%;min-width:30rem;border-collapse:collapse;table-layout:fixed}td,th{text-align:left;vertical-align:top;padding:.5rem;border-bottom:1px solid #d6dfd5;white-space:pre-wrap;overflow-wrap:anywhere}th:first-child{width:25%}.import-change{background:#e7eee6}.import-change strong{display:block}
.tag{background:#e7eee6;padding:.12rem .5rem;border-radius:.4rem}li{margin:.55rem 0}.note{color:#405044}form.inline{display:inline-block;margin-right:.5rem}.notice{border-left:.25rem solid #285b47;padding-left:.7rem}`;

function html(title, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>${escape(title)} | New Life staging</title><style>${styles}</style></head>
<body><main><header><p><a href="/">New Life · Staging sermon admin</a></p><h1>${escape(title)}</h1></header>${body}</main></body></html>`;
}

function draftForm(record, values = record ?? {}) {
  const action = record ? `${detail(record.slug)}/edit` : "/sermons";
  return `<form method="post" action="${action}">
<label>Title<input name="title" maxlength="240" required value="${escape(values.title)}"></label>
${record ? "" : `<label>Permanent URL slug<input name="slug" maxlength="180" pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="a-life-transformed-by-grace" required value="${escape(values.slug)}"></label>`}
<label>YouTube video URL or ID<input name="video" maxlength="2048" required value="${escape(values.video ?? values.youtube_video_id)}"></label>
<label>Sermon date (optional)<input type="date" name="date" value="${escape(values.date ?? values.preached_on)}"></label>
<label>Summary<textarea name="summary" maxlength="4000" required>${escape(values.summary)}</textarea></label>
<details${metadataFields.some(field => values[field]) ? " open" : ""}><summary>Speaker, series, Scripture, and topics</summary>
<label>Speaker<input name="speaker" maxlength="200" value="${escape(values.speaker)}"></label>
<label>Series<input name="series" maxlength="200" value="${escape(values.series)}"></label>
<label>Scripture references<textarea name="scripture" aria-describedby="scripture-help">${escape(values.scripture)}</textarea></label>
<p id="scripture-help" class="note">Use full book names, one reference per line. Put the main passage first.</p>
<label>Topics (one per line)<textarea name="topics">${escape(values.topics)}</textarea></label>
<p class="note">Saving reuses matching names and adds new names to the staging catalog.</p>
</details>
<button>${record ? "Save changes" : "Save draft"}</button></form>`;
}

function postedFormValues(form) {
  return Object.fromEntries(["title", "slug", "video", "date", "summary", ...metadataFields].map(key => [key, form.get(key)]));
}

function uploadForm() {
  return `<section><h2>Upload sermon Markdown</h2>
<form method="post" action="/sermons/import" enctype="multipart/form-data">
<label>Markdown file<input type="file" name="markdown" accept=".md,text/markdown" required></label>
<button>Review uploaded details</button></form>
<p><a href="/sermon-import-example.md" download>Download a sample Markdown file</a></p></section>`;
}

function importPreview(values, hasBody, warnings) {
  const id = youtubeId(values.video ?? "");
  return html("Review imported sermon", `<section>
<p role="status">Review the imported fields, then select Save draft.</p>
${hasBody ? "<p>The Markdown body was skipped. Keep posting transcripts manually.</p>" : ""}
${warnings.length ? `<ul role="alert">${warnings.map(warning => `<li>${escape(warning)}</li>`).join("")}</ul>` : ""}
${id ? `<p><img class="thumbnail" src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="YouTube thumbnail preview" referrerpolicy="no-referrer"></p>` : ""}
${draftForm(null, values)}</section>${uploadForm()}`);
}

function recordValues(record) {
  return {
    title: record.title, slug: record.slug, video: record.youtube_video_id,
    date: record.preached_on ?? "", summary: record.summary,
    ...Object.fromEntries(metadataFields.map(field => [field, record[field] ?? ""])),
  };
}

function importFingerprint(record) {
  const { id, state, reviewed_by, reviewed_at, published_at } = record;
  return digest(JSON.stringify([id, state, reviewed_by, reviewed_at, published_at, recordValues(record)])).toString("hex");
}

function comparisonValue(field, value) {
  if (field === "speaker" || field === "series") return value ? catalogKey(value) : "";
  if (field === "topics") return [...new Set(value.split("\n").filter(Boolean).map(catalogKey))].sort().join("\n");
  return value;
}

function changedImport(existing, values) {
  return Object.fromEntries(Object.entries(values).filter(([field, value]) =>
    comparisonValue(field, existing[field]) !== comparisonValue(field, value)));
}

function importWarnings(values, included = null) {
  const fields = new URLSearchParams(values);
  const messages = [];
  for (const validate of [
    () => draftValues(fields, undefined, included),
    () => draftMetadata(included ? new URLSearchParams(included) : fields, Boolean(included)),
  ]) {
    try {
      validate();
    } catch (error) {
      if (!(error instanceof FormError)) throw error;
      messages.push(error.message);
    }
  }
  return messages;
}

function updatePreview(record, values, changes, hasBody, warnings, token) {
  const existing = recordValues(record);
  const text = (field, value) => field === "video" && videoPattern.test(value)
    ? `<a href="https://www.youtube.com/watch?v=${value}" rel="noreferrer">${value}</a>` : escape(value) || "Empty";
  const rows = Object.entries(importFields).map(([field, label]) => {
    const supplied = Object.hasOwn(values, field);
    const changed = Object.hasOwn(changes, field);
    return `<tr${changed ? ' class="import-change"' : ""}><th scope="row">${label}${changed ? "<strong>Will change</strong>" : ""}</th>
<td>${text(field, existing[field])}</td><td>${supplied ? text(field, values[field]) : "<em>Not supplied</em>"}</td></tr>`;
  });
  const action = token ? `<form method="post" action="/sermons/import/update">
<input type="hidden" name="preview" value="${escape(token)}">
<label><input type="checkbox" name="confirmed" value="yes" required> I reviewed these changes and want to update this sermon.</label>
<button>Update sermon</button></form>` : "";
  return html("Review changes to existing sermon", `<section>
<p>Matched <a href="${detail(record.slug)}">${escape(record.title)}</a>. Fields omitted from the file stay as they are.</p>
${record.state === "published" ? "<p>This sermon is published. Confirmed changes will reach public staging on the next snapshot refresh.</p>" : ""}
${Object.hasOwn(changes, "slug") ? "<p>Changing the slug changes the sermon’s public URL.</p>" : ""}
${hasBody ? "<p>The Markdown body was skipped. Keep posting transcripts manually.</p>" : ""}
${warnings.length ? `<ul role="alert">${warnings.map(warning => `<li>${escape(warning)}</li>`).join("")}</ul>` : ""}
<div class="import-table" role="region" aria-label="Imported sermon field comparison" tabindex="0"><table><thead><tr><th scope="col">Field</th><th scope="col">Existing value</th><th scope="col">Imported value</th></tr></thead>
<tbody>${rows.join("")}</tbody></table></div>
${!Object.keys(changes).length ? "<p>No changes to save.</p>" : ""}${action}</section>${uploadForm()}`);
}

function previewToken(key, record, changes) {
  const payload = Buffer.from(JSON.stringify({
    id: record.id, baseline: importFingerprint(record), changes, expires: Date.now() + 30 * 60_000,
  })).toString("base64url");
  const signature = createHmac("sha256", key).update("sermon-update:").update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function readPreviewToken(key, token) {
  const invalid = () => new FormError("This import preview is invalid or expired. Upload the Markdown file again.");
  if (!token || token.length > 110 * 1024) throw invalid();
  const match = /^([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!match) throw invalid();
  const [, payload, signature] = match;
  const expected = createHmac("sha256", key).update("sermon-update:").update(payload).digest();
  if (!timingSafeEqual(expected, Buffer.from(signature, "base64url"))) throw invalid();
  const preview = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  if (preview.expires < Date.now()) throw invalid();
  return preview;
}

function actionForm(slug, action, label, content = "") {
  return `<form method="post" class="inline" action="${detail(slug)}/${action}">${content}<button>${label}</button></form>`;
}

function sermonPage(record, notice, values) {
  const { slug, state } = record;
  const next = {
    draft: () => actionForm(slug, "review", "Start review"),
    in_review: () => actionForm(slug, "approve", "Approve sermon",
      '<label><input type="checkbox" name="confirmed" value="yes" required> I checked the title, summary, and YouTube recording.</label>'),
    approved: () => actionForm(slug, "publish", "Publish to staging") + actionForm(slug, "return", "Return to draft"),
    published: () => actionForm(slug, "withdraw", "Withdraw from staging",
      '<label><input type="checkbox" name="confirmed" value="yes" required> I want to remove this sermon from the library.</label>'),
    withdrawn: () => actionForm(slug, "review", "Review for republication"),
  }[state];
  return html(record.title, `<article><p class="tag">${escape(states[state])}</p>
<p>${escape(record.summary)}</p>
<p><a href="https://www.youtube.com/watch?v=${encodeURIComponent(record.youtube_video_id)}">Check the YouTube recording</a></p>
<p>Slug: <code>${escape(slug)}</code></p>
${record.preached_on ? `<p>Sermon date: ${escape(record.preached_on)}</p>` : ""}
${record.speaker ? `<p>Speaker: ${escape(record.speaker)}</p>` : ""}
${record.series ? `<p>Series: ${escape(record.series)}</p>` : ""}
${record.scripture ? `<p>Scripture: ${escape(record.scripture.split("\n").join(", "))}</p>` : ""}
${record.topics ? `<p>Topics: ${escape(record.topics.split("\n").join(", "))}</p>` : ""}
${record.reviewed_by ? `<p>Reviewed by ${escape(record.reviewed_by)} · ${escape(record.reviewed_at)} UTC</p>` : ""}
${notice ? `<p class="notice" role="status">${escape(notice)}</p>` : ""}
${next?.() ?? ""}<p class="note">The public library changes after the next successful snapshot refresh.</p>
<p><a href="${library}${encodeURIComponent(slug)}/">View the public staging page</a></p></article>
${state === "draft" || state === "in_review" ? `<section><h2>Edit draft</h2>${draftForm(record, values)}</section>` : ""}`);
}

const messages = {
  created: "Draft saved.", edited: "Changes saved. Start review again if it was in progress.", review: "Ready for review.",
  imported: "Existing sermon updated.",
  approve: "Approved and ready to publish.", return: "Returned to draft.",
  publish: "Published in the editorial database. Check the staging library after its next snapshot refresh.",
  withdraw: "Withdrawn in the editorial database. Check the staging library after its next snapshot refresh.",
};

export function createSermonAdmin({ pool, origin, username, password, actor }) {
  const expected = digest(`${username}:${password}`);
  async function find(slug) {
    const [[row]] = await pool.execute(`SELECT ${columns} FROM sermons WHERE slug = ?`, [slug]);
    return row;
  }
  async function matchesFor(database, slug, video, excludeId = 0) {
    const safeSlug = slug?.length <= 180 && slugPattern.test(slug) ? slug : "";
    const safeVideo = youtubeId(video ?? "") ?? "";
    if (!safeSlug && !safeVideo) return [];
    const [matches] = await database.execute(
      `SELECT ${columns} FROM sermons WHERE id <> ? AND (slug=? OR youtube_video_id=?) LIMIT 2`,
      [excludeId, safeSlug, safeVideo]);
    return matches;
  }

  async function reviewImport(request) {
    const { values, hasBody } = await readSermonMarkdown(request);
    if (Object.hasOwn(values, "slug")) values.slug = values.slug.toLowerCase();
    const normalized = { ...values };
    if (Object.hasOwn(values, "video")) normalized.video = youtubeId(values.video) ?? values.video;
    const matches = await matchesFor(pool, normalized.slug, normalized.video);
    if (matches.length > 1) {
      const byVideo = matches.find(record => record.youtube_video_id === normalized.video);
      throw new ImportConflict(`The slug "${normalized.slug}" matches one sermon, but the YouTube video matches "${byVideo.slug}". Check the file and upload it again. No sermon was changed.`);
    }

    if (matches.length === 1) {
      const [row] = matches;
      const record = { ...row, ...await readDraftMetadata(pool, row.id) };
      const existing = recordValues(record);
      const changes = changedImport(existing, normalized);
      const warnings = importWarnings({ ...existing, ...normalized }, normalized);
      const token = !warnings.length && Object.keys(changes).length ? previewToken(expected, record, changes) : null;
      return updatePreview(record, normalized, changes, hasBody, warnings, token);
    }

    if (!values.slug && values.title) values.slug = slugify(values.title).slice(0, 180).replace(/-$/, "");
    const warnings = importWarnings(values);
    if (values.slug && !normalized.slug && (await matchesFor(pool, values.slug)).length) {
      warnings.push("The suggested slug is already in use. To update that sermon, include its exact slug or YouTube URL in the Markdown file.");
    }
    return importPreview(values, hasBody, warnings);
  }

  async function confirmImport(fields) {
    if (fields.get("confirmed") !== "yes") throw new FormError("Confirm the preview before updating this sermon.");
    const { id, baseline, changes } = readPreviewToken(expected, fields.get("preview"));
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [[row]] = await connection.execute(`SELECT ${columns} FROM sermons WHERE id=? FOR UPDATE`, [id]);
      if (!row) throw new ImportConflict("This sermon is no longer available. Upload the Markdown file again.");
      const record = { ...row, ...await readDraftMetadata(connection, id) };
      if (importFingerprint(record) !== baseline) {
        throw new ImportConflict("This sermon changed after the preview opened. Upload the Markdown file again to review the latest values.");
      }
      const fields = new URLSearchParams({ ...recordValues(record), ...changes });
      const draft = draftValues(fields, undefined, changes);
      const metadata = draftMetadata(new URLSearchParams(changes), true);
      if ((await matchesFor(connection, draft.slug, draft.video, id)).length) {
        throw new ImportConflict("Another sermon now uses this URL slug or YouTube video. Upload the Markdown file again to check the conflict.");
      }
      const columnsToUpdate = Object.entries(draftColumns).filter(([field]) => Object.hasOwn(changes, field));
      if (columnsToUpdate.length) {
        const assignments = columnsToUpdate.map(([, column]) => `${column}=?`).join(", ");
        await connection.execute(`UPDATE sermons SET ${assignments} WHERE id=?`,
          [...columnsToUpdate.map(([field]) => draft[field]), id]);
      }
      if (metadata) await writeDraftMetadata(connection, id, metadata);
      await connection.commit();
      return draft.slug;
    } catch (error) {
      await connection.rollback();
      if (error?.code === "ER_DUP_ENTRY") {
        throw new ImportConflict("Another sermon now uses this URL slug or YouTube video. Upload the Markdown file again to check the conflict.");
      }
      throw error;
    } finally {
      connection.release();
    }
  }
  return async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    res.setHeader("X-Content-Type-Options", "nosniff");
    // Native form POSTs need an Origin header for the same-origin check below.
    res.setHeader("Referrer-Policy", "same-origin");
    res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; img-src https://i.ytimg.com; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    const send = (code, body) => res.writeHead(code).end(body);
    const redirect = (slug, message) => res.writeHead(303, { Location: `${detail(slug)}?notice=${message}` }).end();
    const errorPage = (code, message) => send(code, html(message, '<p><a href="/">Return to the staging admin</a></p>'));
    const basic = req.headers.authorization?.match(/^Basic ([A-Za-z0-9+/=]{1,2048})$/i);
    if (!basic || !timingSafeEqual(digest(Buffer.from(basic[1], "base64")), expected)) {
      res.setHeader("WWW-Authenticate", 'Basic realm="New Life staging admin", charset="UTF-8"');
      return errorPage(401, "Staging admin sign-in required");
    }
    if (req.method === "POST" && req.headers.origin !== origin) return errorPage(403, "This form must come from the staging admin");
    let form;
    let record;
    try {
      const url = new URL(req.url, origin);
      if (req.method === "GET" && url.pathname === "/sermon-import-example.md") {
        res.setHeader("Content-Type", "text/markdown; charset=utf-8");
        res.setHeader("Content-Disposition", 'attachment; filename="sermon-import-example.md"');
        return send(200, sampleMarkdown);
      }
      if (req.method === "POST" && url.pathname === "/sermons/import") {
        return send(200, await reviewImport(req));
      }
      if (req.method === "POST" && url.pathname === "/sermons/import/update") {
        return redirect(await confirmImport(await readForm(req)), "imported");
      }
      if (req.method === "GET" && url.pathname === "/") {
        const page = Number(url.searchParams.get("page") ?? "1");
        if (!Number.isSafeInteger(page) || page < 1 || page > 10_000) return errorPage(404, "Sermon list page not found");
        const [rows] = await pool.execute("SELECT slug, title, state FROM sermons ORDER BY id DESC LIMIT ? OFFSET ?",
          [pageSize + 1, (page - 1) * pageSize]);
        return send(200, html("Sermon editor", `${uploadForm()}<section><h2>Add a sermon manually</h2>${draftForm()}</section>
<section><h2>Sermons</h2>${rows.length ? `<ul>${rows.slice(0, pageSize).map(row => `<li><a href="${detail(row.slug)}">${escape(row.title)}</a> · ${escape(states[row.state])}</li>`).join("")}</ul>` : "<p>No sermons on this page.</p>"}
${page > 1 ? `<p><a href="/?page=${page - 1}">Newer entries</a></p>` : ""}${rows.length > pageSize ? `<p><a href="/?page=${page + 1}">Older entries</a></p>` : ""}</section>`));
      }
      const match = url.pathname.match(/^\/sermons\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/(edit|review|approve|return|publish|withdraw))?$/);
      if (req.method === "GET" && match && !match[2]) {
        const row = await find(match[1]);
        const notice = url.searchParams.get("notice");
        return row ? send(200, sermonPage({ ...row, ...await readDraftMetadata(pool, row.id) }, Object.hasOwn(messages, notice) ? messages[notice] : undefined))
          : errorPage(404, "Sermon not found");
      }
      if (req.method !== "POST" || (url.pathname !== "/sermons" && !match?.[2])) return errorPage(404, "Page not found");
      form = await readForm(req);
      if (url.pathname === "/sermons") {
        const draft = draftValues(form);
        await saveDraft(pool, draft, draftMetadata(form));
        return redirect(draft.slug, "created");
      }
      const [, slug, action] = match;
      record = await find(slug);
      if (!record) return errorPage(404, "Sermon not found");
      if ((action === "approve" || action === "withdraw") && form.get("confirmed") !== "yes") {
        throw new FormError("Confirm the review or withdrawal before continuing.");
      }
      if (action === "publish" || action === "withdraw") {
        const connection = await pool.getConnection();
        try {
          const result = await changePublication(connection, action, slug, actor);
          if (result.outcome === "invalid" || result.outcome === "missing") return errorPage(409, "The sermon state changed. Reload and try again");
        } finally {
          connection.release();
        }
      } else {
        let result;
        if (action === "edit") {
          const d = draftValues(form, slug);
          result = await saveDraft(pool, d, draftMetadata(form), record);
        } else if (action === "review") {
          [result] = await pool.execute("UPDATE sermons SET state='in_review', reviewed_by=NULL, reviewed_at=NULL WHERE slug=? AND state IN ('draft','withdrawn')", [slug]);
        } else if (action === "approve") {
          [result] = await pool.execute("UPDATE sermons SET state='approved', reviewed_by=?, reviewed_at=UTC_TIMESTAMP() WHERE slug=? AND state='in_review'", [actor, slug]);
        } else {
          [result] = await pool.execute("UPDATE sermons SET state='draft', reviewed_by=NULL, reviewed_at=NULL WHERE slug=? AND state='approved'", [slug]);
        }
        if (!result.affectedRows) return errorPage(409, "The sermon state changed. Reload and try again");
      }
      return redirect(slug, action === "edit" ? "edited" : action);
    } catch (error) {
      if (error instanceof ImportConflict) {
        return send(409, html("Sermon import conflict", `<p role="alert">${escape(error.message)}</p>${uploadForm()}`));
      }
      if (error instanceof FormError || error?.code === "ER_DUP_ENTRY") {
        const message = error instanceof FormError ? error.message : "That URL slug or YouTube video is already in the library.";
        return send(422, record ? sermonPage(record, message, form && postedFormValues(form))
          : html("Check the sermon details", `<p role="alert">${escape(message)}</p><section>${draftForm(null, form && postedFormValues(form))}</section>${uploadForm()}`));
      }
      console.error("Staging sermon admin request failed.");
      return errorPage(503, "The staging editor is temporarily unavailable");
    }
  };
}
