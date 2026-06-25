import fs from "node:fs/promises";
import path from "node:path";
import {
  assetsDir,
  chunk,
  downloadDir,
  ensureOutputDirs,
  escapeHtml,
  expectedPdfName,
  getAllCards,
  loadData,
  printDir,
  siteDir,
  slugify
} from "./lib.mjs";
import { validateData } from "./validate.mjs";

const CARD_PAGE_SIZE = 9;
const SITE_URL = (process.env.SITE_URL || "https://charades-for-kids.com").replace(/\/+$/g, "");
const SITE_TITLE = "Charades for Kids Generator - Free Printable Cards and Online Game";
const SITE_DESCRIPTION = "Use a free kids charades generator online or download 144 family-safe printable picture cards for classrooms, parties, homeschool, and family game night.";
const EDUCATORS_TITLE = "Free Printable Charades Cards for Teachers and Homeschool";
const EDUCATORS_DESCRIPTION = "Use 144 free printable charades cards for classroom brain breaks, homeschool movement activities, indoor recess, ESL speaking practice, and vocabulary review.";
const FAMILY_TITLE = "Indoor Charades Game for Kids - Free Printable Cards";
const FAMILY_DESCRIPTION = "Print free charades cards for a screen-free indoor game, rainy day activity, birthday party, playdate, or family game night with kids ages 4-10.";
const CREATIVE_COMMONS_LICENSE_NAME = "Creative Commons Attribution-NonCommercial 4.0 International";
const CREATIVE_COMMONS_LICENSE_SHORT = "CC BY-NC 4.0";
const CREATIVE_COMMONS_LICENSE_URL = "https://creativecommons.org/licenses/by-nc/4.0/";
const SOCIAL_IMAGE = "og-image.jpg";
const READY_IMAGE = "assets/cards/charades-ready-scene.jpg";
const GOOGLE_SITE_VERIFICATION = process.env.GOOGLE_SITE_VERIFICATION || "";
const GA_MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID || "G-1XHHX5ZVND";
const CLOUDFLARE_WEB_ANALYTICS_TOKEN = process.env.CLOUDFLARE_WEB_ANALYTICS_TOKEN || "";

async function attachIllustrations(decks) {
  const result = structuredClone(decks);
  let globalIndex = 0;
  for (const deck of result.decks) {
    for (const card of deck.cards) {
      const relativePath = `assets/illustrations/${deck.id}/${card.iconKey}.png`;
      const filePath = path.join(siteDir, relativePath);
      const cardBasePath = `assets/cards/${deck.id}/${String(globalIndex + 1).padStart(3, "0")}-${slugify(card.title)}-card`;
      const jpgCardRelativePath = `${cardBasePath}.jpg`;
      const pngCardRelativePath = `${cardBasePath}.png`;
      const grayCardRelativePath = `assets/cards-grayscale/${deck.id}/${String(globalIndex + 1).padStart(3, "0")}-${slugify(card.title)}-card.jpg`;
      const jpgCardFilePath = path.join(siteDir, jpgCardRelativePath);
      const pngCardFilePath = path.join(siteDir, pngCardRelativePath);
      const grayCardFilePath = path.join(siteDir, grayCardRelativePath);
      try {
        await fs.access(filePath);
        card.siteImageSrc = relativePath;
        card.printImageSrc = `../${relativePath}`;
      } catch {
        card.siteImageSrc = "";
        card.printImageSrc = "";
      }
      try {
        await fs.access(jpgCardFilePath);
        card.siteCardSrc = jpgCardRelativePath;
        card.printCardSrc = `../${jpgCardRelativePath}`;
      } catch {
        try {
          await fs.access(pngCardFilePath);
          card.siteCardSrc = pngCardRelativePath;
          card.printCardSrc = `../${pngCardRelativePath}`;
        } catch {
          card.siteCardSrc = "";
          card.printCardSrc = "";
        }
      }
      try {
        await fs.access(grayCardFilePath);
        card.siteGrayCardSrc = grayCardRelativePath;
        card.printGrayCardSrc = `../${grayCardRelativePath}`;
      } catch {
        card.siteGrayCardSrc = "";
        card.printGrayCardSrc = "";
      }
      globalIndex += 1;
    }
  }
  return result;
}

function renderPrintStyles({ grayscale = false } = {}) {
  return `
    @page { size: Letter; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #f6f7fb;
      color: #172033;
      font-family: Arial, Helvetica, sans-serif;
    }
    .sheet {
      width: 8.5in;
      height: 11in;
      page-break-after: always;
      background: #ffffff;
      padding: 0.24in 0.18in 0.2in;
      overflow: hidden;
      position: relative;
    }
    .cover {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: #fdfbf5;
      border: 0.12in solid #172033;
    }
    .cover h1 {
      margin: 0;
      font-size: 42px;
      line-height: 1.05;
      letter-spacing: 0;
      max-width: 6.8in;
    }
    .cover p, .cover li {
      font-size: 17px;
      line-height: 1.45;
    }
    .cover ul {
      margin: 0.18in 0 0;
      padding-left: 0.25in;
    }
    .cover .badge-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.1in;
      margin-top: 0.2in;
    }
    .badge {
      border: 2px solid #172033;
      border-radius: 999px;
      padding: 0.07in 0.14in;
      background: #ffffff;
      font-weight: 700;
      font-size: 13px;
    }
    .page-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 0.24in;
      margin-bottom: 0.04in;
      font-size: 14px;
      font-weight: 700;
      color: #465066;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-template-rows: repeat(3, 1fr);
      column-gap: 0.01in;
      row-gap: 0.04in;
      height: 10.28in;
    }
    .card {
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      min-width: 0;
      min-height: 0;
      break-inside: avoid;
    }
    .card-art {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: contain;
    }
    .icon {
      width: 1.18in;
      height: 1.18in;
      border-radius: 999px;
      background: rgba(255,255,255,0.88);
      border: 2px solid rgba(23,32,51,0.16);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 58px;
      line-height: 1;
      font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
    }
    .icon img {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
      border-radius: 999px;
    }
    .title {
      width: 100%;
      min-height: 0.52in;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 25px;
      line-height: 1.08;
      font-weight: 800;
      letter-spacing: 0;
      overflow-wrap: anywhere;
    }
    .meta {
      width: 100%;
      display: flex;
      justify-content: space-between;
      gap: 0.08in;
      font-size: 10px;
      color: #465066;
      text-transform: uppercase;
      font-weight: 700;
    }
    .license {
      font-size: 14px;
      line-height: 1.48;
      color: #2f384b;
    }
    .license h2 {
      margin: 0 0 0.2in;
      font-size: 28px;
      color: #172033;
    }
    .license code {
      font-family: Arial, Helvetica, sans-serif;
      font-weight: 700;
    }
    .sheet:last-child { page-break-after: auto; }
  `;
}

function renderCard(card, iconManifest, options = {}) {
  const imageSrc = options.grayscale && card.printGrayCardSrc ? card.printGrayCardSrc : card.printCardSrc;
  const icon = iconManifest.icons[card.iconKey];
  const art = imageSrc
    ? `<img class="card-art" src="${escapeHtml(imageSrc)}" alt="${escapeHtml(card.title)}">`
    : escapeHtml(icon);
  return `
    <article class="card">
      ${imageSrc ? art : `<div class="icon" aria-hidden="true">${art}</div><div class="title">${escapeHtml(card.title)}</div>`}
    </article>
  `;
}

