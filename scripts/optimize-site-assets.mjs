import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { assetsDir, siteDir } from "./lib.mjs";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const cardWidth = 960;
const cardHeight = 1229;
const jpegQuality = 72;
const grayscaleQuality = 70;

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function walkFiles(dir) {
  if (!(await pathExists(dir))) return [];
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const dirent of dirents) {
    const filePath = path.join(dir, dirent.name);
    if (dirent.isDirectory()) {
      files.push(...await walkFiles(filePath));
    } else {
      files.push(filePath);
    }
  }
  return files;
}

async function optimizeCardPng(filePath) {
  const outPath = filePath.replace(/\.png$/i, ".jpg");
  await sharp(filePath)
    .resize({ width: cardWidth, height: cardHeight, fit: "fill" })
    .flatten({ background: "#f7ead0" })
    .jpeg({
      quality: jpegQuality,
      mozjpeg: true,
      chromaSubsampling: "4:2:0"
    })
    .toFile(outPath);

  const [before, after] = await Promise.all([
    fs.stat(filePath),
    fs.stat(outPath)
  ]);
  await fs.unlink(filePath);
  return { before: before.size, after: after.size };
}

async function writeGrayscaleCard(colorPath, cardDir) {
  const relativePath = path.relative(cardDir, colorPath);
  const outPath = path.join(assetsDir, "cards-grayscale", relativePath);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await sharp(colorPath)
    .grayscale()
    .jpeg({ quality: grayscaleQuality, mozjpeg: true })
    .toFile(outPath);
  const stat = await fs.stat(outPath);
  return stat.size;
}

async function optimizeReadyScene() {
  const filePath = path.join(assetsDir, "cards", "charades-ready-scene.png");
  if (!(await pathExists(filePath))) return null;
  const outPath = filePath.replace(/\.png$/i, ".jpg");
  await sharp(filePath)
    .resize({ width: 900, withoutEnlargement: true })
    .flatten({ background: "#fff8e7" })
    .jpeg({ quality: 78, mozjpeg: true })
    .toFile(outPath);

  const [before, after] = await Promise.all([
    fs.stat(filePath),
    fs.stat(outPath)
  ]);
  await fs.unlink(filePath);
  return { before: before.size, after: after.size };
}

async function removeMacMetadata() {
  const files = await walkFiles(siteDir);
  const metadataFiles = files.filter((file) => path.basename(file) === ".DS_Store");
  await Promise.all(metadataFiles.map((file) => fs.unlink(file)));
  return metadataFiles.length;
}

async function pruneUnusedIllustrations() {
  const illustrationDir = path.join(assetsDir, "illustrations");
  if (!(await pathExists(illustrationDir))) return false;
  await fs.rm(illustrationDir, { recursive: true, force: true });
  return true;
}

function formatMb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

async function main() {
  const cardDir = path.join(assetsDir, "cards");
  const files = await walkFiles(cardDir);
  const cardPngs = files.filter((file) => /-card\.png$/i.test(file));

  let before = 0;
  let after = 0;
  for (const filePath of cardPngs) {
    const result = await optimizeCardPng(filePath);
    before += result.before;
    after += result.after;
  }

  const currentCardFiles = await walkFiles(cardDir);
  const cardJpgs = currentCardFiles.filter((file) => /-card\.jpg$/i.test(file));
  let grayscaleBytes = 0;
  for (const filePath of cardJpgs) {
    grayscaleBytes += await writeGrayscaleCard(filePath, cardDir);
  }

  const readyScene = await optimizeReadyScene();
  if (readyScene) {
    before += readyScene.before;
    after += readyScene.after;
  }

  const metadataCount = await removeMacMetadata();
  const prunedIllustrations = await pruneUnusedIllustrations();
  console.log(
    `Optimized ${cardPngs.length + (readyScene ? 1 : 0)} images from ${formatMb(before)} to ${formatMb(after)}. ` +
    `Generated ${cardJpgs.length} grayscale cards (${formatMb(grayscaleBytes)}). ` +
    `Removed ${metadataCount} metadata files${prunedIllustrations ? " and pruned unused illustration intermediates" : ""}.`
  );
}

await main();
