
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  root: "client/src",
  build: {
    outDir: "../../public",
    emptyOutDir: true,
  },
});
