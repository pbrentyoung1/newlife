-- Run with the target schema selected. DDL commits implicitly in MariaDB.
-- Statements may be retried if an interrupted first application left some objects.
CREATE TABLE IF NOT EXISTS sermon_speakers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sermon_series (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(120) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  youtube_playlist_id VARCHAR(80)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sermon_topics (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(120) NOT NULL UNIQUE,
  label VARCHAR(200) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sermons (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(180) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  youtube_video_id CHAR(11) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  title VARCHAR(240) NOT NULL,
  summary TEXT NOT NULL,
  preached_on DATE,
  speaker_id INT UNSIGNED,
  series_id INT UNSIGNED,
  state ENUM('draft', 'in_review', 'approved', 'published', 'withdrawn') NOT NULL DEFAULT 'draft',
  reviewed_by VARCHAR(200),
  reviewed_at DATETIME,
  published_at DATETIME,
  CONSTRAINT sermon_slug_format CHECK (slug REGEXP '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT sermon_video_format CHECK (youtube_video_id REGEXP '^[A-Za-z0-9_-]{11}$'),
  CONSTRAINT sermon_review_before_publication CHECK (
    state NOT IN ('approved', 'published') OR (reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL)
  ),
  CONSTRAINT sermon_publication_timestamp CHECK (
    state <> 'published' OR (published_at IS NOT NULL AND published_at >= reviewed_at)
  ),
  FOREIGN KEY (speaker_id) REFERENCES sermon_speakers(id),
  FOREIGN KEY (series_id) REFERENCES sermon_series(id),
  KEY sermon_publication_order (state, preached_on, id),
  FULLTEXT KEY sermon_description_search (title, summary)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sermon_topic_links (
  sermon_id INT UNSIGNED NOT NULL,
  topic_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (sermon_id, topic_id),
  FOREIGN KEY (sermon_id) REFERENCES sermons(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id) REFERENCES sermon_topics(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sermon_scripture (
  sermon_id INT UNSIGNED NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL,
  book_slug VARCHAR(50) NOT NULL,
  chapter_start SMALLINT UNSIGNED NOT NULL,
  verse_start SMALLINT UNSIGNED,
  chapter_end SMALLINT UNSIGNED NOT NULL,
  verse_end SMALLINT UNSIGNED,
  citation VARCHAR(160) NOT NULL,
  PRIMARY KEY (sermon_id, sort_order),
  KEY scripture_lookup (book_slug, chapter_start, chapter_end),
  CONSTRAINT scripture_range_order CHECK (
    chapter_start > 0 AND chapter_end >= chapter_start
    AND (verse_start IS NULL OR verse_start > 0)
    AND (verse_end IS NULL OR verse_end > 0)
    AND (chapter_end <> chapter_start OR verse_end IS NULL OR verse_start IS NULL OR verse_end >= verse_start)
  ),
  FOREIGN KEY (sermon_id) REFERENCES sermons(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sermon_transcripts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sermon_id INT UNSIGNED NOT NULL UNIQUE,
  provenance VARCHAR(255) NOT NULL,
  state ENUM('draft', 'in_review', 'approved', 'published', 'withdrawn') NOT NULL DEFAULT 'draft',
  reviewed_by VARCHAR(200),
  reviewed_at DATETIME,
  published_at DATETIME,
  CONSTRAINT transcript_review_before_publication CHECK (
    state NOT IN ('approved', 'published') OR (reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL)
  ),
  CONSTRAINT transcript_publication_timestamp CHECK (
    state <> 'published' OR (published_at IS NOT NULL AND published_at >= reviewed_at)
  ),
  FOREIGN KEY (sermon_id) REFERENCES sermons(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sermon_transcript_segments (
  transcript_id INT UNSIGNED NOT NULL,
  start_ms INT UNSIGNED NOT NULL,
  end_ms INT UNSIGNED,
  body TEXT NOT NULL,
  PRIMARY KEY (transcript_id, start_ms),
  CONSTRAINT transcript_segment_duration CHECK (end_ms IS NULL OR end_ms > start_ms),
  FOREIGN KEY (transcript_id) REFERENCES sermon_transcripts(id) ON DELETE CASCADE,
  FULLTEXT KEY transcript_body_search (body)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sermon_resources (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sermon_id INT UNSIGNED NOT NULL,
  kind ENUM('related_sermon', 'article', 'devotional', 'adaptation', 'reflection', 'study_guide', 'further_study') NOT NULL,
  title VARCHAR(240) NOT NULL,
  body TEXT,
  url VARCHAR(2048),
  related_sermon_id INT UNSIGNED,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  state ENUM('draft', 'in_review', 'approved', 'published', 'withdrawn') NOT NULL DEFAULT 'draft',
  reviewed_by VARCHAR(200),
  reviewed_at DATETIME,
  published_at DATETIME,
  CONSTRAINT resource_review_before_publication CHECK (
    state NOT IN ('approved', 'published') OR (reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL)
  ),
  CONSTRAINT resource_publication_timestamp CHECK (
    state <> 'published' OR (published_at IS NOT NULL AND published_at >= reviewed_at)
  ),
  FOREIGN KEY (sermon_id) REFERENCES sermons(id) ON DELETE CASCADE,
  FOREIGN KEY (related_sermon_id) REFERENCES sermons(id),
  KEY resource_publication (sermon_id, state, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
