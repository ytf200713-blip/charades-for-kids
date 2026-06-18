import path from "node:path";
import { dataDir, loadData } from "./lib.mjs";

const REQUIRED_CARD_FIELDS = ["title", "theme", "ageBand", "difficulty", "iconKey", "safetyTags"];
const VALID_AGE_BANDS = new Set(["4-6", "7-10", "all"]);
const VALID_DIFFICULTIES = new Set(["easy", "medium"]);
const REQUIRED_TAGS = new Set(["kids-safe", "family-safe"]);
const MAX_TITLE_LENGTH = 22;

function fail(message) {
  throw new Error(message);
}

export async function validateData() {
  const { decks, iconManifest } = await loadData();
  const icons = iconManifest.icons || {};

  if (!Array.isArray(decks.decks) || decks.decks.length !== 6) {
    fail(`Expected exactly 6 decks in ${path.join(dataDir, "decks.json")}.`);
  }

  const seenDeckIds = new Set();
  const errors = [];

  for (const deck of decks.decks) {
    if (!deck.id || !deck.name || !Array.isArray(deck.cards)) {
      errors.push(`Deck is missing id, name, or cards: ${JSON.stringify(deck)}`);
      continue;
    }

    if (seenDeckIds.has(deck.id)) {
      errors.push(`Duplicate deck id: ${deck.id}`);
    }
    seenDeckIds.add(deck.id);

    if (deck.cards.length !== 24) {
      errors.push(`${deck.name} must contain 24 cards; found ${deck.cards.length}.`);
    }

    const titles = new Set();
    for (const [index, card] of deck.cards.entries()) {
      const label = `${deck.name} card ${index + 1}`;

      for (const field of REQUIRED_CARD_FIELDS) {
        if (!(field in card)) {
          errors.push(`${label} is missing required field "${field}".`);
        }
      }

      if (typeof card.title !== "string" || !card.title.trim()) {
        errors.push(`${label} has an empty title.`);
      } else {
        const normalizedTitle = card.title.toLowerCase();
        if (titles.has(normalizedTitle)) {
          errors.push(`${deck.name} has duplicate card title: ${card.title}`);
        }
        titles.add(normalizedTitle);

        if (card.title.length > MAX_TITLE_LENGTH) {
          errors.push(`${label} title is too long for print: "${card.title}"`);
        }
      }

      if (!VALID_AGE_BANDS.has(card.ageBand)) {
        errors.push(`${label} has invalid ageBand: ${card.ageBand}`);
      }

      if (!VALID_DIFFICULTIES.has(card.difficulty)) {
        errors.push(`${label} has invalid difficulty: ${card.difficulty}`);
      }

      if (!icons[card.iconKey]) {
        errors.push(`${label} iconKey does not resolve: ${card.iconKey}`);
      }

      if (!Array.isArray(card.safetyTags)) {
        errors.push(`${label} safetyTags must be an array.`);
      } else {
        for (const tag of REQUIRED_TAGS) {
          if (!card.safetyTags.includes(tag)) {
            errors.push(`${label} is missing safety tag: ${tag}`);
          }
        }
      }
    }
  }

  if (errors.length) {
    fail(`Validation failed:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  }

  return {
    deckCount: decks.decks.length,
    cardCount: decks.decks.reduce((total, deck) => total + deck.cards.length, 0)
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await validateData();
  console.log(`Validated ${result.deckCount} decks and ${result.cardCount} cards.`);
}
