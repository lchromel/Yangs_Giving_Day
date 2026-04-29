import path from "node:path";

import { ROOT_DIR } from "./config.js";

export const CANVAS_SIZE = 1000;
export const CARD_RADIUS = 40;
export const LOGO_BOX = { left: 295, top: 50, width: 408, height: 75 };
export const FRAME_PHOTO_BOX = { left: 138, top: 180, width: 724, height: 583 };
export const FULL_TEXT_BOX = { left: 55, top: 820, width: 890, height: 140 };
export const FRAME_TEXT_BOX = { left: 55, top: 804, width: 890, height: 156 };
export const TEXT_FONT_SIZE = 66;
export const TEXT_LINE_HEIGHT = 74;
export const PREVIEW_CARD_SIZE = 320;
export const PREVIEW_GAP = 58;
export const PREVIEW_LABEL_WIDTH = 54;
export const PREVIEW_LABEL_HEIGHT = 50;
export const PREVIEW_PADDING = 34;

const raw = (...parts) => path.join(ROOT_DIR, "assets", "raw", ...parts);

function fullBleedLayout({
  key,
  title,
  background,
  textColor,
  logo,
  overlays = [],
}) {
  return {
    key,
    title,
    background,
    textColor,
    logo,
    photoMode: "cover",
    photoBox: { left: 0, top: 0, width: CANVAS_SIZE, height: CANVAS_SIZE },
    textBox: FULL_TEXT_BOX,
    overlays,
  };
}

function framedLayout({
  key,
  title,
  background,
  textColor,
  logo,
  overlays = [],
}) {
  return {
    key,
    title,
    background,
    textColor,
    logo,
    photoMode: "frame",
    photoBox: FRAME_PHOTO_BOX,
    textBox: FRAME_TEXT_BOX,
    overlays,
  };
}

export const LAYOUTS = {
  "01": fullBleedLayout({
    key: "01",
    title: "Blue multicolor mark",
    background: "#3f9fff",
    textColor: "#ffffff",
    logo: raw("layout_01_logo"),
    overlays: [
      { input: raw("layout_01_overlay"), left: 262, top: 287, width: 475, height: 426 },
    ],
  }),
  "02": fullBleedLayout({
    key: "02",
    title: "Blue red heart",
    background: "#3f9fff",
    textColor: "#ffffff",
    logo: raw("layout_02_logo"),
    overlays: [
      { input: raw("layout_02_overlay"), left: 279, top: 290, width: 459, height: 404 },
    ],
  }),
  "03": fullBleedLayout({
    key: "03",
    title: "Blue green flower",
    background: "#3f9fff",
    textColor: "#ffffff",
    logo: raw("layout_03_logo"),
    overlays: [
      { input: raw("layout_03_overlay"), left: 217, top: 217, width: 565, height: 565 },
    ],
  }),
  "04": framedLayout({
    key: "04",
    title: "Cream red feather",
    background: "#ffebe5",
    textColor: "#dd2825",
    logo: raw("layout_04_logo"),
    overlays: [
      { input: raw("layout_04_overlay"), left: 182, top: 190, width: 636, height: 560 },
    ],
  }),
  "05": framedLayout({
    key: "05",
    title: "Mint blue feather",
    background: "#e5fdff",
    textColor: "#3f9fff",
    logo: raw("layout_05_logo"),
    overlays: [
      { input: raw("layout_05_overlay"), left: 182, top: 190, width: 636, height: 560 },
    ],
  }),
  "06": framedLayout({
    key: "06",
    title: "Lime green feather",
    background: "#d2ffb7",
    textColor: "#18876e",
    logo: raw("layout_06_logo"),
    overlays: [
      { input: raw("layout_06_overlay"), left: 182, top: 190, width: 636, height: 560 },
    ],
  }),
  "07": framedLayout({
    key: "07",
    title: "Red clean frame",
    background: "#dd2825",
    textColor: "#ffffff",
    logo: raw("layout_07_logo"),
    overlays: [],
  }),
  "08": fullBleedLayout({
    key: "08",
    title: "Blue clover",
    background: "#3f9fff",
    textColor: "#ffffff",
    logo: raw("layout_08_logo"),
    overlays: [
      { input: raw("layout_08_overlay"), left: 261, top: 235, width: 478, height: 517 },
    ],
  }),
  "09": fullBleedLayout({
    key: "09",
    title: "Blue yellow flame",
    background: "#3f9fff",
    textColor: "#ffffff",
    logo: raw("layout_09_logo"),
    overlays: [
      { input: raw("layout_09_overlay_custom.svg"), left: 207, top: 184, width: 586, height: 619 },
    ],
  }),
};

export function getLayoutChoices() {
  return Object.values(LAYOUTS).map(({ key, title }) => ({ key, title }));
}
