import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://www.newlifespring.org",
  output: "static",
  adapter: node({ mode: "standalone" }),
  trailingSlash: "always",
  vite: {
    plugins: [tailwindcss()],
  },
});
