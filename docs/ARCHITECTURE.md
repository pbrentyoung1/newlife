# Architecture

## Boundaries

- The public website explains New Life and supports mission-facing discovery.
- Planning Center owns events, groups, signups, giving, forms, membership, serving, prayer, and member resources.
- YouTube owns videos, playlists, livestreams, and recordings.
- The school website owns admissions, tours, hours, and school operations.

Do not create a second operational system inside the website.

## Component ownership

- `BaseLayout` owns metadata, global design variables, header, and footer.
- `PageLayout` owns the shared editorial hero grammar for interior routes.
- `Header` and `Footer` consume shared navigation and site data. `Header` owns the accessible pill and dropdown interaction; `src/data/navigation.ts` owns its hierarchy and icon keys.
- `HeroMosaic` owns the animated still-image composition and reduced-motion behavior.
- `PageContentIndex` owns the standard editorial index used while interior content is prepared.
- Pages compose sections; they do not redefine global church facts or design tokens.
- `src/data/pages.ts` owns route-level titles, descriptions, human notes, semantic tones, and section scope.
- `src/data/media.ts` owns the single current latest-sermon record reused by the homepage and Watch page.
- Content entries own durable editorial copy.
- Typed data modules own repeated facts and destinations.

## Design-system source

`src/data/designSystem.ts` is the authoritative source for:

- primitive colors, semantic surfaces, and `--nl-role-*` usage tokens;
- dark-mode colors;
- font stacks and their roles;
- spacing scale;
- content widths;
- control radius;
- card shadow;
- motion timing.

`BaseLayout` serializes those tokens to CSS custom properties on the document root. `global.css` maps production styles to semantic roles rather than selecting primitive swatches by appearance. The `/brand/` reference imports the same token objects for its labels and samples. Never maintain a separate style-guide palette.

See `DESIGN_SYSTEM.md` for the page grammar, route-tone map, component rules, and review checklist.

## Content source

Each public collection uses Markdown with schema validation. A file is not public merely because it exists; public collection filenames must also appear in the corresponding JSON index in `src/content-indexes/`.

The filename is the permanent slug. Avoid changing it after publication.

## Backend escape hatch

Do not add a CMS or database by default. If multiple nontechnical editors, approval flows, scheduled publishing, granular permissions, or relational content become demonstrated needs, retain the Astro frontend and existing schemas. An Inspinia/Postgres admin can then become an editing interface and content API rather than a replacement architecture.
