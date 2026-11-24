# New Life Spring website

Mission-facing public website for New Life Christian Reformed Church in Spring, Texas.

## Stack

- Astro, static output
- TypeScript strict mode
- Tailwind utilities plus semantic CSS custom properties
- Markdown content collections with typed frontmatter
- Explicit JSON publication indexes
- Hostinger deployment from the `main` branch

## Commands

```sh
npm install
npm run dev
npm run build
npm run preview
```

The production artifact is `dist/`. Hostinger must be configured to build the repository and publish only that directory.

## Important routes

- `/` — mission-facing homepage
- `/brand/` — living production design-system reference
- `/branding/` — compatibility route for the original reference URL

Search indexing is intentionally disabled until launch approval.

## Source of truth

- Design changes: `src/data/designSystem.ts`
- Church/site facts: `src/data/site.ts`
- Navigation: `src/data/navigation.ts`
- External destinations: `src/data/destinations.ts`
- Hero themes: `src/data/heroGallery.ts`
- Durable editorial content: `src/content/`
- Publication/order: `src/content-indexes/`

See `docs/` before changing architecture, content workflows, or deployment behavior.