function renderInstructionPage({ title, description, cardCount, deckNames }) {
  const badges = deckNames.map((name) => `<span class="badge">${escapeHtml(name)}</span>`).join("");
  return `
    <section class="sheet cover">
      <div>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(description)}</p>
        <div class="badge-row">${badges}</div>
      </div>
      <div>
        <p><strong>How to play</strong></p>
        <ul>
          <li>Print the cards on US Letter paper and cut along the dashed lines.</li>
          <li>Place the cards face down. One player draws a card and acts it out silently.</li>
          <li>Everyone else guesses. Set a 60-second timer for each turn.</li>
          <li>For younger kids, let a grown-up read the card quietly to the actor.</li>
        </ul>
      </div>
      <p><strong>${cardCount} cards</strong> included. Best for ages 4-10, family-safe play, classrooms, birthdays, and rainy-day activities.</p>
    </section>
  `;
}

function renderLicensePage() {
  return `
    <section class="sheet license">
      <h2>License and Safety Notes</h2>
      <p>This printable pack is a curated children&apos;s activity set. Cards avoid adult, violent, scary, political, and brand-specific prompts.</p>
      <p>The card art uses original watercolor-style illustrations composed into a consistent printable vintage card template.</p>
      <p>This resource is licensed under <code>${CREATIVE_COMMONS_LICENSE_SHORT}</code>: Creative Commons Attribution-NonCommercial 4.0 International. You may share and adapt it for non-commercial educational use with attribution to Charades for Kids.</p>
      <p>Print tip: use “Actual size” or “100% scale” in your printer dialog so the cut lines stay aligned.</p>
    </section>
  `;
}

