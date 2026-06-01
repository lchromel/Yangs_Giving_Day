import fs from "node:fs";
import path from "node:path";

import { ROOT_DIR } from "./config.js";
import { configureFontEnvironment } from "./fontconfig.js";
import {
  CANVAS_SIZE,
  CARD_RADIUS,
  LAYOUTS,
  LOGO_BOX,
  PREVIEW_CARD_SIZE,
  PREVIEW_GAP,
  PREVIEW_LABEL_HEIGHT,
  PREVIEW_LABEL_WIDTH,
  PREVIEW_PADDING,
  TEXT_FONT_SIZE,
  TEXT_LINE_HEIGHT,
} from "./layouts.js";

configureFontEnvironment();

const { default: sharp } = await import("sharp");

const TEXT_FONT_PATH = path.join(ROOT_DIR, "assets", "fonts", "YangoGroupText-Regular.ttf");
const PREVIEW_LABEL_FONT_PATH = path.join(
  ROOT_DIR,
  "assets",
  "fonts",
  "YangoHeadline-BlackItalic.ttf",
);
const TEXT_FONT_DATA_URL = fontDataUrl(TEXT_FONT_PATH);
const PREVIEW_LABEL_FONT_DATA_URL = fontDataUrl(PREVIEW_LABEL_FONT_PATH);
const FONT_FAMILY = "'Yango Group Text', 'Yango Text', 'Yandex Sans Text', 'SF Pro Display', sans-serif";
const PREVIEW_LABEL_FONT_FAMILY = "'Yango Headline', 'Helvetica Neue', sans-serif";
const TEXT_MAX_CHARS_PER_LINE = 28;
const EMOJI_PATTERN = /(?:[\u{1f1e6}-\u{1f1ff}]{2}|\p{Extended_Pictographic}(?:[\ufe0e\ufe0f])?(?:\u200d\p{Extended_Pictographic}(?:[\ufe0e\ufe0f])?)*)/gu;
const SPACE_WIDTH = 22;
const EMOJI_ASSET_DIR = path.join(ROOT_DIR, "assets", "emoji");
const EMOJI_CACHE_DIR = path.join(ROOT_DIR, "tmp", "emoji-cache");
const TWEMOJI_BASE_URL = "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg";

function fontDataUrl(fontPath) {
  const font = fs.readFileSync(fontPath).toString("base64");
  return `data:font/ttf;base64,${font}`;
}

function escapeXml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrapText(text) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= TEXT_MAX_CHARS_PER_LINE || !current) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines.slice(0, 3);
}

