-- Load only the projection from the editorial database's public views.
-- Never import the editorial schema or an editorial database dump here.
CREATE TABLE IF NOT EXISTS public_sermons (
  id INT UNSIGNED PRIMARY KEY,
  slug VARCHAR(180) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  youtube_video_id CHAR(11) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  title VARCHAR(240) NOT NULL,
  summary TEXT NOT NULL,
  preached_on DATE,
  speaker_name VARCHAR(200),
  series_title VARCHAR(200),
  KEY sermon_display_order (preached_on, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS public_sermon_scripture (
  sermon_id INT UNSIGNED NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL,
  citation VARCHAR(160) NOT NULL,
  PRIMARY KEY (sermon_id, sort_order),
  FOREIGN KEY (sermon_id) REFERENCES public_sermons(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
