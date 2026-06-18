import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { rootDir } from "./lib.mjs";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  const value = process.argv[index + 1];
  return path.isAbsolute(value) ? value : path.join(rootDir, value);
}

function numberArg(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  const value = Number(process.argv[index + 1]);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid numeric value for ${name}: ${process.argv[index + 1]}`);
  }
  return Math.round(value);
}

const sourceDir = argValue("--source-dir", path.join(rootDir, "design-samples/illustration-sheets-vintage"));
const manifestPath = path.join(sourceDir, "manifest.json");
const outputRoot = argValue("--out-dir", path.join(rootDir, "site/assets/illustrations"));
const outerInset = numberArg("--outer-inset", 20);
const innerInset = numberArg("--inner-inset", 10);
const transparentMode = process.argv.includes("--transparent");
const chromaKey = { r: 255, g: 0, b: 255 };
const transparentThreshold = 72;
const despillThreshold = 112;

function distanceToKey(r, g, b) {
  const dr = r - chromaKey.r;
  const dg = g - chromaKey.g;
  const db = b - chromaKey.b;
  return Math.sqrt((dr * dr) + (dg * dg) + (db * db));
}

async function removeMagentaBackground(inputBuffer) {
  const image = sharp(inputBuffer).ensureAlpha();
  const meta = await image.metadata();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

  for (let index = 0; index < data.length; index += info.channels) {
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    const distance = distanceToKey(r, g, b);
    if (distance <= transparentThreshold) {
      data[index + 3] = 0;
    } else if (distance <= despillThreshold) {
      data[index] = Math.min(r, 235);
      data[index + 2] = Math.min(b, 235);
    }
  }

  return sharp(data, {
    raw: {
      width: meta.width,
      height: meta.height,
      channels: info.channels
    }
  }).png().toBuffer();
}

async function cropSheet(sheet) {
  const inputPath = path.join(sourceDir, sheet.expectedFile);
  const image = sharp(inputPath);
  const meta = await image.metadata();
  const usableWidth = meta.width - (outerInset * 2);
  const usableHeight = meta.height - (outerInset * 2);
  if (usableWidth <= 0 || usableHeight <= 0) {
    throw new Error(`Outer inset ${outerInset}px is too large for ${sheet.expectedFile}.`);
  }

  const cellWidth = Math.floor(usableWidth / 3);
  const cellHeight = Math.floor(usableHeight / 3);
  const squareSize = Math.min(cellWidth, cellHeight);
  const xInset = Math.floor((cellWidth - squareSize) / 2);
  const yInset = Math.floor((cellHeight - squareSize) / 2);
  const extractSize = squareSize - (innerInset * 2);
  if (extractSize <= 0) {
    throw new Error(`Inner inset ${innerInset}px is too large for ${sheet.expectedFile}.`);
  }

  for (const [index, cell] of sheet.cells.entries()) {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const left = outerInset + (col * cellWidth) + xInset + innerInset;
    const top = outerInset + (row * cellHeight) + yInset + innerInset;
    const outputDir = path.join(outputRoot, cell.deckId);
    const outputPath = path.join(outputDir, `${cell.iconKey}.png`);
    await fs.mkdir(outputDir, { recursive: true });

    const cropped = await sharp(inputPath)
      .extract({ left, top, width: extractSize, height: extractSize })
      .resize(768, 768, { fit: "cover" })
      .png()
      .toBuffer();

    if (transparentMode) {
      const transparent = await removeMagentaBackground(cropped);
      await sharp(transparent)
        .trim({ background: "#00000000", threshold: 8 })
        .resize(768, 768, { fit: "contain", background: "#00000000" })
        .png()
        .toFile(outputPath);
    } else {
      await sharp(cropped).png().toFile(outputPath);
    }
  }
}

const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));

for (const sheet of manifest.sheets) {
  await cropSheet(sheet);
}

const count = manifest.sheets.reduce((sum, sheet) => sum + sheet.cells.length, 0);
console.log(`Cropped ${manifest.sheets.length} illustration sheets into ${count} PNG files.`);
