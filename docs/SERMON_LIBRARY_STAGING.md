# Sermon library staging

- Target the dedicated New Life staging database. Select that schema before running the SQL files in `db/migrations/` in numerical order. Use the migration owner to create the views. MariaDB commits DDL before each statement, so inspect the objects after any failure and retry the incomplete migration before proceeding.
- Use the staging branch on New Life’s temporary Hostinger app. Select Astro, Node 24, repo root, `npm run build`, output `dist`, and entry file `dist/server/entry.mjs`. Preserve the previous staging deployment as a rollback point. Both sermon routes run on demand. All original pages still prerender into `dist/client`.
- Set `DB_NAME`, `DB_USER`, and `DB_PASSWORD` in Hostinger’s server environment. The app uses the local MariaDB endpoint. Keep the database closed to external connections. Never put credentials, editorial drafts, or raw transcripts in Git.
- Grant the deployed reader only `SELECT` on `public_sermons` and `public_sermon_scripture`. Keep migration and editorial credentials separate. Verify that the deployed reader cannot select from the base tables. If the host cannot provide per-view grants, use an isolated, read-only publication database before importing real editorial drafts.
- Verify the Watch page and `/watch/sermons/` on staging. A published test record should render in the list and its detail route. Draft, scheduled, withdrawn, and missing records should return 404 at their detail URLs and stay out of the lists. A database failure should show an unavailable state with HTTP 503. The dynamic routes use `Cache-Control: no-store`.

The first slice covers schema, publication visibility, browsing, and basic sermon details. Search and archive backfill are separate phases.

## Staging status

Both migrations ran on New Life staging on November 25, 2026. A transaction with synthetic rows confirmed that the views exposed only the published sermon, hid a future publication and a draft, hid the resources of a draft sermon, and stopped returning the published row after withdrawal. The fixtures were rolled back.

The current Hostinger database account can create and write tables and has no grant option. Hostinger documents one user per managed database. Do not point Astro at the editorial database with that account. A separate published-only database would let Hostinger enforce database-wide read-only access for Astro while keeping drafts in the editorial database. That path needs a publication process and an explicit decision before real drafts are loaded.
