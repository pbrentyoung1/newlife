# Content workflows

## Standard change

1. Create a short-lived branch.
2. Edit the authoritative source file rather than page markup that merely consumes it.
3. Add or update approved assets.
4. Run `npm run build`.
5. Review the affected routes at desktop and mobile sizes.
6. Merge to `main` only after staging review.
7. Verify the live route and external destination.

## New Markdown item

1. Copy the `_template.md` in the relevant content directory.
2. Rename the file to the permanent slug.
3. Complete frontmatter and Markdown body.
4. Add locally owned images with meaningful alt text.
5. Build and correct all schema errors.
6. Add the filename to the collection JSON index only when publication is approved.
7. Build, preview, merge, and verify.

## Design change

1. Change primitive or framework values in `src/data/designSystem.ts`.
2. Use semantic variables in components; do not paste the new literal into page CSS.
3. Review `/brand/`, `/`, and one interior route.
4. Test keyboard focus, mobile navigation, and reduced motion when relevant.

## External destination

Update `src/data/destinations.ts` once. Components and pages should request destination keys rather than copy URLs. Verify signed-out access and mobile behavior before enabling a destination.

## Sermon series

YouTube remains authoritative. Add one `media-series` Markdown entry for curated title, summary, artwork, alt text, playlist URL, and review date. Do not create one local Markdown file per sermon unless a future search, transcript, or editorial requirement justifies it.
