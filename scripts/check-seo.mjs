import fs from "node:fs/promises";
import path from "node:path";
import { siteDir } from "./lib.mjs";

const maxAssetBytes = 25 * 1024 * 1024;
const minVisibleWords = 600;
const coreKeyword = "charades for kids";
const minKeywordDensity = 3;
const maxKeywordDensity = 5;

async function walkFiles(dir) {
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

function requireMatch(html, pattern, message, failures) {
  if (!pattern.test(html)) failures.push(message);
}

async function main() {
  const failures = [];
  const indexPath = path.join(siteDir, "index.html");
  const html = await fs.readFile(indexPath, "utf8");

  requireMatch(html, /<title>[^<]{20,70}<\/title>/, "Missing or weak title tag.", failures);
  requireMatch(html, /<meta name="description" content="[^"]{80,180}">/, "Missing or weak meta description.", failures);
  requireMatch(html, /<link rel="canonical" href="https:\/\/[^"]+\/">/, "Missing absolute canonical URL.", failures);
  requireMatch(html, /property="og:image"/, "Missing Open Graph image.", failures);
  requireMatch(html, /name="twitter:card" content="summary_large_image"/, "Missing Twitter large-card metadata.", failures);
  requireMatch(html, /<script type="application\/ld\+json">/, "Missing JSON-LD structured data.", failures);

  const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  if (jsonLd) {
    try {
      JSON.parse(jsonLd);
    } catch {
      failures.push("JSON-LD is not valid JSON.");
    }
  }

  const visibleText = html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  const visibleWords = visibleText.split(/\s+/).filter(Boolean).length;
  const keywordCount = (visibleText.match(new RegExp(coreKeyword, "g")) || []).length;
  const keywordDensity = visibleWords ? (keywordCount * coreKeyword.split(/\s+/).length / visibleWords) * 100 : 0;

  if (visibleWords < minVisibleWords) {
    failures.push(`Visible homepage copy is too thin: ${visibleWords} words, expected at least ${minVisibleWords}.`);
  }
  if (keywordDensity < minKeywordDensity || keywordDensity > maxKeywordDensity) {
    failures.push(
      `Core keyword density is outside target: ${keywordDensity.toFixed(2)}%, expected ${minKeywordDensity}-${maxKeywordDensity}%.`
    );
  }

  const [robots, sitemap] = await Promise.all([
    fs.readFile(path.join(siteDir, "robots.txt"), "utf8").catch(() => ""),
    fs.readFile(path.join(siteDir, "sitemap.xml"), "utf8").catch(() => "")
  ]);
  if (!/Sitemap: https:\/\//.test(robots)) failures.push("robots.txt is missing an absolute Sitemap entry.");
  if (!/<loc>https:\/\/[^<]+\/<\/loc>/.test(sitemap)) failures.push("sitemap.xml is missing an absolute homepage URL.");

  const files = await walkFiles(siteDir);
  for (const filePath of files) {
    const stat = await fs.stat(filePath);
    if (stat.size > maxAssetBytes) {
      failures.push(`File exceeds 25MB static-hosting target: ${path.relative(siteDir, filePath)}`);
    }
  }

  if (failures.length) {
    throw new Error(`SEO/deploy check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
  }

  console.log(
    `SEO/deploy check passed: metadata, robots, sitemap, JSON-LD, ${visibleWords} visible words, ` +
    `${keywordDensity.toFixed(2)}% core keyword density, and file-size target are valid.`
  );
}

await main();
