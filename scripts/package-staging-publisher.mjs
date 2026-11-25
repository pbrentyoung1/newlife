import { copyFile, mkdir } from "node:fs/promises";

const out = new URL("../dist/server/publish/", import.meta.url);
await mkdir(new URL("lib/", out), { recursive: true });
for (const file of ["refresh-sermon-snapshot.mjs", "lib/sermon-snapshot.mjs"]) {
  await copyFile(new URL(file, import.meta.url), new URL(file, out));
}
