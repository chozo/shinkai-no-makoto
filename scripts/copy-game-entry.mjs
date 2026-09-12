import { copyFile } from "node:fs/promises";

await copyFile(
  "dist/shinkai-no-makoto/index.html",
  "dist/shinkai-no-makoto/play.html"
);
