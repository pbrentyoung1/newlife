# Current state

Updated November 24, 2026.

## Implemented and deployed to staging

- Astro static foundation and strict TypeScript configuration
- shared header and footer
- inviting pill-based primary navigation with accessible About and Connect dropdowns
- semantic corner-radius tokens for controls, cards, images, and pills
- `@lucide/astro` established as the sole production icon library and demonstrated on the living brand reference
- New Life design tokens and living brand reference
- animated still-image hero with three themes, five unequal cards, four reviewed composition presets, and non-repeating random theme/layout selection
- reduced-motion and hidden-page behavior
- mission-facing homepage wireframe
- branded interior sitemap routes with typed semantic tones and human accent notes
- shared editorial page hero and content-index components
- typed Markdown collection schemas
- explicit publication indexes
- noindex/robots prelaunch protection
- production build producing 17 routes
- GitHub `main` connected to Hostinger Web Apps
- Hostinger staging deployment at `https://legendary-white-clam-37.hostingersite.com/`
- Astro build settings: Node 24.x, npm, `npm run build`, output directory `dist`
- staging deployment verified at commit `3900399`
- desktop and mobile layout checks, mobile navigation, hero rotation, and `/brand/` verified in the deployed build
- browser console verified without warnings or errors
- dependency audit verified with zero known vulnerabilities
- all 17 generated routes audited for shared tokens, global chrome, robots protection, browser errors, and horizontal overflow
- design-system ownership, page grammar, route-tone map, and review checklist documented in `docs/DESIGN_SYSTEM.md`

## Deployment safeguards

- The legacy production Git auto-deployment is disabled so repository source files cannot be published directly.
- `www.newlifespring.org` has not been moved to the new Web App and remains unchanged.
- Search indexing stays disabled until the content, destinations, and launch assets are approved.
- The official Hostinger MCP connector is installed and authorized; browser-based Hostinger management was used for this deployment because its tools were not exposed in the active runtime.

## Next release gate

- replace visible asset placeholders with approved photography and branding
- verify all public facts, especially Sunday time, address, parking, children, and accessibility details
- replace pending Planning Center and YouTube destinations with approved public links
- complete content review and accessibility QA
- connect `www.newlifespring.org` only after explicit launch approval

## Content and assets still needed

- approved New Life logo/wordmark treatment
- four or five approved photos for each hero theme
- verified Sunday time, address, parking, entrances, children, and accessibility details
- current leadership names, roles, biographies, and photographs
- verified Planning Center public destinations
- verified YouTube channel, playlists, and livestream destinations
- current community relationships and service photography
