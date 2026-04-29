import path from "node:path";

import { loadSettings } from "./config.js";
import { renderPostcard, renderPreviewGrid } from "./renderer.js";

const settings = loadSettings({ requireToken: false });

const photoPath = path.join(settings.rootDir, "assets", "raw", "layout3_frame_sample");

for (const layoutKey of ["01", "02", "03", "04", "05", "06", "07", "08", "09"]) {
  const outputPath = path.join(settings.rootDir, "output", `preview_${layoutKey}.png`);
  await renderPostcard({
    photoPath,
    wish: "Стиль начинается с деталей: смелость сочетать",
    layoutKey,
    maxWishLength: settings.maxWishLength,
    outputPath,
  });
  console.log(`Rendered ${outputPath}`);
}

const gridPath = path.join(settings.rootDir, "output", "preview_grid.png");
await renderPreviewGrid({
  photoPath,
  wish: "Стиль начинается с деталей: смелость сочетать",
  maxWishLength: settings.maxWishLength,
  outputPath: gridPath,
});
console.log(`Rendered ${gridPath}`);