function renderPrintDocument({ title, description, cards, deckNames, iconManifest, grayscale = false }) {
  const pages = chunk(cards, CARD_PAGE_SIZE);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>${escapeHtml(title)}</title>
  <style>${renderPrintStyles({ grayscale })}</style>
</head>
<body>
  ${renderInstructionPage({ title, description, cardCount: cards.length, deckNames })}
  ${pages.map((pageCards, index) => `
    <section class="sheet">
      <div class="page-title">
        <span>${escapeHtml(title)}</span>
        <span>Cards ${index * CARD_PAGE_SIZE + 1}-${Math.min((index + 1) * CARD_PAGE_SIZE, cards.length)}</span>
      </div>
      <div class="grid">
        ${pageCards.map((card) => renderCard(card, iconManifest, { grayscale })).join("")}
      </div>
    </section>
  `).join("")}
  ${renderLicensePage()}
</body>
</html>`;
}

function absoluteUrl(value = "") {
  if (!value) return SITE_URL;
  return `${SITE_URL}/${String(value).replace(/^\/+/g, "")}`;
}

function renderJsonLd(decks) {
  const allCards = getAllCards(decks);
  const deckNames = decks.decks.map((deck) => deck.name);
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Charades for Kids",
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      inLanguage: "en-US"
    },
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Charades for Kids Generator",
      alternateName: ["Kids Charades Generator", "Online Charades Generator for Kids", "Charades Word Generator for Kids"],
      url: absoluteUrl("#play"),
      applicationCategory: "GameApplication",
      operatingSystem: "Any",
      description: "A free online charades generator that randomly shows kid-friendly picture prompts from printable cards.",
      keywords: "charades generator, kids charades generator, charades word generator, printable charades cards, charades for kids",
      isFamilyFriendly: true,
      audience: {
        "@type": "PeopleAudience",
        suggestedMinAge: 4,
        suggestedMaxAge: 10
      },
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Kids Charades Printable Card Pack",
      image: absoluteUrl(SOCIAL_IMAGE),
      description: `A family-safe printable charades pack with ${allCards.length} cards across ${deckNames.join(", ")}.`,
      brand: {
        "@type": "Brand",
        name: "Charades for Kids"
      },
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        url: absoluteUrl("#downloads")
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Can I use this as a charades generator?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. The online game works as a free kids charades generator by randomly showing family-safe prompts from the printable card set."
          }
        },
        {
          "@type": "Question",
          name: "What ages are these charades cards for?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "The cards are designed for kids ages 4 to 10, with simple prompts for younger players and medium prompts for older kids."
          }
        },
        {
          "@type": "Question",
          name: "Can I print the cards at home?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. The downloadable PDFs are laid out for US Letter paper and should be printed at 100% scale."
          }
        },
        {
          "@type": "Question",
          name: "Are the prompts family-safe?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. The deck avoids adult, violent, scary, political, and brand-specific prompts."
          }
        }
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: "How to play charades with printable cards",
      description: "Print, cut, and play a family-safe kids charades game at home, in class, or at a party.",
      totalTime: "PT10M",
      supply: [
        {
          "@type": "HowToSupply",
          name: "Printable charades cards"
        },
        {
          "@type": "HowToSupply",
          name: "US Letter paper"
        }
      ],
      tool: [
        {
          "@type": "HowToTool",
          name: "Printer"
        },
        {
          "@type": "HowToTool",
          name: "Scissors"
        }
      ],
      step: [
        {
          "@type": "HowToStep",
          name: "Print the cards",
          text: "Download a PDF deck and print it on US Letter paper at 100% scale."
        },
        {
          "@type": "HowToStep",
          name: "Cut the cards",
          text: "Cut along the card edges, then place the cards face down in a pile."
        },
        {
          "@type": "HowToStep",
          name: "Act and guess",
          text: "One player draws a card and acts it out silently while everyone else guesses before the timer ends."
        }
      ]
    }
  ];
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function renderEducatorsJsonLd(decks) {
  const allCards = getAllCards(decks);
  const deckNames = decks.decks.map((deck) => deck.name);
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "LearningResource",
      name: "Free Printable Charades Cards for Kids",
      url: absoluteUrl("educators/"),
      description: EDUCATORS_DESCRIPTION,
      inLanguage: "en-US",
      learningResourceType: ["Activity", "Game", "Printable"],
      educationalUse: ["Brain break", "Indoor recess", "ESL speaking practice", "Vocabulary practice", "Homeschool activity"],
      audience: {
        "@type": "EducationalAudience",
        educationalRole: ["teacher", "parent", "student"]
      },
      typicalAgeRange: "4-10",
      isAccessibleForFree: true,
      license: CREATIVE_COMMONS_LICENSE_URL,
      provider: {
        "@type": "Organization",
        name: "Charades for Kids",
        url: SITE_URL
      },
      about: deckNames,
      teaches: [
        "Expressive communication",
        "Vocabulary recognition",
        "Nonverbal communication",
        "Turn taking",
        "Social interaction"
      ],
      hasPart: {
        "@type": "CreativeWork",
        name: "Kids Charades Starter Pack",
        url: absoluteUrl("downloads/kids-charades-starter-pack.pdf"),
        description: `A printable pack with ${allCards.length} family-safe picture cards across ${deckNames.join(", ")}.`
      }
    }
  ];
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function renderFamilyJsonLd(decks) {
  const allCards = getAllCards(decks);
  const deckNames = decks.decks.map((deck) => deck.name);
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      name: "Indoor Charades Game for Kids",
      url: absoluteUrl("indoor-charades-game-for-kids/"),
      description: FAMILY_DESCRIPTION,
      inLanguage: "en-US",
      isFamilyFriendly: true,
      isAccessibleForFree: true,
      license: CREATIVE_COMMONS_LICENSE_URL,
      audience: {
        "@type": "PeopleAudience",
        suggestedMinAge: 4,
        suggestedMaxAge: 10
      },
      about: ["indoor games for kids", "rainy day activities", "birthday party games", "family game night", ...deckNames],
      hasPart: {
        "@type": "CreativeWork",
        name: "Kids Charades Starter Pack",
        url: absoluteUrl("downloads/kids-charades-starter-pack.pdf"),
        description: `A free printable pack with ${allCards.length} family-safe picture cards.`
      },
      provider: {
        "@type": "Organization",
        name: "Charades for Kids",
        url: SITE_URL
      }
    }
  ];
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function renderVerificationMeta() {
  if (!GOOGLE_SITE_VERIFICATION) return "";
  return `  <meta name="google-site-verification" content="${escapeHtml(GOOGLE_SITE_VERIFICATION)}">\n`;
}

function renderAnalyticsHead() {
  if (!GA_MEASUREMENT_ID) return "";
  const escapedId = escapeHtml(GA_MEASUREMENT_ID);
  const jsonId = JSON.stringify(GA_MEASUREMENT_ID);
  return `  <script async src="https://www.googletagmanager.com/gtag/js?id=${escapedId}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', ${jsonId});
  </script>
`;
}

function renderAnalyticsBody() {
  if (!CLOUDFLARE_WEB_ANALYTICS_TOKEN) return "";
  const beacon = JSON.stringify({ token: CLOUDFLARE_WEB_ANALYTICS_TOKEN }).replace(/"/g, "&quot;");
  return `  <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon="${beacon}"></script>\n`;
}

function renderIndex(decks, iconManifest) {
  const combined = expectedPdfName("kids-charades-starter-pack");
  const grayscale = expectedPdfName("kids-charades-starter-pack", { grayscale: true });
  const previewCards = ["animals", "actions", "food", "jobs"]
    .map((deckId) => decks.decks.find((deck) => deck.id === deckId)?.cards[0])
    .filter(Boolean);
  const deckCards = decks.decks.map((deck) => {
    const pdfName = expectedPdfName(deck.id);
    return `
      <section class="deck-card">
        <div>
          <h3>${escapeHtml(deck.name)}</h3>
          <p>${escapeHtml(deck.description)}</p>
          <p class="meta">${deck.cards.length} cards • US Letter • family-safe</p>
        </div>
        <a class="button secondary" href="downloads/${pdfName}" data-event="category_download" data-deck="${escapeHtml(deck.id)}">Download ${escapeHtml(deck.name)}</a>
      </section>
    `;
  }).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(SITE_TITLE)}</title>
  <meta name="description" content="${escapeHtml(SITE_DESCRIPTION)}">
  <meta name="robots" content="index,follow">
${renderVerificationMeta()}  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/favicon-32x32.png" sizes="32x32" type="image/png">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="canonical" href="${escapeHtml(SITE_URL)}/">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Charades for Kids">
  <meta property="og:title" content="${escapeHtml(SITE_TITLE)}">
  <meta property="og:description" content="${escapeHtml(SITE_DESCRIPTION)}">
  <meta property="og:url" content="${escapeHtml(SITE_URL)}/">
  <meta property="og:image" content="${escapeHtml(absoluteUrl(SOCIAL_IMAGE))}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(SITE_TITLE)}">
  <meta name="twitter:description" content="${escapeHtml(SITE_DESCRIPTION)}">
  <meta name="twitter:image" content="${escapeHtml(absoluteUrl(SOCIAL_IMAGE))}">
  <meta name="theme-color" content="#fff8e7">
  <script type="application/ld+json">${renderJsonLd(decks)}</script>
${renderAnalyticsHead()}  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #25324a;
      background: #fff8e7;
      font-family: "Chalkboard SE", "Comic Sans MS", "Arial Rounded MT Bold", Arial, Helvetica, sans-serif;
      line-height: 1.5;
    }
    .wrap {
      max-width: 1060px;
      margin: 0 auto;
      padding: 32px 20px 56px;
    }
    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1.3fr) minmax(280px, 0.7fr);
      gap: 28px;
      align-items: center;
      margin-top: 16px;
      padding: 34px 0 30px;
      border-radius: 8px;
      background: transparent;
    }
    h1 {
      margin: 0;
      font-size: clamp(36px, 6vw, 64px);
      line-height: 0.98;
      letter-spacing: 0;
      color: #1e211c;
    }
    h2 {
      margin: 48px 0 16px;
      font-size: 28px;
      letter-spacing: 0;
      color: #25324a;
    }
    h3 {
      margin: 0 0 8px;
      font-size: 22px;
      letter-spacing: 0;
      color: #25324a;
    }
    p { margin: 0 0 16px; }
    .lead {
      margin-top: 18px;
      max-width: 680px;
      font-size: 19px;
      color: #36506d;
    }
    .preview {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      padding: 12px;
      border-radius: 8px;
      background: #fff4d6;
      transform: rotate(1deg);
    }
    .mini-card {
      aspect-ratio: 25 / 32;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 0;
    }
    .mini-card img {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: contain;
    }
    .mini-card span:first-child {
      font-size: 42px;
      font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 24px;
    }
    .download-actions {
      margin-bottom: 22px;
    }
    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 10px 16px;
      border: 2px solid #172033;
      border-radius: 8px;
      background: #224b78;
      color: #ffffff;
      text-decoration: none;
      font-family: inherit;
      font-weight: 800;
      box-shadow: 0 3px 0 #172033;
    }
    .button.secondary {
      background: #fff4d6;
      color: #25324a;
    }
    .button.ghost {
      background: #ffffff;
      color: #25324a;
    }
    .game-shell {
      display: grid;
      grid-template-columns: minmax(260px, 0.38fr) minmax(0, 0.62fr);
      gap: 18px;
      align-items: stretch;
      margin-top: 20px;
      padding: 18px;
      border: 2px solid #26334c;
      border-radius: 8px;
      background: #ffffff;
    }
    .game-controls {
      display: grid;
      gap: 14px;
      align-content: start;
    }
    .field {
      display: grid;
      gap: 6px;
    }
    label {
      font-weight: 800;
      color: #293244;
    }
    select {
      width: 100%;
      min-height: 44px;
      border: 2px solid #26334c;
      border-radius: 8px;
      padding: 8px 10px;
      background: #fffdf8;
      color: #25324a;
      font: inherit;
      font-weight: 700;
    }
    .timer-options {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .timer-options input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }
    .timer-options span {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 42px;
      border: 2px solid #26334c;
      border-radius: 8px;
      font-weight: 800;
      background: #fffdf8;
    }
    .timer-options input:checked + span {
      background: #ffcf5a;
      color: #25324a;
    }
    .score-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .score-box {
      border: 2px solid #26334c;
      border-radius: 8px;
      padding: 8px;
      text-align: center;
      background: #ffffff;
    }
    .score-box strong {
      display: block;
      font-size: 28px;
      line-height: 1;
    }
    .score-box span {
      color: #59657a;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
    }
    .play-area {
      display: grid;
      gap: 12px;
    }
    .round-top {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      color: #36506d;
      font-weight: 800;
    }
    .timer {
      min-width: 86px;
      text-align: right;
      font-size: 34px;
      line-height: 1;
      color: #224b78;
    }
    .play-card {
      min-height: clamp(500px, 68vh, 760px);
      border: 2px solid #26334c;
      border-radius: 8px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 18px;
      padding: 24px;
      text-align: center;
      touch-action: manipulation;
    }
    .play-icon {
      width: min(100%, 380px);
      aspect-ratio: 25 / 32;
      border: 0;
      border-radius: 0;
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
      font-size: 90px;
      line-height: 1;
      overflow: hidden;
    }
    .play-icon img {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: contain;
      border-radius: 0;
    }
    .play-card:not(.has-card) .play-icon {
      width: min(100%, 340px);
    }
    .play-card.has-card .play-title,
    .play-card.has-card .play-subtitle {
      display: none;
    }
    .play-title {
      max-width: 100%;
      font-size: clamp(44px, 8vw, 86px);
      line-height: 0.98;
      font-weight: 900;
      letter-spacing: 0;
      overflow-wrap: anywhere;
    }
    .play-subtitle {
      min-height: 28px;
      color: #59657a;
      font-weight: 800;
      text-transform: uppercase;
    }
    .play-actions {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    .play-actions .button {
      min-height: 58px;
      font-size: 18px;
      cursor: pointer;
    }
    .deck-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }
    .deck-card {
      display: flex;
      justify-content: space-between;
      gap: 18px;
      align-items: center;
      padding: 18px;
      border: 2px solid #26334c;
      border-radius: 8px;
      background: #ffffff;
    }
    .deck-card .button {
      width: 164px;
      flex: 0 0 164px;
      white-space: normal;
      text-align: center;
      line-height: 1.25;
    }
    .meta {
      color: #59657a;
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .steps {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
    }
    .step {
      border-left: 4px solid #ffcf5a;
      padding: 8px 0 8px 14px;
      background: #fffdf8;
    }
    footer {
      margin-top: 48px;
      padding-top: 24px;
      border-top: 2px solid #172033;
      color: #4a5363;
      font-size: 14px;
    }
    @media (max-width: 760px) {
      .hero, .deck-grid, .steps, .game-shell {
        grid-template-columns: 1fr;
      }
      .wrap {
        padding: 18px 14px 40px;
      }
      .hero {
        padding-top: 16px;
      }
      .deck-card {
        align-items: stretch;
        flex-direction: column;
      }
      .button {
        width: 100%;
      }
      .deck-card .button {
        width: 100%;
        flex-basis: auto;
      }
      .game-shell {
        padding: 12px;
      }
      .play-card {
        min-height: 520px;
        padding: 18px;
      }
      .play-icon {
        width: min(100%, 310px);
        font-size: 78px;
      }
      .play-actions {
        grid-template-columns: 1fr;
      }
    }
    @media (min-width: 761px) and (max-width: 1024px) {
      .game-shell {
        grid-template-columns: 0.34fr 0.66fr;
      }
      .play-card {
        min-height: 640px;
      }
    }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="hero">
      <div>
        <h1>Charades for Kids</h1>
        <p class="lead">Use a free kids charades generator online, or download printable picture cards for classrooms, birthday parties, homeschool breaks, and family game night.</p>
        <div class="actions">
          <a class="button" href="#play" data-event="start_play_intent">Play Online</a>
          <a class="button secondary" href="#downloads" data-event="download_section_intent">Download Printable Cards</a>
          <a class="button ghost" href="/indoor-charades-game-for-kids/" data-event="family_resource_intent">For Families</a>
          <a class="button ghost" href="/educators/" data-event="educator_resource_intent">For Teachers</a>
        </div>
      </div>
      <div class="preview" aria-label="Printable charades card examples">
        ${previewCards.map((card) => card.siteCardSrc
          ? `<div class="mini-card"><img src="${escapeHtml(card.siteCardSrc)}" alt="${escapeHtml(`Printable ${card.title.toLowerCase()} charades card for kids`)}" decoding="async"></div>`
          : `<div class="mini-card"><span>${escapeHtml(iconManifest.icons[card.iconKey])}</span><span>${escapeHtml(card.title)}</span></div>`
        ).join("")}
      </div>
    </section>

    <section id="play" aria-labelledby="play-title">
      <h2 id="play-title">Kids Charades Generator</h2>
      <p class="section-intro">Start a round to randomly generate kid-friendly charades prompts from the full picture-card set. You can filter by theme or age, use the timer for live play, or download the same prompts as printable PDF cards.</p>
      <div class="game-shell">
        <aside class="game-controls" aria-label="Game controls">
          <div class="field">
            <label for="deck-select">Deck</label>
            <select id="deck-select">
              <option value="all">All decks</option>
              ${decks.decks.map((deck) => `<option value="${escapeHtml(deck.id)}">${escapeHtml(deck.name)}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label for="age-select">Age</label>
            <select id="age-select">
              <option value="all">All ages</option>
              <option value="4-6">Ages 4-6</option>
              <option value="7-10">Ages 7-10</option>
            </select>
          </div>
          <div class="field">
            <label>Round Timer</label>
            <div class="timer-options">
              <label><input type="radio" name="timer" value="30"><span>30s</span></label>
              <label><input type="radio" name="timer" value="60" checked><span>60s</span></label>
              <label><input type="radio" name="timer" value="90"><span>90s</span></label>
            </div>
          </div>
          <div class="score-row" aria-live="polite">
            <div class="score-box"><strong id="score-correct">0</strong><span>Correct</span></div>
            <div class="score-box"><strong id="score-skipped">0</strong><span>Skipped</span></div>
            <div class="score-box"><strong id="cards-left">0</strong><span>Left</span></div>
          </div>
          <button class="button secondary" id="generate-card" type="button">Generate Card</button>
          <button class="button" id="start-round" type="button">Start Round</button>
          <button class="button ghost" id="reset-game" type="button">Reset</button>
        </aside>

        <div class="play-area">
          <div class="round-top">
            <span id="round-label">Choose a deck, then start.</span>
            <span class="timer" id="timer-display">60</span>
          </div>
          <section class="play-card" id="play-card" aria-live="polite">
            <div class="play-icon" id="play-icon"><img src="${escapeHtml(READY_IMAGE)}" alt="Kids charades printable cards ready to play"></div>
            <div class="play-title" id="play-title-text">Ready?</div>
            <div class="play-subtitle" id="play-subtitle">Tap Start Round</div>
          </section>
          <div class="play-actions">
            <button class="button secondary" id="skip-card" type="button">Skip</button>
            <button class="button" id="correct-card" type="button">Correct</button>
            <button class="button secondary" id="next-card" type="button">Next</button>
          </div>
        </div>
      </div>
    </section>

    <section id="downloads">
      <h2>Download by Theme</h2>
      <div class="actions download-actions">
        <a class="button" href="downloads/${combined}" data-event="pdf_download" data-pack="starter">Download Starter Pack</a>
        <a class="button secondary" href="downloads/${grayscale}" data-event="pdf_download" data-pack="starter-grayscale">Download Grayscale Pack</a>
      </div>
      <div class="deck-grid">${deckCards}</div>
    </section>

    <section>
      <h2>How to Use</h2>
      <div class="steps">
        <div class="step"><strong>1. Print</strong><br>Use US Letter paper at 100% scale.</div>
        <div class="step"><strong>2. Cut</strong><br>Follow the dashed lines to make cards.</div>
        <div class="step"><strong>3. Play</strong><br>Act silently while others guess in 60 seconds.</div>
      </div>
    </section>

    <section>
      <h2>What Are Charades for Kids?</h2>
      <p>Charades for kids is a simple acting and guessing game. One player picks a prompt, acts it out without speaking, and the rest of the group tries to guess the word before time runs out. It works well for young players because the rules are easy, the game uses movement, and adults can quietly help early readers.</p>
      <p>This page includes both an online charades generator and printable charades cards, so you can generate prompts from a phone or print a cut-out deck for screen-free activities.</p>
    </section>

    <section>
      <h2>How the Charades Generator Works</h2>
      <p>This charades for kids generator randomly draws from 144 picture-based prompts across Animals, Actions, Food, Jobs, Sports, and Everyday Objects. Unlike an open-ended word generator, every prompt is preselected to be kid-safe, easy to act out, and useful for ages 4-10.</p>
      <p>Use the generator when you want a quick no-print game. Use the PDF cards when you want a screen-free activity for homeschool groups, classroom centers, parties, or family game night.</p>
    </section>

    <section>
      <h2>Printable Charades Cards Included</h2>
      <p>This kids charades pack includes 144 printable cards across Animals, Actions, Food, Jobs, Sports, and Everyday Objects. Each deck is available as a separate PDF, plus one combined starter pack and a grayscale-friendly classroom version.</p>
      <p>The prompts are designed for ages 4-10 and avoid adult, violent, scary, political, and brand-specific topics. Use the full starter pack for family game night, or download one theme at a time for a shorter classroom warm-up, birthday party game, homeschool activity, or rainy-day activity.</p>
    </section>

    <section>
      <h2>Best Ways to Play</h2>
      <p>For younger kids, choose Animals, Food, or Everyday Objects and let a grown-up read the card quietly. For older kids, mix all decks together and use a 60-second timer. In classrooms, print the grayscale pack to save ink and split students into small teams so more children get a turn to act.</p>
    </section>

    <section>
      <h2>Indoor Charades for Families</h2>
      <p>Need a quick rainy day activity, birthday party game, playdate idea, or family game night that does not need screens? The family page shows how to use these printable picture cards as a simple indoor charades game for kids ages 4-10.</p>
      <a class="button secondary" href="/indoor-charades-game-for-kids/" data-event="family_resource_link">View Family Game Ideas</a>
    </section>

    <section>
      <h2>For Teachers and Homeschool</h2>
      <p>Teachers and homeschool parents can use this free printable charades resource for classroom brain breaks, indoor recess, ESL speaking practice, vocabulary review, and movement-based learning. The educator resource page includes learning goals, usage rights, age guidance, and direct PDF links for submitting or sharing the activity as an open educational resource.</p>
      <a class="button secondary" href="/educators/" data-event="educator_resource_link">View Educator Resource</a>
    </section>

    <section>
      <h2>Why This Charades Game Works</h2>
      <p>A good game of charades for kids needs prompts that children can understand quickly. The best cards use familiar words, clear actions, and simple objects, so players spend less time asking for help and more time acting, laughing, and guessing. That is why this printable set focuses on everyday themes instead of tricky movie titles, pop culture references, or jokes that only adults understand.</p>
      <p>Use charades for kids when you need a low-prep activity that still feels active and social. Parents can print a short deck before a playdate, teachers can use one theme as a five-minute classroom brain break, and party hosts can mix the full pack for a longer group game. The online version is useful when you do not have a printer nearby, while the printable PDFs are better when you want screen-free charades for kids around a table.</p>
    </section>

    <section>
      <h2>Common Questions</h2>
      <div class="steps faq">
        <div class="step"><strong>What ages is it for?</strong><br>Best for ages 4-10, with easy prompts and a few medium prompts for older kids.</div>
        <div class="step"><strong>Is this a charades generator?</strong><br>Yes. The online game randomly generates kid-friendly charades prompts from the printable picture-card set.</div>
        <div class="step"><strong>Can I print it at home?</strong><br>Yes. Use US Letter paper and print at 100% scale for clean card cuts.</div>
      </div>
    </section>

    <footer>
      MVP note: this Charades for Kids printable set uses curated child-safe prompts and original watercolor-style card art. Licensed under <a href="${escapeHtml(CREATIVE_COMMONS_LICENSE_URL)}">${escapeHtml(CREATIVE_COMMONS_LICENSE_SHORT)}</a> for non-commercial use with attribution.
    </footer>
  </main>
${renderAnalyticsBody()}  <script src="assets/decks.js"></script>
  <script src="assets/game.js"></script>
</body>
</html>`;
}

function renderEducatorsPage(decks) {
  const combined = expectedPdfName("kids-charades-starter-pack");
  const grayscale = expectedPdfName("kids-charades-starter-pack", { grayscale: true });
  const previewCards = ["animals", "actions", "food", "jobs", "sports", "everyday-objects"]
    .map((deckId) => decks.decks.find((deck) => deck.id === deckId)?.cards[0])
    .filter((card) => card?.siteCardSrc);
  const deckLinks = decks.decks.map((deck) => {
    const pdfName = expectedPdfName(deck.id);
    return `
      <article class="resource-card">
        <h3>${escapeHtml(deck.name)} Charades Cards</h3>
        <p>${escapeHtml(deck.description)} Includes ${deck.cards.length} printable cards.</p>
        <a href="/downloads/${escapeHtml(pdfName)}">Download ${escapeHtml(deck.name)} PDF</a>
      </article>
    `;
  }).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(EDUCATORS_TITLE)}</title>
  <meta name="description" content="${escapeHtml(EDUCATORS_DESCRIPTION)}">
  <meta name="robots" content="index,follow">
${renderVerificationMeta()}  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/favicon-32x32.png" sizes="32x32" type="image/png">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="canonical" href="${escapeHtml(SITE_URL)}/educators/">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Charades for Kids">
  <meta property="og:title" content="${escapeHtml(EDUCATORS_TITLE)}">
  <meta property="og:description" content="${escapeHtml(EDUCATORS_DESCRIPTION)}">
  <meta property="og:url" content="${escapeHtml(SITE_URL)}/educators/">
  <meta property="og:image" content="${escapeHtml(absoluteUrl(SOCIAL_IMAGE))}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(EDUCATORS_TITLE)}">
  <meta name="twitter:description" content="${escapeHtml(EDUCATORS_DESCRIPTION)}">
  <meta name="twitter:image" content="${escapeHtml(absoluteUrl(SOCIAL_IMAGE))}">
  <meta name="theme-color" content="#fff8e7">
  <script type="application/ld+json">${renderEducatorsJsonLd(decks)}</script>
${renderAnalyticsHead()}  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #25324a;
      background: #fff8e7;
      font-family: "Chalkboard SE", "Comic Sans MS", "Arial Rounded MT Bold", Arial, Helvetica, sans-serif;
      line-height: 1.55;
    }
    .wrap {
      max-width: 1020px;
      margin: 0 auto;
      padding: 32px 20px 56px;
    }
    .nav {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: center;
      margin-bottom: 34px;
      font-weight: 800;
    }
    .nav a {
      color: #224b78;
      text-decoration: none;
    }
    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 280px;
      gap: 28px;
      align-items: start;
      padding-bottom: 26px;
      border-bottom: 2px solid #172033;
    }
    h1 {
      margin: 0;
      max-width: 780px;
      font-size: clamp(36px, 5vw, 58px);
      line-height: 1;
      letter-spacing: 0;
      color: #1e211c;
    }
    h2 {
      margin: 42px 0 14px;
      font-size: 28px;
      letter-spacing: 0;
      color: #25324a;
    }
    h3 {
      margin: 0 0 8px;
      font-size: 21px;
      letter-spacing: 0;
      color: #25324a;
    }
    p { margin: 0 0 16px; }
    ul {
      margin: 0;
      padding-left: 22px;
    }
    li { margin-bottom: 8px; }
    .lead {
      margin-top: 18px;
      max-width: 720px;
      font-size: 19px;
      color: #36506d;
    }
    .summary-card {
      border: 2px solid #26334c;
      border-radius: 8px;
      padding: 18px;
      background: #ffffff;
      box-shadow: 0 3px 0 #172033;
    }
    .summary-card dl {
      display: grid;
      gap: 10px;
      margin: 0;
    }
    .summary-card dt {
      font-size: 13px;
      font-weight: 800;
      color: #59657a;
      text-transform: uppercase;
    }
    .summary-card dd {
      margin: 0;
      font-weight: 800;
    }
    .card-preview-row {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 12px;
      margin-top: 22px;
    }
    .preview-card {
      min-width: 0;
      padding: 8px;
      border: 2px solid #26334c;
      border-radius: 8px;
      background: #ffffff;
      box-shadow: 0 3px 0 #172033;
    }
    .preview-card img {
      display: block;
      width: 100%;
      height: auto;
      aspect-ratio: 25 / 32;
      object-fit: contain;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 24px;
    }
    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 10px 16px;
      border: 2px solid #172033;
      border-radius: 8px;
      background: #224b78;
      color: #ffffff;
      text-decoration: none;
      font-family: inherit;
      font-weight: 800;
      box-shadow: 0 3px 0 #172033;
    }
    .button.secondary {
      background: #fff4d6;
      color: #25324a;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }
    .three-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
    }
    .resource-card,
    .note {
      border: 2px solid #26334c;
      border-radius: 8px;
      padding: 18px;
      background: #ffffff;
    }
    .resource-card a,
    .note a {
      color: #224b78;
      font-weight: 800;
    }
    .badge-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }
    .badge {
      border: 2px solid #172033;
      border-radius: 999px;
      padding: 6px 10px;
      background: #ffffff;
      font-size: 13px;
      font-weight: 800;
    }
    .license-box {
      border-left: 5px solid #ffcf5a;
      padding: 16px 18px;
      background: #fffdf8;
    }
    footer {
      margin-top: 48px;
      padding-top: 24px;
      border-top: 2px solid #172033;
      color: #4a5363;
      font-size: 14px;
    }
    @media (max-width: 760px) {
      .wrap {
        padding: 20px 14px 42px;
      }
      .hero,
      .grid,
      .three-grid {
        grid-template-columns: 1fr;
      }
      .card-preview-row {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
      }
      .preview-card {
        padding: 5px;
      }
      .nav {
        align-items: flex-start;
        flex-direction: column;
      }
      .button {
        width: 100%;
      }
    }
  </style>
</head>
<body>
  <main class="wrap">
    <nav class="nav" aria-label="Site navigation">
      <a href="/">Charades for Kids</a>
      <a href="/#downloads">Printable PDFs</a>
    </nav>

    <section class="hero">
      <div>
        <h1>Free Printable Charades Cards for Teachers and Homeschool</h1>
        <p class="lead">Use these free printable charades cards as a low-prep classroom game, homeschool movement break, indoor recess activity, ESL speaking practice, or vocabulary review game for children ages 4-10.</p>
        <div class="actions">
          <a class="button" href="/downloads/${escapeHtml(combined)}">Download Starter Pack</a>
          <a class="button secondary" href="/#play">Play Online</a>
        </div>
      </div>
      <aside class="summary-card" aria-label="Resource summary">
        <dl>
          <div>
            <dt>Resource type</dt>
            <dd>Printable activity, game</dd>
          </div>
          <div>
            <dt>Age range</dt>
            <dd>4-10</dd>
          </div>
          <div>
            <dt>Cards included</dt>
            <dd>144 picture cards</dd>
          </div>
          <div>
            <dt>Access</dt>
            <dd>Free, no account required</dd>
          </div>
        </dl>
      </aside>
    </section>

    <section aria-label="Printable charades card examples">
      <div class="card-preview-row">
        ${previewCards.map((card) => `
          <div class="preview-card">
            <img src="/${escapeHtml(card.siteCardSrc)}" alt="${escapeHtml(`Printable ${card.title.toLowerCase()} charades card for kids`)}" loading="lazy" decoding="async">
          </div>
        `).join("")}
      </div>
    </section>

    <section>
      <h2>Educational Use</h2>
      <p>This Charades for Kids resource supports movement-based learning, expressive communication, vocabulary recognition, turn taking, and social interaction. One child draws a card, acts out the prompt without speaking, and classmates or family members guess the word before the timer ends.</p>
      <p>The activity works well when students need a short break from seatwork but still benefit from structured speaking, listening, and group participation. Teachers can use one theme for a five-minute classroom brain break, combine several themes for indoor recess, or choose familiar picture prompts for ESL learners and early readers.</p>
      <div class="three-grid">
        <div class="note"><strong>Classroom brain breaks</strong><br>Use a small deck between lessons to reset attention through movement and guessing.</div>
        <div class="note"><strong>ESL speaking practice</strong><br>Use picture cards to reinforce familiar nouns, actions, jobs, sports, and everyday objects.</div>
        <div class="note"><strong>Homeschool activities</strong><br>Print one theme at a time for screen-free family learning, movement, and vocabulary review.</div>
      </div>
    </section>

    <section>
      <h2>Learning Goals</h2>
      <ul>
        <li>Practice expressive and nonverbal communication by acting out simple prompts.</li>
        <li>Build vocabulary around animals, actions, food, jobs, sports, and everyday objects.</li>
        <li>Encourage turn taking, observation, listening, and cooperative group play.</li>
        <li>Support movement-based learning during classroom transitions, indoor recess, or homeschool breaks.</li>
        <li>Give early readers and English learners visual prompts that reduce reading pressure.</li>
      </ul>
    </section>

    <section>
      <h2>What Is Included</h2>
      <p>The full starter pack includes 144 family-safe picture cards across six themes. Each card uses a clear word and child-friendly illustration so children can understand the prompt quickly. The prompts avoid adult, violent, scary, political, and brand-specific topics.</p>
      <div class="actions">
        <a class="button" href="/downloads/${escapeHtml(combined)}">Download Full Starter Pack</a>
        <a class="button secondary" href="/downloads/${escapeHtml(grayscale)}">Download Grayscale Pack</a>
      </div>
      <div class="grid" style="margin-top: 18px;">${deckLinks}</div>
    </section>

    <section id="usage-rights">
      <h2>Usage Rights</h2>
      <div class="license-box">
        <p><strong>This resource is licensed under ${escapeHtml(CREATIVE_COMMONS_LICENSE_SHORT)}.</strong> The full license name is ${escapeHtml(CREATIVE_COMMONS_LICENSE_NAME)}.</p>
        <p>You may share, print, copy, and adapt these charades cards for personal, classroom, homeschool, library, and other non-commercial educational activities, as long as you give attribution to Charades for Kids and link back to the source when sharing online.</p>
        <p>You may not sell the cards, place them behind a paid download, include them in a commercial bundle, or use the artwork in a paid product without separate permission.</p>
        <p>License URL: <a href="${escapeHtml(CREATIVE_COMMONS_LICENSE_URL)}">${escapeHtml(CREATIVE_COMMONS_LICENSE_URL)}</a></p>
      </div>
    </section>

    <section>
      <h2>Suggested Citation</h2>
      <p>Charades for Kids. <em>Free Printable Charades Cards for Kids</em>. Available at <a href="${escapeHtml(SITE_URL)}/educators/">${escapeHtml(SITE_URL)}/educators/</a>.</p>
      <div class="badge-row" aria-label="Resource tags">
        <span class="badge">charades for kids</span>
        <span class="badge">printable games</span>
        <span class="badge">classroom games</span>
        <span class="badge">brain breaks</span>
        <span class="badge">indoor recess</span>
        <span class="badge">ESL games</span>
        <span class="badge">homeschool activities</span>
        <span class="badge">vocabulary practice</span>
      </div>
    </section>

    <footer>
      <p>Charades for Kids provides free printable charades cards and an online game for classrooms, homeschool families, parties, and family game night.</p>
    </footer>
  </main>
${renderAnalyticsBody()}</body>
</html>`;
}

