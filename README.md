# Charades for Kids Printable Deck MVP

This is a no-AI validation package for printable kids charades cards.

## What It Builds

- Six curated kids decks:
  - Animals
  - Actions
  - Food
  - Jobs
  - Sports
  - Everyday Objects
- One US Letter printable PDF per deck
- One combined starter pack PDF
- One grayscale-friendly combined PDF
- A static download page

## Build

Use the Codex bundled Node runtime with `NODE_PATH` pointing to the bundled `node_modules`.

```bash
NODE_PATH=/Users/tengfeiyang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules /Users/tengfeiyang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/build.mjs
NODE_PATH=/Users/tengfeiyang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules /Users/tengfeiyang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/render-pdfs.mjs
NODE_PATH=/Users/tengfeiyang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules /Users/tengfeiyang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/verify.mjs
```

## Output

- Static site: `site/index.html`
- Print HTML: `site/print/*.html`
- PDFs: `site/downloads/*.pdf`

## Vintage 3x3 Illustration Sheet Workflow

For the 144-card vintage direction, use 3x3 illustration sheets. This reduces image-generation work from 144 single cards to 16 square source images. The generator only creates subject illustrations; code handles cropping, title spelling, border, background patch, and final card layout.

Prepare all 16 sheet prompts:

```bash
NODE_PATH=/Users/tengfeiyang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules /Users/tengfeiyang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/prepare-illustration-sheets.mjs
```

This writes:

```text
design-samples/illustration-sheets-vintage/manifest.json
design-samples/illustration-sheets-vintage/prompts.json
design-samples/illustration-sheets-vintage/prompts.jsonl
design-samples/illustration-sheets-vintage/expected-files.txt
```

Generate the 16 expected files named `sheet-001.png` through `sheet-016.png` into `design-samples/illustration-sheets-vintage/`. The prompt keeps each subject smaller inside its dashed cell, with varied rounded watercolor background patches.

After the sheets exist, crop them into square subject illustrations. The default crop removes a 20px outer edge from the full sheet and then crops every cell with a 10px inner inset, which helps avoid dashed guide lines:

```bash
NODE_PATH=/Users/tengfeiyang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules /Users/tengfeiyang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/crop-illustration-sheets.mjs
```

You can tune those margins:

```bash
NODE_PATH=/Users/tengfeiyang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules /Users/tengfeiyang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/crop-illustration-sheets.mjs --outer-inset 20 --inner-inset 10
```

Then compose full vintage card PNGs:

```bash
NODE_PATH=/Users/tengfeiyang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules /Users/tengfeiyang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/compose-vintage-cards.mjs
```

Both scripts also support safe test directories:

```bash
NODE_PATH=/Users/tengfeiyang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules /Users/tengfeiyang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/crop-illustration-sheets.mjs --source-dir /tmp/test-sheets --out-dir /tmp/test-illustrations
NODE_PATH=/Users/tengfeiyang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules /Users/tengfeiyang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/compose-vintage-cards.mjs animals --illustrations-dir /tmp/test-illustrations --out-dir /tmp/test-cards
```

Outputs:

```text
site/assets/illustrations/<deck>/<icon>.png
design-samples/generated-vintage-cards/<deck>/<icon>-card.png
```

## Vintage Single-Card Generation Workflow

This older workflow generates one full card per image. It is useful for style exploration, but it is slower and less stable for 144 final cards because text, border, and layout can drift.

Prepare prompts for one deck page:

```bash
NODE_PATH=/Users/tengfeiyang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules /Users/tengfeiyang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/prepare-card-generation.mjs animals 2
```

This writes:

```text
design-samples/single-card-vintage/animals-page-2/prompts.json
design-samples/single-card-vintage/animals-page-2/prompts.jsonl
design-samples/single-card-vintage/animals-page-2/expected-files.txt
```

If `OPENAI_API_KEY` is available, the JSONL can be passed to the image generation CLI:

```bash
/Users/tengfeiyang/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 \
  /Users/tengfeiyang/.codex/skills/.system/imagegen/scripts/image_gen.py generate-batch \
  --input design-samples/single-card-vintage/animals-page-2/prompts.jsonl \
  --out-dir design-samples/single-card-vintage/animals-page-2 \
  --model gpt-image-2 \
  --concurrency 3
```

After the expected `*-card.png` files exist, generate a review contact sheet:

```bash
NODE_PATH=/Users/tengfeiyang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules /Users/tengfeiyang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/normalize-card-batch.mjs animals page-2
NODE_PATH=/Users/tengfeiyang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules /Users/tengfeiyang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/make-card-contact-sheet.mjs animals page-2
```

## Asset Note

The MVP uses Unicode emoji glyphs as lightweight cartoon card art so the package can build offline. The icon manifest stores Fluent/Noto-compatible names so these can be replaced with downloaded Microsoft Fluent Emoji or Google Noto Emoji assets later.
