import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { ROOT_DIR } from "./config.js";

const FONT_DIR = path.join(ROOT_DIR, "assets", "fonts");
const FONTCONFIG_DIR = path.join(os.tmpdir(), "yangs-giving-day-fontconfig");
const FONTCONFIG_FILE = path.join(FONTCONFIG_DIR, "fonts.conf");

function escapeXmlAttribute(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function configureFontEnvironment() {
  fs.mkdirSync(FONTCONFIG_DIR, { recursive: true });
  fs.writeFileSync(
    FONTCONFIG_FILE,
    `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${escapeXmlAttribute(FONT_DIR)}</dir>
  <cachedir>${escapeXmlAttribute(FONTCONFIG_DIR)}</cachedir>
  <config></config>
</fontconfig>
`,
  );

  process.env.FONTCONFIG_FILE = FONTCONFIG_FILE;
  process.env.FONTCONFIG_PATH = FONTCONFIG_DIR;
}