function renderFamilyPage(decks) {
  const combined = expectedPdfName("kids-charades-starter-pack");
  const grayscale = expectedPdfName("kids-charades-starter-pack", { grayscale: true });
  const previewCards = ["animals", "actions", "food", "jobs", "sports", "everyday-objects"]
    .map((deckId) => decks.decks.find((deck) => deck.id === deckId)?.cards[0])
    .filter((card) => card?.siteCardSrc);
  const deckCards = decks.decks.map((deck) => {
    const pdfName = expectedPdfName(deck.id);
    return `
      <article class="resource-card">
        <h3>${escapeHtml(deck.name)} Charades</h3>
        <p>${escapeHtml(deck.description)} Includes ${deck.cards.length} kid-friendly picture cards.</p>
        <a href="/downloads/${escapeHtml(pdfName)}">Download ${escapeHtml(deck.name)} Cards</a>
      </article>
    `;
  }).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(FAMILY_TITLE)}</title>
  <meta name="description" content="${escapeHtml(FAMILY_DESCRIPTION)}">
  <meta name="robots" content="index,follow">
${renderVerificationMeta()}  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/favicon-32x32.png" sizes="32x32" type="image/png">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="canonical" href="${escapeHtml(SITE_URL)}/indoor-charades-game-for-kids/">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Charades for Kids">
  <meta property="og:title" content="${escapeHtml(FAMILY_TITLE)}">
  <meta property="og:description" content="${escapeHtml(FAMILY_DESCRIPTION)}">
  <meta property="og:url" content="${escapeHtml(SITE_URL)}/indoor-charades-game-for-kids/">
  <meta property="og:image" content="${escapeHtml(absoluteUrl(SOCIAL_IMAGE))}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(FAMILY_TITLE)}">
  <meta name="twitter:description" content="${escapeHtml(FAMILY_DESCRIPTION)}">
  <meta name="twitter:image" content="${escapeHtml(absoluteUrl(SOCIAL_IMAGE))}">
  <meta name="theme-color" content="#fff8e7">
  <script type="application/ld+json">${renderFamilyJsonLd(decks)}</script>
