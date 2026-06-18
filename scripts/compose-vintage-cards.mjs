import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { getAllCards, loadData, rootDir, slugify } from "./lib.mjs";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const cardWidth = 1200;
const cardHeight = 1536;

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  const value = process.argv[index + 1];
  return path.isAbsolute(value) ? value : path.join(rootDir, value);
}

const sourceRoot = argValue("--illustrations-dir", path.join(rootDir, "site/assets/illustrations/animals"));
const outRoot = argValue("--out-dir", path.join(rootDir, "site/assets/cards"));

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function numericFileOrder(fileName) {
  const parenthesized = fileName.match(/\((\d+)\)\.png$/i);
  if (parenthesized) return Number(parenthesized[1]);
  const trailing = fileName.match(/(\d+)\.png$/i);
  if (trailing) return Number(trailing[1]);
  return Number.MAX_SAFE_INTEGER;
}

async function orderedIllustrationPaths() {
  const dirents = await fs.readdir(sourceRoot, { withFileTypes: true });
  const sheetDirs = dirents
    .filter((dirent) => dirent.isDirectory() && /^\d+$/.test(dirent.name))
    .map((dirent) => dirent.name)
    .sort((a, b) => Number(a) - Number(b));

  const paths = [];
  for (const sheetDir of sheetDirs) {
    const fullDir = path.join(sourceRoot, sheetDir);
    const files = (await fs.readdir(fullDir))
      .filter((file) => file.toLowerCase().endsWith(".png"))
      .sort((a, b) => {
        const order = numericFileOrder(a) - numericFileOrder(b);
        return order || a.localeCompare(b, "en");
      });
    for (const file of files) {
      paths.push(path.join(fullDir, file));
    }
  }
  return paths;
}

function titleLines(title) {
  const words = title.split(/\s+/);
  if (title.length <= 12 || words.length === 1) return [title];
  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > 13 && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 2);
}

function titleSvg(title) {
  const lines = titleLines(title);
  const fontSize = lines.length > 1 ? 104 : title.length > 14 ? 112 : title.length > 10 ? 128 : 150;
  const yStart = lines.length > 1 ? 1250 : 1330;
  const tspans = lines.map((line, index) =>
    `<tspan x="${cardWidth / 2}" y="${yStart + (index * (fontSize * 1.08))}">${escapeXml(line)}</tspan>`
  ).join("");

  return `
    <svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg">
      <text text-anchor="middle"
        font-family="'Chalkboard SE','Comic Sans MS','Arial Rounded MT Bold',Arial,sans-serif"
        font-size="${fontSize}"
        font-weight="700"
        letter-spacing="0"
        fill="#1e211c">${tspans}</text>
    </svg>
  `;
}

function baseSvg() {
  const inset = 30;
  return `
    <svg width="${cardWidth}" height="${cardHeight}" viewBox="0 0 ${cardWidth} ${cardHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${inset}" y="${inset}" width="${cardWidth - inset * 2}" height="${cardHeight - inset * 2}" rx="44" ry="44" fill="#f7ead0" stroke="#1e211c" stroke-width="10"/>
    </svg>
  `;
}

function cardFileName(card, globalIndex) {
  return `${String(globalIndex + 1).padStart(3, "0")}-${slugify(card.title)}-card.png`;
}

async function composeCard({ card, globalIndex, sourcePath }) {
  const outDir = path.join(outRoot, card.deckId);
  const outPath = path.join(outDir, cardFileName(card, globalIndex));
  await fs.mkdir(outDir, { recursive: true });

  const illustration = await sharp(sourcePath)
    .resize({ width: 1000, height: 1100, fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();
  const meta = await sharp(illustration).metadata();
  const left = Math.round((cardWidth - meta.width) / 2);

  await sharp(Buffer.from(baseSvg()))
    .composite([
      { input: illustration, left, top: 95 },
      { input: Buffer.from(titleSvg(card.title)), left: 0, top: 0 }
    ])
    .png()
    .toFile(outPath);

  return outPath;
}

const { decks } = await loadData();
const cards = getAllCards(decks);
const illustrations = await orderedIllustrationPaths();

if (illustrations.length < cards.length) {
  throw new Error(`Expected at least ${cards.length} ordered illustrations in ${sourceRoot}, found ${illustrations.length}.`);
}

const outputs = [];
for (const [index, card] of cards.entries()) {
  outputs.push(await composeCard({ card, globalIndex: index, sourcePath: illustrations[index] }));
}

console.log(`Composed ${outputs.length} vintage cards in ${outRoot}`);
