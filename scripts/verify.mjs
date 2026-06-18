import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { downloadDir, loadData, printDir, readJson, siteDir } from "./lib.mjs";
import { validateData } from "./validate.mjs";

const require = createRequire(import.meta.url);

async function fileExists(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile() && stat.size > 10_000;
  } catch {
    return false;
  }
}

async function getPdfPageCount(filePath) {
  const pdfjsPath = require.resolve("pdfjs-dist/legacy/build/pdf.mjs");
  const pdfjs = await import(pathToFileURL(pdfjsPath).href);
  const data = new Uint8Array(await fs.readFile(filePath));
  const doc = await pdfjs.getDocument({ data, disableWorker: true }).promise;
  return doc.numPages;
}

async function verifyDownloads() {
  const manifest = await readJson(path.join(printDir, "manifest.json"));
  const failures = [];

  for (const item of manifest) {
    const pdfPath = path.join(downloadDir, item.pdfName);
    if (!(await fileExists(pdfPath))) {
      failures.push(`Missing or too-small PDF: ${pdfPath}`);
      continue;
    }

    const pageCount = await getPdfPageCount(pdfPath);
    const isCombined = item.id.includes("starter-pack");
    const expected = isCombined ? 18 : 5;
    if (pageCount !== expected) {
      failures.push(`${item.pdfName} expected ${expected} pages, found ${pageCount}.`);
    }
  }

  return failures;
}

async function verifyLinks() {
  const html = await fs.readFile(path.join(siteDir, "index.html"), "utf8");
  const hrefs = [...html.matchAll(/href="downloads\/([^"]+\.pdf)"/g)].map((match) => match[1]);
  const failures = [];
  for (const href of hrefs) {
    if (!(await fileExists(path.join(downloadDir, href)))) {
      failures.push(`Download link points to missing PDF: ${href}`);
    }
  }
  if (!hrefs.length) {
    failures.push("No PDF download links found in site/index.html.");
  }
  return failures;
}

async function main() {
  const dataResult = await validateData();
  const { decks } = await loadData();
  const cardCount = decks.decks.reduce((total, deck) => total + deck.cards.length, 0);
  const failures = [
    ...(await verifyDownloads()),
    ...(await verifyLinks())
  ];

  if (cardCount !== dataResult.cardCount || cardCount !== 144) {
    failures.push(`Expected 144 total cards, found ${cardCount}.`);
  }

  if (failures.length) {
    throw new Error(`Verification failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
  }

  const manifest = await readJson(path.join(printDir, "manifest.json"));
  console.log(`Verified ${dataResult.deckCount} decks, ${dataResult.cardCount} cards, ${manifest.length} PDFs, and download links.`);
}

await main();
