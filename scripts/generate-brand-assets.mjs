import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { siteDir } from "./lib.mjs";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

function logoSvg(size = 512) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#fff8e7"/>
  <rect x="72" y="56" width="276" height="354" rx="32" fill="#f7ead0" stroke="#1e211c" stroke-width="16" transform="rotate(-7 210 233)"/>
  <rect x="164" y="98" width="276" height="354" rx="32" fill="#ffffff" stroke="#1e211c" stroke-width="16" transform="rotate(8 302 275)"/>
  <circle cx="302" cy="242" r="82" fill="#ffcf5a" stroke="#1e211c" stroke-width="14"/>
  <path d="M250 254c34 48 78 48 112 0" fill="none" stroke="#1e211c" stroke-width="16" stroke-linecap="round"/>
  <circle cx="274" cy="220" r="10" fill="#1e211c"/>
  <circle cx="334" cy="220" r="10" fill="#1e211c"/>
  <path d="M160 430h204" stroke="#224b78" stroke-width="20" stroke-linecap="round"/>
  <path d="M190 462h144" stroke="#224b78" stroke-width="20" stroke-linecap="round"/>
</svg>`;
}

function ogBaseSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#fff8e7"/>
  <text x="90" y="532" fill="#1e2a44" font-family="Arial Rounded MT Bold, Arial, sans-serif" font-size="52" font-weight="800">144 Printable Charades Cards</text>
  <text x="92" y="582" fill="#315a86" font-family="Arial, sans-serif" font-size="30" font-weight="700">Picture cards for homeschool, family game night, and indoor play</text>
</svg>`;
}

async function generateOpenGraphImage() {
  const cardItems = [
    { src: "assets/cards/animals/002-cat-card.jpg", x: 115, y: 54, rotate: -7 },
    { src: "assets/cards/actions/038-brush-teeth-card.jpg", x: 365, y: 34, rotate: 4 },
    { src: "assets/cards/food/061-pizza-card.jpg", x: 615, y: 54, rotate: -4 },
    { src: "assets/cards/sports/109-soccer-card.jpg", x: 865, y: 34, rotate: 6 }
  ];
  const composites = [];

  for (const item of cardItems) {
    const input = await sharp(path.join(siteDir, item.src))
      .resize({ width: 235 })
      .ensureAlpha()
      .rotate(item.rotate, { background: { r: 255, g: 248, b: 231, alpha: 0 } })
      .png()
      .toBuffer();
    composites.push({ input, left: item.x, top: item.y });
  }

  await sharp(Buffer.from(ogBaseSvg()))
    .composite(composites)
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(path.join(siteDir, "og-image.jpg"));
}

async function main() {
  await fs.writeFile(path.join(siteDir, "favicon.svg"), logoSvg(), "utf8");

  await sharp(Buffer.from(logoSvg()))
    .resize(32, 32)
    .png()
    .toFile(path.join(siteDir, "favicon-32x32.png"));

  await sharp(Buffer.from(logoSvg()))
    .resize(180, 180)
    .png()
    .toFile(path.join(siteDir, "apple-touch-icon.png"));

  await generateOpenGraphImage();

  console.log("Generated favicon and Open Graph image assets.");
}

await main();
