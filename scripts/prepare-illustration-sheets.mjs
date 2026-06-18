import fs from "node:fs/promises";
import path from "node:path";
import { getAllCards, loadData, rootDir } from "./lib.mjs";
import { animalDescriptions } from "./card-prompt-lib.mjs";

const batchSize = 9;
const outDir = path.join(rootDir, "design-samples/illustration-sheets-vintage");

const actionDescriptions = {
  "brush-teeth": "friendly child brushing teeth with a toothbrush",
  cry: "friendly child pretending to cry, theatrical and not sad",
  build: "friendly child building with simple blocks",
  cook: "friendly child stirring a bowl with a spoon",
  clean: "friendly child sweeping with a broom",
  tiptoe: "friendly child tiptoeing quietly"
};

const foodDescriptions = {
  "ice-cream": "cheerful ice cream cone",
  pancakes: "small stack of pancakes with syrup",
  popcorn: "striped popcorn bucket with popcorn",
  sandwich: "simple triangular sandwich",
  watermelon: "bright watermelon slice",
  rice: "small bowl of rice",
  soup: "warm soup bowl with spoon",
  pretzel: "soft pretzel"
};

const jobDescriptions = {
  artist: "friendly artist holding a paintbrush and palette",
  astronaut: "friendly astronaut in a simple space suit",
  baker: "friendly baker holding bread",
  builder: "friendly builder with hard hat and tool belt",
  chef: "friendly chef with chef hat and spoon",
  dentist: "friendly dentist holding a toothbrush",
  doctor: "friendly doctor with stethoscope",
  farmer: "friendly farmer holding a small vegetable basket",
  firefighter: "friendly firefighter with helmet and hose",
  gardener: "friendly gardener holding a watering can",
  "hair-stylist": "friendly hair stylist holding a comb and scissors",
  "mail-carrier": "friendly mail carrier with satchel and envelope",
  musician: "friendly musician holding a guitar",
  pilot: "friendly pilot with cap",
  "police-officer": "friendly police officer with cap, non-threatening",
  scientist: "friendly scientist with goggles and beaker",
  teacher: "friendly teacher holding a book",
  veterinarian: "friendly veterinarian holding a small pet carrier",
  waiter: "friendly waiter carrying a tray",
  zookeeper: "friendly zookeeper holding a feed bucket",
  "bus-driver": "friendly bus driver with steering wheel cue",
  librarian: "friendly librarian holding books",
  mechanic: "friendly mechanic holding a wrench",
  nurse: "friendly nurse with simple medical badge"
};

const sportsDescriptions = {
  baseball: "baseball bat and ball with a friendly motion pose",
  basketball: "basketball with simple bounce motion marks",
  biking: "friendly child riding a bicycle",
  bowling: "bowling ball and pins",
  football: "american football with simple motion marks",
  gymnastics: "friendly child doing a simple gymnastics pose",
  hockey: "hockey stick and puck",
  "jump-rope": "friendly child jumping rope",
  karate: "friendly child in a simple karate pose",
  running: "friendly child running",
  skating: "friendly child ice skating",
  skiing: "friendly child skiing",
  soccer: "soccer ball with simple kick motion marks",
  softball: "softball bat and ball",
  swimming: "friendly child swimming with water waves",
  tennis: "tennis racket and ball",
  volleyball: "volleyball with hands reaching upward",
  yoga: "friendly child doing a simple yoga pose",
  golf: "golf club and ball on a tee",
  surfing: "friendly child surfing on a small wave",
  fishing: "fishing rod with a simple fish cue",
  "ping-pong": "ping-pong paddle and ball",
  sledding: "friendly child on a sled",
  dancing: "friendly child dancing"
};

const objectDescriptions = {
  "water-bottle": "simple reusable water bottle"
};

