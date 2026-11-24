# New Life design system

This document defines how the branding vocabulary becomes production code. The living visual reference is `/brand/`; the code and rules below are authoritative for implementation.

## Design vocabulary

New Life should feel:

- restrained rather than loud;
- editorial rather than promotional;
- historic without feeling dusty;
- warm and human without becoming casual;
- structured without becoming cold;
- neighbor-oriented and grounded in real relationships.

Composition, typography, real still photography, and restrained motion create distinction. Do not use autoplay background video, high-saturation gradients, generic marketing-card grids, novelty styling, or decorative motion without a communication purpose.

## Inheritance model

Every public page follows this chain:

```text
src/data/designSystem.ts
        ↓
BaseLayout.astro → global CSS variables, metadata, Header, Footer
        ↓
PageLayout.astro → tone-aware editorial hero and human accent
        ↓
PageContentIndex.astro / page sections → route content
```

The homepage and brand reference use `BaseLayout` directly because their compositions are intentionally unique. They still consume the same variables, typography, controls, header, and footer.

## Sources of truth

| Concern | Owner |
| --- | --- |
| Primitive colors, semantic surfaces, fonts, spacing, radius, shadow, motion | `src/data/designSystem.ts` |
| Global element and component styles | `src/styles/global.css` |
| Sitewide metadata, header, and footer | `src/layouts/BaseLayout.astro` |
| Interior-page hero composition | `src/layouts/PageLayout.astro` |
| Interior-page section index | `src/components/PageContentIndex.astro` |
| Homepage hero themes, timing, and irregular composition presets | `src/data/heroGallery.ts` |
| Homepage hero transition and random-selection behavior | `src/components/HeroMosaic.astro` |
| Route title, description, human note, tone, and planned sections | `src/data/pages.ts` |
| Visual reference and rendered token labels | `src/components/BrandReference.astro` |

Never copy a color, font stack, shadow, radius, or motion duration into a page. Change its token in `designSystem.ts` and consume the semantic CSS variable. The only inline styles permitted are on the brand reference itself where a token is being rendered as data, and on the document root where `BaseLayout` publishes the token set.

## Page grammar

Every standard interior page includes:

1. shared header and primary navigation;
2. a `PageLayout` hero with an eyebrow, one H1, a concise lead, a restrained handwritten note, and one approved semantic tone;
3. an editorial content structure with clear hierarchy rather than a repeated dashboard-card grid;
4. a useful next step using the shared button treatments;
5. the shared footer and external-system boundaries;
6. prelaunch metadata and search-indexing protection until launch approval.

Tone changes are semantic accents, not independent page themes:

| Tone | Meaning | Current routes |
| --- | --- | --- |
| Blue | clarity, welcome, and action | Visit, Youth, Contact |
| Sage | community, growth, and local relationships | About, Connect, Community |
| Clay | human story, questions, and warmth | Faith, Preschool |
| Gold | significance, teaching, and reflection | Beliefs, Children, Privacy |
| Cedar | pastoral leadership and media reflection | Leadership, Watch, 404 |

## Typography and color use

- IBM Plex Serif carries display headings and historic weight.
- IBM Plex Sans carries readable body and interface copy at 16px minimum.
- IBM Plex Mono is reserved for labels, navigation, technical cues, and compact actions.
- Homemade Apple is a sparse human accent, never a body or interface face.
- Paper and neutral surfaces do most of the work.
- Blue carries the primary action and trust role.
- Sage, clay, gold, and cedar are accents with meaning; do not use them randomly.
- Avoid pure black, pure white, and pasted color literals.

## Components and reuse

- Header, footer, buttons, page heroes, content indexes, platform signposts, and hero mosaic behavior are shared components or shared semantic classes.
- Page files compose components and content; they do not redefine the design system.
- When a pattern appears twice, first decide whether it belongs in `global.css`, a component, or typed data.
- A page-specific class may control composition. It may not introduce a new palette, font, button style, shadow, or radius.
- External destinations must come from `src/data/destinations.ts`.
- Repeated site facts must come from typed data, not copied prose.

## Imagery and motion

- Use real New Life people, spaces, worship, meals, and neighborhood service when permissions allow.
- Still-image mosaics are the preferred hero motion language.
- The homepage mosaic uses five unequal cards and several approved composition presets. Theme and layout are selected independently without immediately repeating either one.
- Cards leave and arrive in a staggered sequence with a short visual beat between states. Keep the interval slow enough that the visitor can read the hero before it changes.
- Layout randomness must choose from reviewed presets in `heroGallery.ts`; do not generate unconstrained positions that can collide, overflow, or obscure copy.
- Motion must preserve layout, pause while the page is hidden, and respect `prefers-reduced-motion`.
- Reduced-motion visitors receive the stable default composition with no automatic cycling.
- Placeholder blocks must remain visibly labeled until an approved asset replaces them.
- Every meaningful image needs descriptive alt text; decorative images use empty alt text.

## Accessibility requirements

- one clear H1 per page;
- logical heading order;
- keyboard-operable navigation and controls;
- visible gold focus treatment;
- readable contrast and 16px minimum body copy;
- no horizontal overflow at supported mobile and desktop widths;
- reduced-motion behavior for animation;
- descriptive link labels and image alternatives.

## Page review checklist

Before merging a new page or design change:

- [ ] Content and route data come from the correct authoritative source.
- [ ] The page uses `BaseLayout` or `PageLayout` rather than recreating global chrome.
- [ ] Colors, fonts, spacing primitives, controls, shadow, and motion come from tokens.
- [ ] Accent tone matches the content meaning.
- [ ] Typography and section progression feel editorial, not like a generic feature grid.
- [ ] The next step points to the website, Planning Center, YouTube, or the school according to the architecture boundary.
- [ ] Desktop and 390px mobile widths have no horizontal overflow.
- [ ] Keyboard focus, navigation, and reduced motion still work.
- [ ] Hero presets remain legible at desktop and 390px mobile widths, with no repeated theme or layout on an automatic transition.
- [ ] Canonical metadata and prelaunch robots directives are correct.
- [ ] `/brand/`, `/`, and a representative interior route still render correctly.
- [ ] `npm run build`, `npm run audit:brand`, and `git diff --check` pass.

## Verified baseline

On November 24, 2026, all 17 generated routes were built and audited. Every route rendered the shared header, footer, root design tokens, prelaunch robots policy, and responsive layout without horizontal overflow or browser console errors. All 13 standard interior routes use the typed tone and note system in `src/data/pages.ts`. The repeatable source and generated-output checks live in `scripts/audit-branding.mjs`.
