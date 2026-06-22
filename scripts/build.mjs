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
const SITE_TITLE = "Charades for Kids Printable Cards - Free Online Game and PDFs";
const SITE_DESCRIPTION = "Play charades for kids online or download 144 family-safe printable cards for classrooms, parties, and family game night.";
const SOCIAL_IMAGE = "og-image.jpg";
const GOOGLE_SITE_VERIFICATION = process.env.GOOGLE_SITE_VERIFICATION || "";
const GA_MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID || "";
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
      name: "Charades for Kids Online Game",
      url: absoluteUrl("#play"),
      applicationCategory: "GameApplication",
      operatingSystem: "Any",
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
        <p class="lead">Play family-safe charades online, or download printable cards with cartoon icons for classrooms, birthday parties, and family game night.</p>
        <div class="actions">
          <a class="button" href="#play" data-event="start_play_intent">Play Online</a>
          <a class="button secondary" href="#downloads" data-event="download_section_intent">Download Printable Cards</a>
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
      <h2 id="play-title">Play Online</h2>
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
          <button class="button" id="start-round" type="button">Start Round</button>
          <button class="button ghost" id="reset-game" type="button">Reset</button>
        </aside>

        <div class="play-area">
          <div class="round-top">
            <span id="round-label">Choose a deck, then start.</span>
            <span class="timer" id="timer-display">60</span>
          </div>
          <section class="play-card" id="play-card" aria-live="polite">
            <div class="play-icon" id="play-icon"><img src="${escapeHtml(SOCIAL_IMAGE)}" alt="Kids charades printable cards ready to play"></div>
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
      <p>This page includes both an online charades game and printable charades cards, so you can play from a phone or print a cut-out deck for screen-free activities.</p>
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
      <h2>Why This Charades Game Works</h2>
      <p>A good game of charades for kids needs prompts that children can understand quickly. The best cards use familiar words, clear actions, and simple objects, so players spend less time asking for help and more time acting, laughing, and guessing. That is why this printable set focuses on everyday themes instead of tricky movie titles, pop culture references, or jokes that only adults understand.</p>
      <p>Use charades for kids when you need a low-prep activity that still feels active and social. Parents can print a short deck before a playdate, teachers can use one theme as a five-minute classroom brain break, and party hosts can mix the full pack for a longer group game. The online version is useful when you do not have a printer nearby, while the printable PDFs are better when you want screen-free charades for kids around a table.</p>
    </section>

    <section>
      <h2>Common Questions</h2>
      <div class="steps faq">
        <div class="step"><strong>What ages is it for?</strong><br>Best for ages 4-10, with easy prompts and a few medium prompts for older kids.</div>
        <div class="step"><strong>Can I print it at home?</strong><br>Yes. Use US Letter paper and print at 100% scale for clean card cuts.</div>
        <div class="step"><strong>Is it family-safe?</strong><br>Yes. The prompts avoid adult, violent, scary, political, and brand-specific topics.</div>
      </div>
    </section>

    <footer>
      MVP note: this printable set uses curated child-safe prompts and original watercolor-style card art.
    </footer>
  </main>
${renderAnalyticsBody()}  <script src="assets/decks.js"></script>
  <script src="assets/game.js"></script>
</body>
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
</urlset>
`;

  await fs.writeFile(path.join(siteDir, "robots.txt"), robots, "utf8");
  await fs.writeFile(path.join(siteDir, "sitemap.xml"), sitemap, "utf8");
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
  await fs.writeFile(path.join(downloadDir, ".gitkeep"), "", "utf8");
  await writeSeoFiles();
  console.log(`Generated ${printFiles.length} print HTML files, site/index.html, robots.txt, and sitemap.xml.`);
}

await main();
