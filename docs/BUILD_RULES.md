# Build and deployment rules

- Production output must remain static and deploy from `dist/`.
- Hostinger should use Node 24, run `npm ci`, and run `npm run build` from `main`.
- Never configure Hostinger to serve the repository root once Astro source is committed.
- Source, internal documentation, Markdown drafts, and templates must not be part of the public artifact.
- Keep search indexing disabled until launch approval.
- Preserve the canonical host `https://www.newlifespring.org`.
- Do not change legacy-domain or email DNS records without a reviewed migration step.
- Do not add a server runtime, database, authentication, form handler, or Planning Center synchronization without a demonstrated requirement.

Before deployment:

```sh
npm ci
npm run build
git diff --check
```

Verify `/`, `/brand/`, mobile navigation, canonical metadata, robots directives, and a representative interior route.
