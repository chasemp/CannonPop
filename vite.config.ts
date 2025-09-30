import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vite.dev/config/
export default defineConfig({
  base: '/', // Root path for custom domain deployment
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
    port: 5174, // Use different port to avoid conflicts with other Vite projects
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  }
})
