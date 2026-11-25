# Sermon library staging

- Target the dedicated New Life staging database. Select that schema before running the SQL files in `db/migrations/` in numerical order. Use the migration owner to create the views. MariaDB commits DDL before each statement, so inspect the objects after any failure and retry the incomplete migration before proceeding.
- Use the staging branch on New Life’s temporary Hostinger app. Select Astro, Node 24, repo root, `npm run build`, output `dist`, and entry file `server/entry.mjs`. Hostinger resolves the entry relative to the output directory. Set `HOST=0.0.0.0` and let Hostinger supply the port. Preserve the previous staging deployment as a rollback point. Both sermon routes run on demand. All original pages still prerender into `dist/client`.
- Apply `db/publication/001_publication_tables.sql` to the separate staging publication database. Copy only the fields returned by the editorial `public_sermons` and `public_sermon_scripture` views. Grant the runtime account **Read only** in Hostinger before connecting Astro.
- Set `PUBLICATION_DB_NAME`, `PUBLICATION_DB_USER`, and `PUBLICATION_DB_PASSWORD` in the staging app. Only the separate publication credential belongs in the app. Keep both databases closed to external connections and keep credentials, editorial drafts, and source transcripts out of Git.
- Verify that the runtime account cannot update the projection or select from the editorial schema. Keep editorial and maintenance credentials out of the Astro environment.
- Verify the Watch page and `/watch/sermons/` on staging. A published test record should render in the list and its detail route. Draft, scheduled, withdrawn, and missing records should return 404 at their detail URLs and stay out of the lists. A database failure should show an unavailable state with HTTP 503. The dynamic routes use `Cache-Control: no-store`.

The first slice covers schema, publication visibility, browsing, and basic sermon details. Search and archive backfill are separate phases.

## Staging status

Both migrations ran on New Life staging on November 25, 2026. A transaction with synthetic rows confirmed that the views exposed only the published sermon, hid a future publication and a draft, hid the resources of a draft sermon, and stopped returning the published row after withdrawal. The fixtures were rolled back.

The editorial database is the source of truth. The separate publication database contains only the snapshot Astro can serve. The first snapshot contains the sermon already featured on New Life’s Watch page. MariaDB denied the read-only account both an update to the publication database and a read from the editorial schema.

Staging commit `60611e4` returned HTTP 200 for the library and the published sermon. Synthetic draft, scheduled, and withdrawn detail URLs returned 404, omitted fixture content, and used `Cache-Control: no-store`. The scheduled test row was withdrawn after verification. The production branch stayed at `19bace79`.

## Refreshing the snapshot

The staging editorial workflow is available in `scripts/sermon-editorial.mjs`. Run it from an authorized maintenance context using `EDITORIAL_DB_NAME`, `EDITORIAL_DB_USER`, `EDITORIAL_DB_PASSWORD`, and `EDITORIAL_ACTOR`. Use `node scripts/sermon-editorial.mjs publish <slug> --apply-staging` for approved sermons or `node scripts/sermon-editorial.mjs withdraw <slug> --apply-staging` to withdraw a published or scheduled sermon. It records the change and actor together in `sermon_publication_events`. The command reports the editorial result independently of the next snapshot refresh. Reapproval is required before republishing a withdrawn sermon.

Migration `003` was applied to staging. A rolled-back test confirmed that publication showed the test sermon in the editorial public view, withdrawal removed it, and both actions wrote audit events. Automatic refresh has not been enabled.

Hostinger's managed database allows one account per database. The staging reader stays read-only during normal operation. Before the next import, arrange an isolated publication refresh, for example by preparing a replacement snapshot with a write-enabled account, making it read-only, and switching staging to it. Keep the previous sealed snapshot available until verification passes. Changing the active runtime account to a writer would undo the access boundary.

`scripts/publish-sermons.mjs --apply-staging` is a staging maintenance script for a trusted Node execution context with local connections to both databases. It reads a consistent snapshot of the editorial published views, replaces the destination's snapshot in one transaction, skips unchanged content, and serializes simultaneous refreshes. Run it with separate `EDITORIAL_DB_*` and `PUBLICATION_DB_*` maintenance variables. Never run it in the Astro request process. A scheduled refresh job can retry failures and will pick up scheduled publications and editorial changes on its next run once it has a separate writer. The current live snapshot still requires a manual refresh, including after a withdrawal.

## Staging SQLite cutover

- Use a staging-only `staging-publisher` directory beside `public_html` and `hbuilds`. Put the existing editorial MariaDB credentials in owner-only `publisher.env`, outside Astro’s environment, and set `SERMON_SNAPSHOT_PATH` there to the absolute path of `sermons.sqlite` in that directory.
- Deploy the staging branch with its existing MariaDB publication reader settings first. This packages the publisher at `dist/server/publish/refresh-sermon-snapshot.mjs`. From the private publisher directory, schedule the Hostinger Node 24 command with `--env-file=publisher.env`, the deployed publisher path, and `--apply-staging`. Use the staging app’s cron scheduler. Confirm a successful run and first snapshot before switching the reader.
- Set only `SERMON_SNAPSHOT_PATH` in the Astro environment for database access at cutover. Remove the old `PUBLICATION_DB_*` values from the Astro environment once rollback has been checked. The reader opens the file read-only and fails closed if the file is missing, incompatible, or more than five minutes old.
- The publisher reads MariaDB’s published views in one read-only transaction and replaces the public SQLite file atomically. A refresh on each cron tick also picks up edits and scheduled publications. Validate the expected refresh interval on staging and test publish (200 and listed) followed by withdrawal (404 and omitted), without manually running the refresh or redeploying.
