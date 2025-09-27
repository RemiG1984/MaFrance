import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";
import fs from 'fs';

// Destructuring resolve function from the path module for Replit compatibility (not needed in VS Code)
const { resolve } = path;

// Generate stable build hash for cache busting - set once during build
const buildHash = process.env.BUILD_HASH || Date.now().toString()

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'inject-build-hash',
      generateBundle() {
        // Read service worker file
        const swPath = resolve(__dirname, '../public/sw.js')
        let swContent = fs.readFileSync(swPath, 'utf-8')

        // Replace BUILD_HASH placeholder with actual build hash
        swContent = swContent.replace(
          'const BUILD_HASH = self.BUILD_HASH || Date.now().toString();',
          `const BUILD_HASH = "${buildHash}";`
        )

        // Write to dist directory
        this.emitFile({
          type: 'asset',
          fileName: 'sw.js',
          source: swContent
        })
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  publicDir: '../public',
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
          vuetify: ['vuetify'],
          charts: ['chart.js']
        }
      }
    }
  },
  server: {
  host: true,  // Changed: Use 'true' for auto-detect (localhost on local, 0.0.0.0 on Replit/server)
  port: 5173,  // Changed: Use 5173 for local dev (matches README.md); Replit can override via env
  hmr: true,   // Keep: Enables Hot Module Replacement
  allowedHosts: [
    'localhost',  // Keep: For local testing
    '127.0.0.1', // Added: Explicit local IP for Windows
    'ccfbc9aa-5090-4af0-90de-762081b314b7-00-28xht4x6ewgrz.spock.replit.dev'  // Keep: Replit host
  ],
  fs: {
  allow: [
    // Allow serving files from the client directory (dynamic absolute path)
    path.resolve(__dirname),
    // Allow serving files from the project root (for shared assets if needed)
    path.resolve(__dirname, '..'),
    // Allow serving files from root node_modules (existing, already dynamic)
    path.resolve(__dirname, '../node_modules')
  ]
},
  proxy: {
    '/api': {
      target: 'http://localhost:3000',  // Changed: Use localhost for local backend (avoids 0.0.0.0 issues)
      changeOrigin: true
    }
  }
},
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    __BUILD_HASH__: JSON.stringify(buildHash),
    'window.__BUILD_HASH__': JSON.stringify(buildHash)
  },
});