import fs from "node:fs/promises";
import path from "node:path";
import { loadData, rootDir } from "./lib.mjs";
import { buildVintageCardPrompt } from "./card-prompt-lib.mjs";

const deckId = process.argv[2] || "animals";
const pageArg = process.argv[3] || "all";
const pageSize = 9;

function getPageCards(cards, pageArg) {
  if (pageArg === "all") return cards;
  const pageNumber = Number(pageArg);
  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    throw new Error(`Invalid page argument: ${pageArg}. Use "all" or a 1-based page number.`);
  }
  return cards.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
}

function jsonlLine(card, prompt) {
  return JSON.stringify({
    id: `${card.iconKey}-card`,
    prompt,
    size: "1024x1536",
    quality: "high",
    output_format: "png"
  });
}

const { decks } = await loadData();
const deck = decks.decks.find((item) => item.id === deckId);
if (!deck) throw new Error(`Deck not found: ${deckId}`);

const selectedCards = getPageCards(deck.cards, pageArg);
const outputDir = path.join(rootDir, "design-samples/single-card-vintage", `${deckId}-${pageArg === "all" ? "all" : `page-${pageArg}`}`);
await fs.mkdir(outputDir, { recursive: true });

const promptRows = selectedCards.map((card, index) => {
  const prompt = buildVintageCardPrompt(card, index);
  return {
    iconKey: card.iconKey,
    title: card.title,
    prompt
  };
});

await fs.writeFile(path.join(outputDir, "prompts.json"), JSON.stringify(promptRows, null, 2), "utf8");
await fs.writeFile(path.join(outputDir, "prompts.jsonl"), promptRows.map((row) => jsonlLine(row, row.prompt)).join("\n") + "\n", "utf8");
await fs.writeFile(path.join(outputDir, "expected-files.txt"), promptRows.map((row) => `${row.iconKey}-card.png`).join("\n") + "\n", "utf8");

console.log(`Prepared ${promptRows.length} prompts in ${outputDir}`);
console.log("Manual/batch generation input:");
console.log(path.join(outputDir, "prompts.jsonl"));
