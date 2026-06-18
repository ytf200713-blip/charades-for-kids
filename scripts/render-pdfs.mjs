import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { downloadDir, printDir, readJson } from "./lib.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

async function renderPdf(browser, item) {
  const page = await browser.newPage({ viewport: { width: 816, height: 1056 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(item.htmlPath).href, { waitUntil: "networkidle" });
  await page.emulateMedia({ media: "print" });
  const outputPath = path.join(downloadDir, item.pdfName);
  await page.pdf({
    path: outputPath,
    format: "Letter",
    printBackground: true,
    margin: { top: "0in", right: "0in", bottom: "0in", left: "0in" },
    preferCSSPageSize: true
  });
  await page.close();
  return outputPath;
}

async function main() {
  const manifestPath = path.join(printDir, "manifest.json");
  const manifest = await readJson(manifestPath);
  await fs.mkdir(downloadDir, { recursive: true });

  const systemChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  let launchOptions = { headless: true };
  try {
    await fs.access(systemChrome);
    launchOptions = { ...launchOptions, executablePath: systemChrome };
  } catch {
    // Fall back to the Playwright-managed browser if it is installed.
  }

  const browser = await chromium.launch(launchOptions);
  try {
    const outputs = [];
    for (const item of manifest) {
      outputs.push(await renderPdf(browser, item));
    }
    console.log(`Rendered ${outputs.length} PDFs.`);
  } finally {
    await browser.close();
  }
}

await main();
