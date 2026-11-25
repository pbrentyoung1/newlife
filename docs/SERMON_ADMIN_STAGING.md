# New Life staging sermon editor

The editor runs as a separate Node Web App on a free Hostinger staging hostname. It writes to the staging editorial MariaDB only. The existing public staging Astro app keeps its read-only publication settings and gets no editorial credentials.

## Editor workflow

1. Sign in over HTTPS and select **Add a sermon**. Enter a title, a permanent slug, the YouTube video or ID, a summary, and an optional date. Select **Save draft**.
2. Open the entry and select **Start review**. Verify the copy and the video, confirm the checklist, and select **Approve sermon**. Editing an item in review returns it to draft so a changed record gets reviewed again.
3. Select **Publish to staging**. To remove it later, confirm **Withdraw from staging**. Both actions use the same transactional audit workflow as the staging maintenance command.
4. Check the public staging library after its next successful snapshot refresh. The form reports the editorial result only. A manual or incomplete snapshot setup can delay the public change.

This first editor covers core sermon metadata. Uploads, transcription, taxonomy editing, and multiple editorial accounts are outside this slice. Use one deliberately assigned staging account for the pilot. Its configured display name is used for audit attribution.

## Hostinger setup

- Create a separate Web App on a free temporary Hostinger hostname in the same plan as the staging editorial database. Do not attach `newlifespring.org` or reuse the public staging Web App. Deploy the dedicated admin branch only.
- Set Node 24, root `./`, build command `npm run build:staging-admin`, output directory `dist-admin`, and entry `sermon-admin.mjs` relative to that output directory. Hostinger supplies the runtime port.
- Set `ADMIN_ORIGIN` to the exact HTTPS admin origin, `ADMIN_USER` to the chosen login, `ADMIN_ACTOR` to the audit name, and `ADMIN_PASSWORD` to a unique password of at least 24 characters. Store it only in the admin app’s protected environment. Confirm HTTP redirects to HTTPS before sending any credentials.
- Set `EDITORIAL_DB_NAME` and `EDITORIAL_DB_USER` to the existing staging editorial names and enter the current `EDITORIAL_DB_PASSWORD` directly in the admin app’s protected environment. Never add them to Git, the public staging app, or a URL. The staging name guard rejects production database names.
- Before handing off the editor, verify anonymous requests return 401, cross-origin writes return 403, and a signed-in synthetic draft can be reviewed, published, and withdrawn. Check the editorial audit and the public staging results separately. The public result still depends on the private publisher’s MariaDB credential and a verified SQLite cutover.
