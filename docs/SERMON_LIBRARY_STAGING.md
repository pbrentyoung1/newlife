# Sermon library staging

- Target the dedicated New Life staging database. Select that schema before running the SQL files in `db/migrations/` in numerical order. Use the migration owner to create the views. MariaDB commits DDL before each statement, so inspect the objects after any failure and retry the incomplete migration before proceeding.
- Use the staging branch on New Life’s temporary Hostinger app. Select Astro, Node 24, repo root, `npm run build`, output `dist`, and entry file `dist/server/entry.mjs`. Preserve the previous staging deployment as a rollback point. Both sermon routes run on demand. All original pages still prerender into `dist/client`.
- Apply `db/publication/001_publication_tables.sql` to the separate staging publication database. Copy only the fields returned by the editorial `public_sermons` and `public_sermon_scripture` views. Grant the runtime account **Read only** in Hostinger before connecting Astro.
- Set `PUBLICATION_DB_NAME`, `PUBLICATION_DB_USER`, and `PUBLICATION_DB_PASSWORD` in the staging app. Only the separate publication credential belongs in the app. Keep both databases closed to external connections and keep credentials, editorial drafts, and source transcripts out of Git.
- Verify that the runtime account cannot update the projection or select from the editorial schema. Keep editorial and maintenance credentials out of the Astro environment.
- Verify the Watch page and `/watch/sermons/` on staging. A published test record should render in the list and its detail route. Draft, scheduled, withdrawn, and missing records should return 404 at their detail URLs and stay out of the lists. A database failure should show an unavailable state with HTTP 503. The dynamic routes use `Cache-Control: no-store`.

The first slice covers schema, publication visibility, browsing, and basic sermon details. Search and archive backfill are separate phases.

## Staging status

Both migrations ran on New Life staging on November 25, 2026. A transaction with synthetic rows confirmed that the views exposed only the published sermon, hid a future publication and a draft, hid the resources of a draft sermon, and stopped returning the published row after withdrawal. The fixtures were rolled back.

The editorial database is the source of truth. The separate publication database contains only the snapshot Astro can serve. The first snapshot contains the sermon already featured on New Life’s Watch page. The reader has read-only access to that database and MariaDB denied its attempt to read the editorial schema.

## Refreshing the snapshot

Hostinger's managed database allows one account per database. The staging reader stays read-only during normal operation. Before the next import, arrange an isolated publication refresh, for example by preparing a replacement snapshot with a write-enabled account, making it read-only, and switching staging to it. Keep the previous sealed snapshot available until verification passes. Changing the active runtime account to a writer would undo the access boundary.

`scripts/publish-sermons.mjs --apply-staging` is a staging maintenance script for a trusted Node execution context with local connections to both databases. It reads a consistent snapshot of the editorial published views, replaces the destination's snapshot in one transaction, and serializes simultaneous refreshes. Run it with separate `EDITORIAL_DB_*` and `PUBLICATION_DB_*` maintenance variables. Never run it in the Astro request process. The live snapshot changes only when a replacement is published, so a withdrawal requires a refresh before the change appears on the site.
