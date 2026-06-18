import fs from "node:fs/promises";
import path from "node:path";
import { rootDir } from "./lib.mjs";

const deckId = process.argv[2] || "animals";
const pageArg = process.argv[3] || "page-2";
const dir = path.join(rootDir, "design-samples/single-card-vintage", `${deckId}-${pageArg}`);
const prompts = JSON.parse(await fs.readFile(path.join(dir, "prompts.json"), "utf8"));
const files = (await fs.readdir(dir))
  .filter((file) => /^\d{3}-.+\.png$/.test(file))
  .sort();

if (files.length < prompts.length) {
  throw new Error(`Expected at least ${prompts.length} numbered PNG files, found ${files.length}.`);
}

for (const [index, row] of prompts.entries()) {
  const source = path.join(dir, files[index]);
  const target = path.join(dir, `${row.iconKey}-card.png`);
  await fs.copyFile(source, target);
}

console.log(`Normalized ${prompts.length} generated cards in ${dir}`);
