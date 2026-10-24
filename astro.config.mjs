// @ts-check
import { defineConfig } from "astro/config";

// 全ページを静的HTMLとして書き出す（Cloudflare の adapter は不要）
export default defineConfig({
  site: "https://seventh-well.com",
  output: "static",
  trailingSlash: "ignore",
  build: { format: "directory" },
});
