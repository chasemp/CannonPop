import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { copyFileSync, mkdirSync, existsSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Plugin to copy service worker to output
function copyServiceWorker() {
  return {
    name: 'copy-service-worker',
    closeBundle: async () => {
      const src = resolve(__dirname, 'src/sw.js')
      const dest = resolve(__dirname, 'docs/sw.js')
      
      if (existsSync(src)) {
        copyFileSync(src, dest)
        console.log('✅ Service worker copied to output directory')
      }
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte(), copyServiceWorker()],
  root: 'src',
  publicDir: '../public',
  base: './',
  build: {
    outDir: '../docs',
    emptyOutDir: true,
        rollupOptions: {
            input: {
                app: resolve(__dirname, 'src/index.html'),
                settings: resolve(__dirname, 'src/settings.html'),
                gamesettings: resolve(__dirname, 'src/gamesettings.html')
            }
        }
  },
  server: {
    port: 3002,        // Registered in PORT_REGISTRY.md
    host: '0.0.0.0',   // Allow network access
    strictPort: true   // Fail fast if port is taken (prevents conflicts)
  },
  preview: {
    port: 3003
  }
})
