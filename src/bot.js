import fs from "node:fs";
import path from "node:path";

import { loadSettings } from "./config.js";
import { getLayoutChoices } from "./layouts.js";
import { renderPostcard, renderPreviewGrid } from "./renderer.js";
import { TelegramApi } from "./telegram-api.js";

const settings = loadSettings();
const api = new TelegramApi(settings.telegramBotToken);
const sessions = new Map();
const tmpDir = path.join(settings.rootDir, "tmp");
const outputDir = path.join(settings.rootDir, "output");

await fs.promises.mkdir(tmpDir, { recursive: true });
await fs.promises.mkdir(outputDir, { recursive: true });

function getSession(chatId) {
  if (!sessions.has(chatId)) {
    sessions.set(chatId, { stage: "wish", wish: "", photoPath: "" });
  }
  return sessions.get(chatId);
}

function resetSession(chatId) {
  sessions.set(chatId, { stage: "wish", wish: "", photoPath: "" });
}

function buildLayoutKeyboard() {
  const choices = getLayoutChoices();
  return {
    inline_keyboard: [
      choices.slice(0, 3).map(({ key }) => ({ text: key, callback_data: `layout:${key}` })),
      choices.slice(3, 6).map(({ key }) => ({ text: key, callback_data: `layout:${key}` })),
      choices.slice(6, 9).map(({ key }) => ({ text: key, callback_data: `layout:${key}` })),
    ],
  };
}

async function sendMessage(chatId, text, extra = {}) {
  return api.call("sendMessage", {
    chat_id: chatId,
    text,
    ...extra,
  });
}

async function handleWish(chatId, text) {
  const wish = text.trim().replace(/\s+/g, " ");
  if (!wish) {
    await sendMessage(chatId, "Send the wish as a single message.");
    return;
  }

  if (wish.length > settings.maxWishLength) {
    await sendMessage(
      chatId,
      `The wish is too long. Maximum length is ${settings.maxWishLength} characters.`,
    );
    return;
  }

  const session = getSession(chatId);
  session.wish = wish;
  session.stage = "photo";
  await sendMessage(chatId, "Great. Now send the photo you want to place into the layout.");
}

async function handlePhoto(chatId, photos) {
  const largest = photos[photos.length - 1];
  const file = await api.call("getFile", { file_id: largest.file_id });
  const photoPath = path.join(tmpDir, `photo_${chatId}.jpg`);
  await api.downloadFile(file.file_path, photoPath);

  const session = getSession(chatId);
  session.photoPath = photoPath;
  session.stage = "layout";
  const previewPath = path.join(outputDir, `preview_${chatId}.png`);
  await renderPreviewGrid({
    photoPath,
    wish: session.wish,
    maxWishLength: settings.maxWishLength,
    outputPath: previewPath,
  });

  await api.call(
    "sendPhoto",
    {
      chat_id: chatId,
      caption: "Choose one of the 9 options.",
      reply_markup: JSON.stringify(buildLayoutKeyboard()),
    },
    { field: "photo", path: previewPath, filename: path.basename(previewPath) },
  );
}

async function handleLayout(chatId, layoutKey) {
  const session = getSession(chatId);
  if (!session.wish || !session.photoPath) {
    await sendMessage(chatId, "The session was lost. Press /start and begin again.");
    return;
  }

  const outputPath = path.join(outputDir, `postcard_${chatId}_${layoutKey}.png`);
  await renderPostcard({
    photoPath: session.photoPath,
    wish: session.wish,
    layoutKey,
    maxWishLength: settings.maxWishLength,
    outputPath,
  });

  await api.call(
    "sendPhoto",
    { chat_id: chatId, caption: "Done. If you want another version, press /start." },
    { field: "photo", path: outputPath, filename: path.basename(outputPath) },
  );

  resetSession(chatId);
}

async function handleMessage(message) {
  const chatId = message.chat.id;
  const text = message.text?.trim() ?? "";
  const session = getSession(chatId);

  if (text === "/start") {
    resetSession(chatId);
    await sendMessage(
      chatId,
      `Send a short wish for the postcard without emoji. Limit: ${settings.maxWishLength} characters.`,
    );
    return;
  }

  if (text === "/reset") {
    resetSession(chatId);
    await sendMessage(chatId, "The flow has been reset. Send a new wish.");
    return;
  }

  if (session.stage === "wish") {
    await handleWish(chatId, text);
    return;
  }

  if (session.stage === "photo") {
    if (!message.photo) {
      await sendMessage(chatId, "Now I need a photo. Send it as a regular photo.");
      return;
    }
    await handlePhoto(chatId, message.photo);
    return;
  }

  await sendMessage(chatId, "Choose a layout using the buttons under the previous message or start over with /start.");
}

async function handleCallback(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  await api.call("answerCallbackQuery", { callback_query_id: callbackQuery.id });

  if (!callbackQuery.data?.startsWith("layout:")) {
    return;
  }

  const layoutKey = callbackQuery.data.split(":")[1];
  try {
    await handleLayout(chatId, layoutKey);
  } catch (error) {
    console.error(error);
    await sendMessage(chatId, `I couldn't generate the postcard: ${error.message}`);
  }
}

async function run() {
  let offset;
  console.log("Bot started");

  while (true) {
    try {
      const updates = await api.call("getUpdates", {
        timeout: 30,
        ...(offset ? { offset } : {}),
      });

      for (const update of updates) {
        offset = update.update_id + 1;
        if (update.message) {
          await handleMessage(update.message);
        }
        if (update.callback_query) {
          await handleCallback(update.callback_query);
        }
      }
    } catch (error) {
      console.error("Polling error", error);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
