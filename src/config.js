import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ROOT_DIR = path.resolve(__dirname, "..");

function loadDotEnv() {
  const envPath = path.join(ROOT_DIR, ".env");
  if (!fs.existsSync(envPath)) {
    return {};
  }

  const env = {};
  const content = fs.readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) {
      continue;
    }
    const [key, ...rest] = line.split("=");
    env[key.trim()] = rest.join("=").trim().replace(/^['"]|['"]$/g, "");
  }
  return env;
}

function loadDesktopTokens() {
  const tokensPath = path.join(process.env.HOME || "", "Desktop", "tokens.txt");
  if (!tokensPath || !fs.existsSync(tokensPath)) {
    return {};
  }

  const tokens = {};
  const content = fs.readFileSync(tokensPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) {
      continue;
    }
    const [key, ...rest] = line.split("=");
    tokens[key.trim()] = rest.join("=").trim().replace(/^['"]|['"]$/g, "");
  }
  return tokens;
}

export function loadSettings({ requireToken = true } = {}) {
  const dotenv = loadDotEnv();
  const desktopTokens = loadDesktopTokens();
  const read = (key, fallback = "") =>
    process.env[key] || dotenv[key] || desktopTokens[key] || fallback;

  const telegramBotToken = read("TELEGRAM_BOT_TOKEN");
  if (requireToken && !telegramBotToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is missing. Add it to .env or ~/Desktop/tokens.txt before запуск.");
  }

  return {
    telegramBotToken,
    maxWishLength: Number.parseInt(read("MAX_WISH_LENGTH", "45"), 10),
    rootDir: ROOT_DIR,
  };
}
