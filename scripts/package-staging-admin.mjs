import { copyFile, mkdir } from "node:fs/promises";

const out = new URL("../dist-admin/", import.meta.url);
await mkdir(new URL("lib/", out), { recursive: true });
for (const file of ["sermon-admin.mjs", "lib/sermon-admin.mjs", "lib/sermon-publication.mjs"]) {
  await copyFile(new URL(file, import.meta.url), new URL(file, out));
}
