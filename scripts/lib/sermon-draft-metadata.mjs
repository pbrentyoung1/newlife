import { createHash } from "node:crypto";
import { FormError, slugify } from "./sermon-markdown.mjs";

export const metadataFields = ["speaker", "series", "scripture", "topics"];
const books = new Map(`Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1 Samuel|2 Samuel|1 Kings|2 Kings|1 Chronicles|2 Chronicles|Ezra|Nehemiah|Esther|Job|Psalms|Proverbs|Ecclesiastes|Song of Solomon|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1 Corinthians|2 Corinthians|Galatians|Ephesians|Philippians|Colossians|1 Thessalonians|2 Thessalonians|1 Timothy|2 Timothy|Titus|Philemon|Hebrews|James|1 Peter|2 Peter|1 John|2 John|3 John|Jude|Revelation`
  .split("|").map(book => [book.toLowerCase(), slugify(book)]));
books.set("psalm", "psalms");
books.set("song of songs", "song-of-solomon");

function lines(value) {
  return value.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
}

function scriptureRange(citation) {
  const reference = /^(.*?)\s+(\d{1,3})(?::(\d{1,3}))?(?:\s*[-–—]\s*(?:(\d{1,3}):)?(\d{1,3}))?$/.exec(citation);
  if (!reference || citation.length > 160) {
    throw new FormError("Enter one Scripture reference per line with a full book name, such as John 3:16–18.");
  }
  const [, name, start, verse, rangeChapter, rangeEnd] = reference;
  const book = books.get(name.toLowerCase().replace(/\s+/g, " "));
  const chapterStart = Number(start);
  const verseStart = verse === undefined ? null : Number(verse);
  const chapterEnd = Number(rangeChapter ?? (verse === undefined ? rangeEnd : undefined) ?? start);
  const lastVerse = rangeChapter !== undefined || verse !== undefined ? rangeEnd ?? verse : undefined;
  const verseEnd = lastVerse === undefined ? null : Number(lastVerse);
  if (!book || chapterStart === 0 || chapterEnd < chapterStart || verseStart === 0 || verseEnd === 0
    || (chapterStart === chapterEnd && verseStart !== null && verseEnd !== null && verseStart > verseEnd)) {
    throw new FormError(`Check the Scripture reference "${citation}". Use the full book name and an ascending range.`);
  }
  return [book, chapterStart, verseStart, chapterEnd, verseEnd, citation];
}

export function draftMetadata(form, partial = false) {
  if (!metadataFields.some(field => form.has(field))) return null;
  const speaker = form.get("speaker")?.trim() ?? "";
  const series = form.get("series")?.trim() ?? "";
  const citations = lines(form.get("scripture") ?? "");
  const topics = lines(form.get("topics") ?? "");
  if ([speaker, series, ...topics].some(value => value.length > 200)) {
    throw new FormError("Speaker, series, and topic names must be 200 characters or fewer.");
  }
  if (citations.length > 20 || topics.length > 20) {
    throw new FormError("Enter up to 20 Scripture references and 20 topics.");
  }
  const metadata = { speaker, series, citations: citations.map(scriptureRange), topics };
  if (partial) for (const field of metadataFields) {
    if (!form.has(field)) delete metadata[field === "scripture" ? "citations" : field];
  }
  return metadata;
}

const catalogs = {
  speaker: "INSERT INTO sermon_speakers (slug, name) VALUES (?, ?)",
  series: "INSERT INTO sermon_series (slug, title) VALUES (?, ?)",
  topic: "INSERT INTO sermon_topics (slug, label) VALUES (?, ?)",
};

export function catalogKey(name) {
  const slug = slugify(name);
  const suffix = () => createHash("sha256").update(name.normalize("NFKC").toLowerCase()).digest("hex").slice(0, 16);
  return slug && slug.length <= 120 ? slug : `${slug.slice(0, 100).replace(/-$/, "") || "term"}-${suffix()}`;
}

async function catalogId(database, catalog, name) {
  if (!name) return null;
  const [result] = await database.execute(`${catalogs[catalog]} ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`, [catalogKey(name), name]);
  return result.insertId;
}

export async function writeDraftMetadata(database, sermonId, { speaker, series, citations, topics }) {
  const names = [];
  for (const [catalog, name] of [["speaker", speaker], ["series", series]]) {
    if (name !== undefined) names.push([`${catalog}_id=?`, await catalogId(database, catalog, name)]);
  }
  if (names.length) {
    await database.execute(`UPDATE sermons SET ${names.map(([column]) => column).join(", ")} WHERE id=?`,
      [...names.map(([, value]) => value), sermonId]);
  }

  if (citations !== undefined) {
    await database.execute("DELETE FROM sermon_scripture WHERE sermon_id=?", [sermonId]);
    for (const [order, citation] of citations.entries()) {
      await database.execute(`INSERT INTO sermon_scripture
        (sermon_id, sort_order, book_slug, chapter_start, verse_start, chapter_end, verse_end, citation)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [sermonId, order, ...citation]);
    }
  }

  if (topics !== undefined) {
    await database.execute("DELETE FROM sermon_topic_links WHERE sermon_id=?", [sermonId]);
    const topicIds = new Set();
    for (const topic of topics) topicIds.add(await catalogId(database, "topic", topic));
    for (const topicId of topicIds) {
      await database.execute("INSERT INTO sermon_topic_links (sermon_id, topic_id) VALUES (?, ?)", [sermonId, topicId]);
    }
  }
}

export async function readDraftMetadata(database, sermonId) {
  const [[names], [scripture], [topics]] = await Promise.all([
    database.execute(`SELECT sp.name AS speaker, se.title AS series FROM sermons AS s
      LEFT JOIN sermon_speakers AS sp ON sp.id=s.speaker_id
      LEFT JOIN sermon_series AS se ON se.id=s.series_id WHERE s.id=?`, [sermonId]),
    database.execute("SELECT citation FROM sermon_scripture WHERE sermon_id=? ORDER BY sort_order", [sermonId]),
    database.execute(`SELECT t.label FROM sermon_topic_links AS l
      JOIN sermon_topics AS t ON t.id=l.topic_id WHERE l.sermon_id=? ORDER BY t.label`, [sermonId]),
  ]);
  return { ...names[0], scripture: scripture.map(row => row.citation).join("\n"), topics: topics.map(row => row.label).join("\n") };
}
