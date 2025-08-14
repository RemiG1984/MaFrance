import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  publicDir: '../public',
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    hmr: true, // Ensure HMR is enabled
    allowedHosts: [
      'ccfbc9aa-5090-4af0-90de-762081b314b7-00-28xht4x6ewgrz.spock.replit.dev', // Add the Replit host
      'localhost', // Optional: include for local testing
    ],
    fs: {
      allow: [
        // Allow serving files from the client directory
        '/home/runner/workspace/client',
        // Allow serving files from node_modules for dependencies like @mdi/font
        '/home/runner/workspace/node_modules'
      ]
    },
    proxy: {
      '/api': {
        target: 'http://0.0.0.0:3000',
        changeOrigin: true
      }
    }
  }
});
