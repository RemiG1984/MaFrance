import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";
import fs from 'fs';

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
      '@': resolve(__dirname, 'src')
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
  },
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    __BUILD_HASH__: JSON.stringify(buildHash),
    'window.__BUILD_HASH__': JSON.stringify(buildHash)
  },
});