function titleToSubject(card) {
  const title = card.title.toLowerCase();
  if (card.deckId === "animals") return animalDescriptions[card.iconKey] || `friendly ${title}`;
  if (card.deckId === "actions") return actionDescriptions[card.iconKey] || `friendly child acting out ${title}`;
  if (card.deckId === "food") return foodDescriptions[card.iconKey] || `cheerful ${title}`;
  if (card.deckId === "jobs") return jobDescriptions[card.iconKey] || `friendly ${title}`;
  if (card.deckId === "sports") return sportsDescriptions[card.iconKey] || `friendly ${title} sports illustration`;
  if (card.deckId === "everyday-objects") return objectDescriptions[card.iconKey] || `simple friendly ${title}`;
  return `simple friendly ${title}`;
}

function sheetPrompt(sheet) {
  const cellLines = sheet.cells.map((cell, index) => {
    const row = Math.floor(index / 3) + 1;
    const col = (index % 3) + 1;
    return `- row ${row}, column ${col}: ${cell.title} - ${cell.subject}`;
  });

  return [
    "Use case: illustration-story",
    "Asset type: 3x3 source sheet for printable kids charades card illustrations.",
    "Primary request: Create one square image containing exactly nine separate kid-safe spot illustrations in a 3 by 3 grid.",
    "Style reference: Match the approved vintage children's card samples: soft imperfect black ink linework, watercolor/gouache fills, gentle expressions, simple readable shapes, subtle hand-drawn texture.",
    "Sheet layout: square canvas, three equal columns and three equal rows, light gray dashed crop guide lines around cells are allowed. One centered subject per cell.",
    "Safe area: make each subject smaller than usual, about 60-68% of its cell height and width. Leave generous empty paper margin around every subject and keep all artwork at least 10% of the cell away from dashed crop guide lines.",
    "Cell background: off-white vintage paper in every cell with one rounded watercolor/gouache color patch behind the subject. The patch colors should vary from cell to cell, using soft blue, sage green, warm yellow, muted teal, dusty pink, pale lavender, or muted peach. Do not make all cells the same background color.",
    "Avoid: no text, labels, numbers, logos, watermark, brand marks, hard rectangular frames, or heavy dividers. Do not let any subject, colored patch, or shadow touch the dashed crop guide lines.",
    "Cell order must be exact, left to right, top to bottom:",
    ...cellLines,
    "Important constraints: no copyrighted characters, no scary expressions, no violence. Keep all nine illustrations visually consistent as one set while allowing each cell to have its own soft background color."
  ].join("\n");
}

const { decks } = await loadData();
const cards = getAllCards(decks).map((card) => ({
  deckId: card.deckId,
  deckName: card.deckName,
  iconKey: card.iconKey,
  title: card.title,
  subject: titleToSubject(card)
}));

const sheets = [];
for (let index = 0; index < cards.length; index += batchSize) {
  const sheetNumber = Math.floor(index / batchSize) + 1;
  const cells = cards.slice(index, index + batchSize);
  sheets.push({
    id: `sheet-${String(sheetNumber).padStart(3, "0")}`,
    expectedFile: `sheet-${String(sheetNumber).padStart(3, "0")}.png`,
    cells
  });
}

await fs.mkdir(outDir, { recursive: true });

const promptRows = sheets.map((sheet) => ({
  id: sheet.id,
  expectedFile: sheet.expectedFile,
  prompt: sheetPrompt(sheet),
  cells: sheet.cells
}));

await fs.writeFile(path.join(outDir, "manifest.json"), JSON.stringify({ version: "0.1.0", sheets }, null, 2), "utf8");
await fs.writeFile(path.join(outDir, "prompts.json"), JSON.stringify(promptRows, null, 2), "utf8");
await fs.writeFile(
  path.join(outDir, "prompts.jsonl"),
  promptRows.map((row) => JSON.stringify({
    id: row.id,
    prompt: row.prompt,
    size: "1024x1024",
    quality: "high",
    output_format: "png"
  })).join("\n") + "\n",
  "utf8"
);
await fs.writeFile(path.join(outDir, "expected-files.txt"), sheets.map((sheet) => sheet.expectedFile).join("\n") + "\n", "utf8");

console.log(`Prepared ${sheets.length} illustration sheet prompts for ${cards.length} cards.`);
console.log(outDir);
