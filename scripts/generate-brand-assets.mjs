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

function ogSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#fff8e7"/>
  <rect x="52" y="52" width="1096" height="526" rx="36" fill="#ffffff" stroke="#1e211c" stroke-width="6"/>
  <rect x="792" y="82" width="246" height="318" rx="28" fill="#f7ead0" stroke="#1e211c" stroke-width="10" transform="rotate(-6 915 241)"/>
  <rect x="886" y="126" width="246" height="318" rx="28" fill="#fff4d6" stroke="#1e211c" stroke-width="10" transform="rotate(8 1009 285)"/>
  <circle cx="1012" cy="280" r="76" fill="#ffcf5a" stroke="#1e211c" stroke-width="12"/>
  <path d="M956 296c36 42 78 42 112 0" fill="none" stroke="#1e211c" stroke-width="13" stroke-linecap="round"/>
  <circle cx="984" cy="254" r="9" fill="#1e211c"/>
  <circle cx="1040" cy="254" r="9" fill="#1e211c"/>
  <text x="96" y="184" fill="#1e211c" font-family="Arial Rounded MT Bold, Arial, sans-serif" font-size="72" font-weight="800">Charades for Kids</text>
  <text x="96" y="270" fill="#224b78" font-family="Arial, sans-serif" font-size="39" font-weight="700">Free online game + printable PDF cards</text>
  <text x="96" y="344" fill="#36506d" font-family="Arial, sans-serif" font-size="31">144 family-safe cards for classrooms, parties,</text>
  <text x="96" y="386" fill="#36506d" font-family="Arial, sans-serif" font-size="31">and family game night.</text>
  <rect x="96" y="456" width="236" height="58" rx="29" fill="#224b78"/>
  <text x="132" y="495" fill="#ffffff" font-family="Arial, sans-serif" font-size="27" font-weight="800">Print and play</text>
  <rect x="356" y="456" width="210" height="58" rx="29" fill="#ffcf5a" stroke="#1e211c" stroke-width="3"/>
  <text x="396" y="495" fill="#1e211c" font-family="Arial, sans-serif" font-size="27" font-weight="800">Ages 4-10</text>
</svg>`;
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

  await sharp(Buffer.from(ogSvg()))
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(path.join(siteDir, "og-image.jpg"));

  console.log("Generated favicon and Open Graph image assets.");
}

await main();