${renderAnalyticsHead()}  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #25324a;
      background: #fff8e7;
      font-family: "Chalkboard SE", "Comic Sans MS", "Arial Rounded MT Bold", Arial, Helvetica, sans-serif;
      line-height: 1.55;
    }
    .wrap {
      max-width: 1040px;
      margin: 0 auto;
      padding: 32px 20px 56px;
    }
    .nav {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: center;
      margin-bottom: 34px;
      font-weight: 800;
    }
    .nav a {
      color: #224b78;
      text-decoration: none;
    }
    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(260px, 0.42fr);
      gap: 28px;
      align-items: center;
      padding-bottom: 26px;
      border-bottom: 2px solid #172033;
    }
    h1 {
      margin: 0;
      max-width: 760px;
      font-size: clamp(36px, 5vw, 58px);
      line-height: 1;
      letter-spacing: 0;
      color: #1e211c;
    }
    h2 {
      margin: 42px 0 14px;
      font-size: 28px;
      letter-spacing: 0;
      color: #25324a;
    }
    h3 {
      margin: 0 0 8px;
      font-size: 21px;
      letter-spacing: 0;
      color: #25324a;
    }
    p { margin: 0 0 16px; }
    ul {
      margin: 0;
      padding-left: 22px;
    }
    li { margin-bottom: 8px; }
    .lead {
      margin-top: 18px;
      max-width: 720px;
      font-size: 19px;
      color: #36506d;
    }
    .hero-card {
      transform: rotate(1deg);
      padding: 12px;
      border: 2px solid #26334c;
      border-radius: 8px;
      background: #ffffff;
      box-shadow: 0 3px 0 #172033;
    }
    .hero-card img {
      display: block;
      width: 100%;
      height: auto;
      aspect-ratio: 25 / 32;
      object-fit: contain;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 24px;
    }
    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 10px 16px;
      border: 2px solid #172033;
      border-radius: 8px;
      background: #224b78;
      color: #ffffff;
      text-decoration: none;
      font-family: inherit;
      font-weight: 800;
      box-shadow: 0 3px 0 #172033;
    }
    .button.secondary {
      background: #fff4d6;
      color: #25324a;
    }
    .preview-row {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 12px;
      margin-top: 22px;
    }
    .preview-card,
    .resource-card,
    .note {
      min-width: 0;
      border: 2px solid #26334c;
      border-radius: 8px;
      background: #ffffff;
    }
    .preview-card {
      padding: 8px;
      box-shadow: 0 3px 0 #172033;
    }
    .preview-card img {
      display: block;
      width: 100%;
      height: auto;
      aspect-ratio: 25 / 32;
      object-fit: contain;
    }
    .three-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
    }
    .deck-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
      margin-top: 18px;
    }
    .resource-card,
    .note {
      padding: 18px;
    }
    .resource-card a {
      color: #224b78;
      font-weight: 800;
    }
    .license-box {
      border-left: 5px solid #ffcf5a;
      padding: 16px 18px;
      background: #fffdf8;
    }
    footer {
      margin-top: 48px;
      padding-top: 24px;
      border-top: 2px solid #172033;
      color: #4a5363;
      font-size: 14px;
    }
    @media (max-width: 760px) {
      .wrap {
        padding: 20px 14px 42px;
      }
      .hero,
      .three-grid,
      .deck-grid {
        grid-template-columns: 1fr;
      }
      .preview-row {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
      }
      .preview-card {
        padding: 5px;
      }
      .button {
        width: 100%;
      }
      .nav {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  </style>
</head>
<body>
  <main class="wrap">
    <nav class="nav" aria-label="Site navigation">
      <a href="/">Charades for Kids</a>
      <a href="/#downloads">Printable PDFs</a>
    </nav>

    <section class="hero">
      <div>
        <h1>Indoor Charades Game for Kids</h1>
        <p class="lead">Print free picture cards for a screen-free indoor game that works for rainy days, birthday parties, playdates, family game night, and quick after-dinner fun.</p>
        <div class="actions">
          <a class="button" href="/downloads/${escapeHtml(combined)}">Download Free Cards</a>
          <a class="button secondary" href="/#play">Play Online</a>
        </div>
      </div>
      ${previewCards[0] ? `
        <div class="hero-card">
          <img src="/${escapeHtml(previewCards[0].siteCardSrc)}" alt="${escapeHtml(`Printable ${previewCards[0].title.toLowerCase()} charades card for kids`)}" decoding="async">
        </div>
      ` : ""}
    </section>

    <section aria-label="Printable charades card examples">
      <div class="preview-row">
        ${previewCards.map((card) => `
          <div class="preview-card">
            <img src="/${escapeHtml(card.siteCardSrc)}" alt="${escapeHtml(`Printable ${card.title.toLowerCase()} charades card for kids`)}" loading="lazy" decoding="async">
          </div>
        `).join("")}
      </div>
    </section>

    <section>
      <h2>A Screen-Free Indoor Game for Kids</h2>
      <p>Charades is a simple acting and guessing game that gets kids moving without needing toys, screens, or a long setup. One player draws a card, acts out the prompt silently, and everyone else tries to guess the word before the timer runs out.</p>
      <p>This printable charades game is designed for children ages 4-10. The cards use familiar animals, actions, food, jobs, sports, and everyday objects, so younger kids can understand the prompts quickly and older kids can still make the acting funny.</p>
    </section>

    <section>
      <h2>When to Use These Charades Cards</h2>
      <div class="three-grid">
        <div class="note"><strong>Rainy day activity</strong><br>Print a short deck when kids need movement but outdoor play is not an option.</div>
        <div class="note"><strong>Birthday party game</strong><br>Mix all decks together for a simple party activity that works with mixed ages.</div>
        <div class="note"><strong>Family game night</strong><br>Use the starter pack after dinner for a quick game that young kids can join.</div>
      </div>
    </section>

    <section>
      <h2>How to Play</h2>
      <ul>
        <li>Download and print the starter pack or choose one theme deck.</li>
        <li>Cut out the cards and place them face down in a pile.</li>
        <li>One child picks a card and acts it out without talking.</li>
        <li>Everyone else guesses the word. Use a 60-second timer for each turn.</li>
        <li>For younger kids, let an adult quietly read the card before they act.</li>
      </ul>
    </section>

    <section>
      <h2>Download Printable Charades Cards</h2>
      <p>The full starter pack includes 144 family-safe picture cards. You can print the full pack for a longer game, use the grayscale version to save ink, or download one theme at a time for a shorter play session.</p>
      <div class="actions">
        <a class="button" href="/downloads/${escapeHtml(combined)}">Download Starter Pack</a>
        <a class="button secondary" href="/downloads/${escapeHtml(grayscale)}">Download Grayscale Pack</a>
      </div>
      <div class="deck-grid">${deckCards}</div>
    </section>

    <section>
      <h2>Why Families Like This Game</h2>
      <p>This indoor charades game is easy to explain, quick to start, and flexible for different ages. Kids can play in teams, act one card at a time, or choose a theme such as animals or food. The picture cards also help early readers join without feeling stuck on tricky words.</p>
      <p>The prompts avoid adult, scary, violent, political, and brand-specific topics. The goal is a clean, family-safe game that parents can print once and reuse for playdates, sleepovers, classroom parties, rainy afternoons, and family gatherings.</p>
    </section>

    <section>
      <h2>Usage Rights</h2>
      <div class="license-box">
        <p><strong>This resource is licensed under ${escapeHtml(CREATIVE_COMMONS_LICENSE_SHORT)}.</strong> You may share, print, copy, and adapt these cards for personal, family, classroom, homeschool, library, and other non-commercial activities with attribution to Charades for Kids.</p>
        <p>License URL: <a href="${escapeHtml(CREATIVE_COMMONS_LICENSE_URL)}">${escapeHtml(CREATIVE_COMMONS_LICENSE_URL)}</a></p>
      </div>
    </section>

    <footer>
      <p>Charades for Kids provides free printable charades cards and an online game for screen-free family play, classrooms, parties, and rainy days.</p>
    </footer>
  </main>
${renderAnalyticsBody()}</body>
</html>`;
}

async function writePrintHtml(decks, iconManifest) {
  const printFiles = [];
  const allCards = getAllCards(decks);
  const allDeckNames = decks.decks.map((deck) => deck.name);

  const combinedHtml = renderPrintDocument({
    title: "Kids Charades Starter Pack",
    description: "A printable family-safe starter pack with animals, actions, food, jobs, sports, and everyday objects.",
    cards: allCards,
    deckNames: allDeckNames,
    iconManifest
  });
  const combinedPath = path.join(printDir, "kids-charades-starter-pack.html");
  await fs.writeFile(combinedPath, combinedHtml, "utf8");
  printFiles.push({ id: "kids-charades-starter-pack", htmlPath: combinedPath, pdfName: expectedPdfName("kids-charades-starter-pack") });

  const grayscaleHtml = renderPrintDocument({
    title: "Kids Charades Starter Pack",
    description: "A grayscale-friendly printable starter pack for lower-ink classroom or home printing.",
    cards: allCards,
    deckNames: allDeckNames,
    iconManifest,
    grayscale: true
  });
  const grayscalePath = path.join(printDir, "kids-charades-starter-pack-grayscale.html");
  await fs.writeFile(grayscalePath, grayscaleHtml, "utf8");
  printFiles.push({
    id: "kids-charades-starter-pack-grayscale",
    htmlPath: grayscalePath,
    pdfName: expectedPdfName("kids-charades-starter-pack", { grayscale: true })
  });

  for (const deck of decks.decks) {
    const html = renderPrintDocument({
      title: `${deck.name} Charades for Kids`,
      description: deck.description,
      cards: deck.cards,
      deckNames: [deck.name],
      iconManifest
    });
    const htmlPath = path.join(printDir, `${deck.id}.html`);
    await fs.writeFile(htmlPath, html, "utf8");
    printFiles.push({ id: deck.id, htmlPath, pdfName: expectedPdfName(deck.id) });
  }

  await fs.writeFile(path.join(printDir, "manifest.json"), JSON.stringify(printFiles, null, 2), "utf8");
  return printFiles;
}

async function writeSeoFiles() {
  const robots = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /print/",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    ""
  ].join("\n");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${escapeHtml(SITE_URL)}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${escapeHtml(SITE_URL)}/educators/</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${escapeHtml(SITE_URL)}/indoor-charades-game-for-kids/</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
`;

  const llms = `# Charades for Kids

Charades for Kids is a free family-safe resource for kids ages 4-10. It provides an online kids charades generator and downloadable printable picture-card PDFs.

## Core Pages

- Home and online charades generator: ${SITE_URL}/
- Family indoor game guide: ${SITE_URL}/indoor-charades-game-for-kids/
- Teacher and homeschool resource: ${SITE_URL}/educators/

## What the Site Offers

- 144 printable charades picture cards
- Six prompt themes: Animals, Actions, Food, Jobs, Sports, and Everyday Objects
- Free online charades generator for random kid-safe prompts
- US Letter PDF downloads, including a grayscale pack for lower-ink printing
- Non-commercial educational sharing under ${CREATIVE_COMMONS_LICENSE_SHORT}

## Best-Fit Uses

- Homeschool movement breaks
- Classroom brain breaks and indoor recess
- ESL speaking and vocabulary practice
- Birthday party games
- Rainy day indoor activities
- Family game night
`;

  await fs.writeFile(path.join(siteDir, "robots.txt"), robots, "utf8");
  await fs.writeFile(path.join(siteDir, "sitemap.xml"), sitemap, "utf8");
  await fs.writeFile(path.join(siteDir, "llms.txt"), llms, "utf8");
}

async function main() {
  await validateData();
  await ensureOutputDirs();
  const { decks: rawDecks, iconManifest } = await loadData();
  const decks = await attachIllustrations(rawDecks);
  const printFiles = await writePrintHtml(decks, iconManifest);
  const gameDecks = decks.decks.map((deck) => ({
    id: deck.id,
    name: deck.name,
    cards: deck.cards.map((card) => ({
      ...card,
      imageSrc: card.siteCardSrc || card.siteImageSrc,
      cardImageSrc: card.siteCardSrc,
      icon: iconManifest.icons[card.iconKey]
    }))
  }));
  await fs.writeFile(
    path.join(assetsDir, "decks.js"),
    `window.CHARADES_DATA = ${JSON.stringify({ decks: gameDecks }, null, 2)};\n`,
    "utf8"
  );
  await fs.writeFile(path.join(siteDir, "index.html"), renderIndex(decks, iconManifest), "utf8");
  const educatorsDir = path.join(siteDir, "educators");
  await fs.mkdir(educatorsDir, { recursive: true });
  await fs.writeFile(path.join(educatorsDir, "index.html"), renderEducatorsPage(decks), "utf8");
  const familyDir = path.join(siteDir, "indoor-charades-game-for-kids");
  await fs.mkdir(familyDir, { recursive: true });
  await fs.writeFile(path.join(familyDir, "index.html"), renderFamilyPage(decks), "utf8");
  await fs.writeFile(path.join(downloadDir, ".gitkeep"), "", "utf8");
  await writeSeoFiles();
  console.log(`Generated ${printFiles.length} print HTML files, site/index.html, resource pages, robots.txt, and sitemap.xml.`);
}

await main();
