import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const rootDir = fileURLToPath(new URL("..", import.meta.url));
export const dataDir = path.join(rootDir, "data");
export const siteDir = path.join(rootDir, "site");
export const assetsDir = path.join(siteDir, "assets");
export const printDir = path.join(siteDir, "print");
export const downloadDir = path.join(siteDir, "downloads");

export async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

export async function loadData() {
  const decks = await readJson(path.join(dataDir, "decks.json"));
  const iconManifest = await readJson(path.join(dataDir, "icon-manifest.json"));
  return { decks, iconManifest };
}

export function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export async function ensureOutputDirs() {
  await fs.mkdir(assetsDir, { recursive: true });
  await fs.mkdir(printDir, { recursive: true });
  await fs.mkdir(downloadDir, { recursive: true });
}

export function getAllCards(decks) {
  return decks.decks.flatMap((deck) =>
    deck.cards.map((card) => ({
      ...card,
      deckId: deck.id,
      deckName: deck.name,
      deckDescription: deck.description
    }))
  );
}

export function expectedPdfName(deckId, options = {}) {
  const suffix = options.grayscale ? "-grayscale" : "";
  return `${deckId}${suffix}.pdf`;
}
