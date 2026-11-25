import { isMap, isScalar, isSeq, parseDocument } from "yaml";

export class FormError extends Error {}

export const sampleMarkdown = `---
version: 1
title: "A Life Transformed by Grace"
slug: a-life-transformed-by-grace
youtube_url: "https://www.youtube.com/watch?v=REPLACE_ME"
date: "2026-11-22"
summary: |
  Replace this with the reviewed sermon summary.
speaker: "Speaker name"
series: "Series name"
scripture:
  - "Ephesians 2:8–10"
  - "Romans 12:1–2"
topics:
  - "Grace"
---
`;

export async function readBody(request, limit, message) {
  if (Number(request.headers["content-length"]) > limit) throw new FormError(message);
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    bytes += chunk.length;
    if (bytes > limit) {
      request.resume();
      throw new FormError(message);
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, bytes);
}

export function slugify(value) {
  return value.normalize("NFKD").toLowerCase().replace(/\p{Mark}/gu, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const textFields = new Map([
  ["title", "title"], ["slug", "slug"], ["youtube_url", "video"],
  ["date", "date"], ["summary", "summary"], ["speaker", "speaker"], ["series", "series"],
]);
const listFields = new Set(["scripture", "topics"]);
const maxMarkdownBytes = 128 * 1024;

function parseFrontMatter(source) {
  const lines = source.split(/\r\n|\n|\r/);
  const closing = lines.findIndex((line, index) => index > 0 && /^---[\t ]*$/.test(line));
  if (!/^---[\t ]*$/.test(lines[0]) || closing < 2) {
    throw new FormError("Start the Markdown file with YAML fields between two lines containing ---. Use the sample file as a template.");
  }
  const yaml = lines.slice(1, closing).join("\n");
  if (yaml.length > 16_000) throw new FormError("The YAML fields are too large.");
  let document;
  try {
    document = parseDocument(yaml, { version: "1.2", stringKeys: true, strict: true });
  } catch {
    throw new FormError("The YAML fields could not be read. Use the sample file as a template.");
  }
  if (document.errors.length || document.warnings.length || !isMap(document.contents)) {
    throw new FormError("The YAML fields could not be read. Check the formatting and remove duplicate fields.");
  }

  const values = {};
  let version;
  for (const { key, value } of document.contents.items) {
    const name = key.value;
    if (typeof name !== "string") throw new FormError("Use named fields in the Markdown file.");
    if (name === "version") {
      version = isScalar(value) ? value.value : undefined;
    } else if (textFields.has(name)) {
      if (value === null || (isScalar(value) && value.value === null)) {
        values[textFields.get(name)] = "";
      } else {
        if (!isScalar(value) || typeof value.value !== "string") throw new FormError(`Use text for the ${name} field.`);
        values[textFields.get(name)] = value.value.trim();
      }
    } else if (listFields.has(name)) {
      if (value === null || (isScalar(value) && (value.value === null || value.value === ""))) {
        values[name] = "";
        continue;
      }
      if (!isSeq(value) || value.items.some(item => !isScalar(item) || typeof item.value !== "string" || /[\r\n]/.test(item.value))) {
        throw new FormError(`Use a list with one text value per line for ${name}.`);
      }
      values[name] = value.items.map(item => item.value.trim()).filter(Boolean).join("\n");
    } else {
      throw new FormError(`The Markdown field "${name.slice(0, 80)}" is not supported. Use the fields in the sample file.`);
    }
  }
  if (version !== 1) throw new FormError("Include version: 1 in the Markdown fields.");
  return { values, hasBody: lines.slice(closing + 1).some(line => line.trim()) };
}

export async function readSermonMarkdown(request) {
  const contentType = request.headers["content-type"] ?? "";
  if (!/^multipart\/form-data\s*;/i.test(contentType)) throw new FormError("Choose a Markdown (.md) file to upload.");
  const body = await readBody(request, maxMarkdownBytes + 8192, "The upload is too large. Choose a Markdown file up to 128 KB.");
  let parts;
  try {
    parts = await new Response(body, { headers: { "Content-Type": contentType } }).formData();
  } catch {
    throw new FormError("The file upload could not be read. Choose the Markdown file again.");
  }
  const [file] = parts.getAll("markdown");
  if (!(file instanceof File) || [...parts].length !== 1 || !/\.md$/i.test(file.name) || !file.size) {
    throw new FormError("Choose one nonempty Markdown (.md) file.");
  }
  if (file.size > maxMarkdownBytes) throw new FormError("The Markdown file must be 128 KB or smaller.");
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
  } catch {
    throw new FormError("Save the Markdown file as UTF-8 and try again.");
  }
  return parseFrontMatter(source);
}
