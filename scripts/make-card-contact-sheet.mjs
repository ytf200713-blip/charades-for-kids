import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { rootDir } from "./lib.mjs";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const deckId = process.argv[2] || "animals";
const pageArg = process.argv[3] || "page-1";
const dir = path.join(rootDir, "design-samples/single-card-vintage", `${deckId}-${pageArg}`);
const expectedPath = path.join(dir, "expected-files.txt");
const names = (await fs.readFile(expectedPath, "utf8"))
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

const thumbW = 260;
const thumbH = 390;
const gap = 18;
const columns = 3;
const rows = Math.ceil(names.length / columns);
const composites = [];
const missing = [];

for (const [index, fileName] of names.entries()) {
  const inputPath = path.join(dir, fileName);
  try {
    await fs.access(inputPath);
  } catch {
    missing.push(fileName);
    continue;
  }
  const input = await sharp(inputPath).resize(thumbW, thumbH, { fit: "cover" }).png().toBuffer();
  composites.push({
    input,
    left: (index % columns) * (thumbW + gap),
    top: Math.floor(index / columns) * (thumbH + gap)
  });
}

if (missing.length) {
  throw new Error(`Missing card files:\n${missing.map((name) => `- ${name}`).join("\n")}`);
}

const width = columns * thumbW + (columns - 1) * gap;
const height = rows * thumbH + (rows - 1) * gap;
const outPath = path.join(dir, "contact-sheet.png");

await sharp({ create: { width, height, channels: 4, background: "#fbfaf5" } })
  .composite(composites)
  .png()
  .toFile(outPath);

console.log(`Wrote ${outPath}`);
