CREATE TABLE IF NOT EXISTS sermon_publication_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sermon_id INT UNSIGNED NOT NULL,
  action ENUM('publish', 'withdraw') NOT NULL,
  actor VARCHAR(200) NOT NULL,
  occurred_at DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)),
  CONSTRAINT sermon_publication_actor_required CHECK (CHAR_LENGTH(TRIM(actor)) > 0),
  FOREIGN KEY (sermon_id) REFERENCES sermons(id),
  KEY sermon_publication_history (sermon_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
