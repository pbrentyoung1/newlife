-- Keep the view definer available. Grant the runtime SELECT on these views only
-- when the host supports per-view grants. Editorial tables carry private drafts.
CREATE OR REPLACE SQL SECURITY DEFINER VIEW public_sermons AS
SELECT s.id, s.slug, s.youtube_video_id, s.title, s.summary, s.preached_on,
       sp.slug AS speaker_slug, sp.name AS speaker_name,
       se.slug AS series_slug, se.title AS series_title
FROM sermons AS s
LEFT JOIN sermon_speakers AS sp ON sp.id = s.speaker_id
LEFT JOIN sermon_series AS se ON se.id = s.series_id
WHERE s.state = 'published' AND s.published_at <= UTC_TIMESTAMP();

CREATE OR REPLACE SQL SECURITY DEFINER VIEW public_sermon_topics AS
SELECT l.sermon_id, t.slug, t.label
FROM public_sermons AS p
JOIN sermon_topic_links AS l ON l.sermon_id = p.id
JOIN sermon_topics AS t ON t.id = l.topic_id;

CREATE OR REPLACE SQL SECURITY DEFINER VIEW public_sermon_scripture AS
SELECT r.sermon_id, r.sort_order, r.book_slug, r.chapter_start, r.verse_start,
       r.chapter_end, r.verse_end, r.citation
FROM public_sermons AS p
JOIN sermon_scripture AS r ON r.sermon_id = p.id;

CREATE OR REPLACE SQL SECURITY DEFINER VIEW public_sermon_transcript_segments AS
SELECT t.sermon_id, seg.start_ms, seg.end_ms, seg.body
FROM public_sermons AS p
JOIN sermon_transcripts AS t ON t.sermon_id = p.id
JOIN sermon_transcript_segments AS seg ON seg.transcript_id = t.id
WHERE t.state = 'published' AND t.published_at <= UTC_TIMESTAMP();

CREATE OR REPLACE SQL SECURITY DEFINER VIEW public_sermon_resources AS
SELECT r.id, r.sermon_id, r.kind, r.title, r.body, r.url, r.sort_order,
       related.slug AS related_sermon_slug
FROM public_sermons AS p
JOIN sermon_resources AS r ON r.sermon_id = p.id
LEFT JOIN public_sermons AS related ON related.id = r.related_sermon_id
WHERE r.state = 'published' AND r.published_at <= UTC_TIMESTAMP()
  AND (r.related_sermon_id IS NULL OR related.id IS NOT NULL);
