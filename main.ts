// Entry program for the make.fun news-image-20261126 bounty.
// Copies the pre-rendered entry.png (one image summing up the world news
// of Thursday 26 November 2026) into the output directory.
// Node 22, standard library only, no network access.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const src = fileURLToPath(new URL("./entry.png", import.meta.url));
if (!existsSync(src)) {
  throw new Error(`entry.png not found next to main.ts: ${src}`);
}
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "out";
mkdirSync(outDir, { recursive: true });
const dest = join(outDir, "entry.png");
copyFileSync(src, dest);
console.log(`wrote ${dest}`);
