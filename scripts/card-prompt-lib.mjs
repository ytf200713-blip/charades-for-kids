export const vintageBackgrounds = [
  "muted green",
  "soft blue",
  "warm yellow",
  "pale sky blue",
  "sage green",
  "deep soft blue",
  "muted lavender",
  "teal",
  "dusty pink",
  "yellow-green",
  "powder blue",
  "muted peach"
];

export const animalDescriptions = {
  bear: "friendly sitting warm brown bear with rounded ears and visible paws",
  cat: "friendly sitting orange tabby cat with stripes and a curved tail",
  chicken: "friendly standing white chicken with red comb and yellow beak",
  cow: "friendly standing black-and-white cow",
  dog: "friendly sitting golden dog with floppy ears",
  duck: "friendly standing white duck with orange beak and feet",
  elephant: "friendly standing gray elephant with trunk visible",
  fish: "friendly orange fish with simple scales and bubbles",
  frog: "friendly sitting green frog",
  giraffe: "friendly standing giraffe with brown spots and small horns",
  horse: "friendly standing brown horse with mane and tail",
  kangaroo: "friendly sitting brown kangaroo with tail visible",
  lion: "friendly seated golden lion with mane",
  monkey: "friendly brown monkey sitting with a curled tail",
  mouse: "friendly small gray mouse with round ears",
  owl: "friendly brown owl perched on a small branch",
  penguin: "friendly standing black-and-white penguin with orange beak and feet",
  pig: "friendly standing pink pig with curly tail",
  rabbit: "friendly sitting gray rabbit with tall ears",
  sheep: "friendly fluffy white sheep standing calmly",
  tiger: "friendly orange tiger with black stripes",
  turtle: "friendly green turtle with patterned shell",
  whale: "friendly blue whale with water spray",
  zebra: "friendly standing zebra with black-and-white stripes"
};

export function buildVintageCardPrompt(card, index = 0) {
  const background = vintageBackgrounds[index % vintageBackgrounds.length];
  const subject = animalDescriptions[card.iconKey] || `friendly ${card.title.toLowerCase()} illustration`;

  return [
    "Use case: illustration-story",
    "Asset type: Single printable kids charades card.",
    `Primary request: Create one complete individual card for a children's charades deck with the word "${card.title}" printed on the card.`,
    "Style reference: Match the same visual system as the approved single-card samples: retro children's activity card, hand-drawn animal illustration, cream paper, soft imperfect black ink lines, watercolor/gouache fills, varied muted background color patch behind the animal. Do not copy any exact product layout, card system, packaging, numbering, or brand.",
    `Card layout: portrait card, off-white paper background, thin vintage dark border, large hand-drawn ${subject} centered in the upper 70% of the card, rounded ${background} watercolor background patch behind the animal, word label "${card.title}" near the bottom in a simple child-friendly hand-lettered style.`,
    "Illustration style: black slightly wobbly ink outline, gentle expression, kid-safe, vintage 1980s/1990s educational game card feel, subtle paper grain.",
    `Important constraints: One card only. No grid. No numbers. No extra words besides "${card.title}". No logos, watermark, brand marks, packaging, humans, scary expression, violence, or copyrighted characters. Keep generous margin so no part of the animal is cropped. Keep the border, illustration scale, and label placement consistent with the approved samples. Ensure the word is spelled exactly "${card.title}" and fits inside the card.`
  ].join("\n");
}
