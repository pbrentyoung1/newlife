import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = new URL("../", import.meta.url).pathname;
const dist = join(root, "dist");
const src = join(root, "src");

async function filesUnder(directory, extensions) {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) paths.push(...await filesUnder(path, extensions));
    else if (extensions.includes(extname(entry.name))) paths.push(path);
  }

  return paths;
}

const errors = [];
const htmlFiles = await filesUnder(dist, [".html"]);

if (htmlFiles.length < 17) errors.push(`Expected at least 17 generated HTML routes; found ${htmlFiles.length}.`);

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const name = relative(dist, file);
  const h1Count = (html.match(/<h1(?:\s|>)/g) ?? []).length;

  if (!html.includes("--nl-color-blue:#2F5D7C")) errors.push(`${name}: root design tokens are missing.`);
  if (!html.includes("--nl-role-action:var(--nl-color-blue)")) errors.push(`${name}: semantic color roles are missing.`);
  if (!html.includes('class="site-header"')) errors.push(`${name}: shared header is missing.`);
  if (!html.includes('class="site-footer"')) errors.push(`${name}: shared footer is missing.`);
  if (!html.includes('name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex"')) errors.push(`${name}: prelaunch robots policy is missing.`);
  if (h1Count !== 1) errors.push(`${name}: expected one H1; found ${h1Count}.`);
}

const sourceFiles = await filesUnder(src, [".astro", ".css", ".ts"]);

for (const file of sourceFiles) {
  const source = await readFile(file, "utf8");
  const name = relative(root, file);

  if (!name.endsWith("src/data/designSystem.ts") && /#[0-9a-f]{3,8}\b/i.test(source)) {
    errors.push(`${name}: contains a color literal outside the design-token source.`);
  }

  const permitsRenderedTokenStyles = name.endsWith("src/components/BrandReference.astro");
  const permitsRootTokenStyle = name.endsWith("src/layouts/BaseLayout.astro");
  if (!permitsRenderedTokenStyles && !permitsRootTokenStyle && /\sstyle=/.test(source)) {
    errors.push(`${name}: contains an inline style outside an approved token-rendering surface.`);
  }
}

const globalCss = await readFile(join(src, "styles/global.css"), "utf8");
if (/nav-dropdown-link:nth-child/.test(globalCss) || /page-content-item:nth-child/.test(globalCss)) {
  errors.push("src/styles/global.css: accent colors must follow semantic tones, not item position.");
}

if (errors.length) {
  console.error("Brand audit failed:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Brand audit passed for ${htmlFiles.length} generated routes.`);