function splitEmojiRuns(line) {
  const runs = [];
  let lastIndex = 0;

  for (const match of line.matchAll(EMOJI_PATTERN)) {
    if (match.index > lastIndex) {
      runs.push({ type: "text", value: line.slice(lastIndex, match.index) });
    }
    runs.push({ type: "emoji", value: match[0] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < line.length) {
    runs.push({ type: "text", value: line.slice(lastIndex) });
  }

  return runs;
}

function emojiAssetKey(value) {
  return [...value.replaceAll("\ufe0e", "").replaceAll("\ufe0f", "")]
    .map((char) => char.codePointAt(0).toString(16))
    .join("-");
}

async function loadEmojiSvg(value) {
  const key = emojiAssetKey(value);
  const assetPath = path.join(EMOJI_ASSET_DIR, `${key}.svg`);
  const cachePath = path.join(EMOJI_CACHE_DIR, `${key}.svg`);

  try {
    return await fs.promises.readFile(assetPath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  try {
    return await fs.promises.readFile(cachePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  const response = await fetch(`${TWEMOJI_BASE_URL}/${key}.svg`);
  if (!response.ok) {
    throw new Error(`Cannot load emoji asset ${key}: ${response.status} ${response.statusText}`);
  }

  const svg = Buffer.from(await response.arrayBuffer());
  await fs.promises.mkdir(EMOJI_CACHE_DIR, { recursive: true });
  await fs.promises.writeFile(cachePath, svg);
  return svg;
}

async function renderEmojiRun(value) {
  const svg = await loadEmojiSvg(value);
  const rendered = await sharp(svg)
    .resize({ height: TEXT_FONT_SIZE, fit: "inside" })
    .png()
    .toBuffer({ resolveWithObject: true });
  return {
    input: rendered.data,
    width: rendered.info.width,
  };
}

async function renderTextRun({ value, type, color }) {
  const leadingSpaces = value.match(/^ */)?.[0].length ?? 0;
  const trailingSpaces = value.match(/ *$/)?.[0].length ?? 0;
  const trimmedValue = value.trim();
  const sideSpaceWidth = (leadingSpaces + trailingSpaces) * SPACE_WIDTH;

  if (!trimmedValue) {
    return { input: null, width: sideSpaceWidth };
  }

  if (type === "emoji") {
    try {
      const rendered = await renderEmojiRun(trimmedValue);
      return {
        input: rendered.input,
        width: rendered.width + sideSpaceWidth,
      };
    } catch (error) {
      console.warn(error.message);
      return { input: null, width: TEXT_FONT_SIZE + sideSpaceWidth };
    }
  }

  const fontSize = TEXT_FONT_SIZE;
  const estimatedWidth = Math.max(
    fontSize,
    Math.ceil([...trimmedValue].length * fontSize * 0.75),
  );
  const svgWidth = estimatedWidth + 32;
  const svgHeight = Math.max(TEXT_LINE_HEIGHT, fontSize) + 32;
  const escapedValue = escapeXml(trimmedValue);

  const fontFace = `
        @font-face {
          font-family: 'Yango Group Text';
          src: url('${TEXT_FONT_DATA_URL}') format('truetype');
          font-weight: 400;
          font-style: normal;
        }
      `;

  const svg = Buffer.from(`
    <svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg">
      <style>
        ${fontFace}

        text {
          font-family: ${FONT_FAMILY};
          font-size: ${fontSize}px;
          font-weight: 400;
          fill: ${color};
        }
      </style>
      <text x="16" y="${fontSize + 8}">${escapedValue}</text>
    </svg>
  `);

  const rendered = await sharp(svg).png().trim().toBuffer({ resolveWithObject: true });
  return {
    input: rendered.data,
    width: rendered.info.width + sideSpaceWidth,
  };
}

async function buildTextOverlay(text, color, textBox) {
  const lines = wrapText(text);
  const centerX = textBox.left + textBox.width / 2;
  const contentHeight =
    lines.length * TEXT_FONT_SIZE + Math.max(0, lines.length - 1) * (TEXT_LINE_HEIGHT - TEXT_FONT_SIZE);
  const firstLineY =
    textBox.top + Math.round((textBox.height - contentHeight) / 2) + TEXT_FONT_SIZE;
  const composites = [];

  for (const [lineIndex, line] of lines.entries()) {
    const runs = await Promise.all(
      splitEmojiRuns(line).map((run) => renderTextRun({ ...run, color })),
    );
    const lineWidth = runs.reduce((sum, run) => sum + run.width, 0);
    let left = Math.round(centerX - lineWidth / 2);
    const top = Math.round(firstLineY + lineIndex * TEXT_LINE_HEIGHT - TEXT_FONT_SIZE);

    for (const run of runs) {
      if (run.input) {
        composites.push({
          input: run.input,
          left,
          top,
        });
      }
      left += run.width;
    }
  }

  return sharp({
    create: {
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      channels: 4,
      background: "#00000000",
    },
  })
    .composite(composites)
    .png()
    .toBuffer();
}

function buildRoundedMask(size, radius) {
  return Buffer.from(`
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#ffffff" />
    </svg>
  `);
}

function buildBottomGradientOverlay() {
  return Buffer.from(`
    <svg width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" viewBox="0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="textFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#000000" stop-opacity="0" />
          <stop offset="62%" stop-color="#000000" stop-opacity="0" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0.34" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" fill="url(#textFade)" />
    </svg>
  `);
}

function buildPreviewOverlay() {
  const width =
    PREVIEW_PADDING * 2 +
    PREVIEW_LABEL_WIDTH * 3 +
    PREVIEW_CARD_SIZE * 3 +
    PREVIEW_GAP * 2;
  const height =
    PREVIEW_PADDING * 2 +
    PREVIEW_LABEL_HEIGHT * 3 +
    PREVIEW_CARD_SIZE * 3 +
    PREVIEW_GAP * 2;

  const labels = Object.keys(LAYOUTS)
    .map((key, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x =
        PREVIEW_PADDING + col * (PREVIEW_LABEL_WIDTH + PREVIEW_CARD_SIZE + PREVIEW_GAP);
      const y =
        PREVIEW_PADDING + row * (PREVIEW_LABEL_HEIGHT + PREVIEW_CARD_SIZE + PREVIEW_GAP) + 34;
      return `<text x="${x}" y="${y}">${key}</text>`;
    })
    .join("");

  return Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        @font-face {
          font-family: 'Yango Headline';
          src: url('${PREVIEW_LABEL_FONT_DATA_URL}') format('truetype');
          font-weight: 900;
          font-style: normal;
        }

        text {
          font-family: ${PREVIEW_LABEL_FONT_FAMILY};
          font-size: 40px;
          font-weight: 900;
          fill: #000000;
        }
      </style>
      ${labels}
    </svg>
  `);
}

function normalizeWish(wish, maxWishLength) {
  const cleaned = wish.trim().replace(/\s+/g, " ");
  if (!cleaned) {
    throw new Error("The wish cannot be empty.");
  }
  if (cleaned.length > maxWishLength) {
    throw new Error(`The wish is too long. Maximum length is ${maxWishLength} characters.`);
  }
  return cleaned;
}

async function placeOnCanvas(buffer, left, top) {
  const image = sharp(buffer);
  const meta = await image.metadata();
  const visibleLeft = Math.max(0, left);
  const visibleTop = Math.max(0, top);
  const visibleRight = Math.min(CANVAS_SIZE, left + meta.width);
  const visibleBottom = Math.min(CANVAS_SIZE, top + meta.height);

  if (visibleRight <= visibleLeft || visibleBottom <= visibleTop) {
    return null;
  }

  const extractLeft = Math.max(0, -left);
  const extractTop = Math.max(0, -top);
  const extractWidth = visibleRight - visibleLeft;
  const extractHeight = visibleBottom - visibleTop;

  return {
    input: await image
      .extract({
        left: extractLeft,
        top: extractTop,
        width: extractWidth,
        height: extractHeight,
      })
      .png()
      .toBuffer(),
    left: visibleLeft,
    top: visibleTop,
  };
}

async function applyCardMask(buffer) {
  return sharp(buffer)
    .composite([{ input: buildRoundedMask(CANVAS_SIZE, CARD_RADIUS), blend: "dest-in" }])
    .png()
    .toBuffer();
}

async function applyOpacity(buffer, opacity = 1) {
  if (opacity >= 1) {
    return buffer;
  }

  const { width, height } = await sharp(buffer).metadata();
  const opacityMask = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: opacity },
    },
  })
    .png()
    .toBuffer();

  return sharp(buffer)
    .ensureAlpha()
    .composite([{ input: opacityMask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

export async function renderPostcardBuffer({
  photoPath,
  wish,
  layoutKey,
  maxWishLength,
}) {
  const layout = LAYOUTS[layoutKey];
  if (!layout) {
    throw new Error(`Unknown layout: ${layoutKey}`);
  }

  const normalizedWish = normalizeWish(wish, maxWishLength);
  const photo = sharp(photoPath).rotate();
  const base = sharp({
    create: {
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      channels: 4,
      background: layout.background,
    },
  });

  const composites = [];
  composites.push(
    await placeOnCanvas(
      await photo
        .resize(layout.photoBox.width, layout.photoBox.height, { fit: "cover" })
        .png()
        .toBuffer(),
      layout.photoBox.left,
      layout.photoBox.top,
    ),
  );

  if (layout.photoMode === "cover") {
    composites.push(await placeOnCanvas(buildBottomGradientOverlay(), 0, 0));
  }

  for (const overlay of layout.overlays) {
    const overlayBuffer = await sharp(overlay.input)
      .resize(overlay.width, overlay.height)
      .png()
      .toBuffer();
    composites.push(
      await placeOnCanvas(
        await applyOpacity(overlayBuffer, overlay.opacity),
        overlay.left,
        overlay.top,
      ),
    );
  }

  composites.push(
    await placeOnCanvas(
      await sharp(layout.logo).resize(LOGO_BOX.width, LOGO_BOX.height).png().toBuffer(),
      LOGO_BOX.left,
      LOGO_BOX.top,
    ),
  );
  composites.push(
    await placeOnCanvas(
      await buildTextOverlay(normalizedWish, layout.textColor, layout.textBox),
      0,
      0,
    ),
  );

  const composed = await base.composite(composites.filter(Boolean)).png().toBuffer();
  return applyCardMask(composed);
}

export async function renderPostcard({
  photoPath,
  wish,
  layoutKey,
  maxWishLength,
  outputPath,
}) {
  const buffer = await renderPostcardBuffer({
    photoPath,
    wish,
    layoutKey,
    maxWishLength,
  });
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.promises.writeFile(outputPath, buffer);
  return outputPath;
}

export async function renderPreviewGrid({
  photoPath,
  wish,
  maxWishLength,
  outputPath,
}) {
  const previewWidth =
    PREVIEW_PADDING * 2 +
    PREVIEW_LABEL_WIDTH * 3 +
    PREVIEW_CARD_SIZE * 3 +
    PREVIEW_GAP * 2;
  const previewHeight =
    PREVIEW_PADDING * 2 +
    PREVIEW_LABEL_HEIGHT * 3 +
    PREVIEW_CARD_SIZE * 3 +
    PREVIEW_GAP * 2;

  const composites = [];
  const keys = Object.keys(LAYOUTS);

  for (const [index, key] of keys.entries()) {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const cardLeft =
      PREVIEW_PADDING +
      PREVIEW_LABEL_WIDTH +
      col * (PREVIEW_LABEL_WIDTH + PREVIEW_CARD_SIZE + PREVIEW_GAP);
    const cardTop =
      PREVIEW_PADDING +
      PREVIEW_LABEL_HEIGHT +
      row * (PREVIEW_LABEL_HEIGHT + PREVIEW_CARD_SIZE + PREVIEW_GAP);
    const cardBuffer = await renderPostcardBuffer({
      photoPath,
      wish,
      layoutKey: key,
      maxWishLength,
    });
    composites.push({
      input: await sharp(cardBuffer).resize(PREVIEW_CARD_SIZE, PREVIEW_CARD_SIZE).png().toBuffer(),
      left: cardLeft,
      top: cardTop,
    });
  }

  composites.push({
    input: buildPreviewOverlay(),
    left: 0,
    top: 0,
  });

  const preview = sharp({
    create: {
      width: previewWidth,
      height: previewHeight,
      channels: 4,
      background: "#ffffff",
    },
  }).composite(composites);

  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  await preview.png().toFile(outputPath);
  return outputPath;
}
