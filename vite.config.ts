import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vite.dev/config/
export default defineConfig({
  base: '/BustAGroove/', // GitHub Pages base path
  plugins: [svelte()],
  build: {
    rollupOptions: {
      input: {
        app: 'index.html',
        game: 'game.html'
      }
    }
  },
  server: {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  }
})
