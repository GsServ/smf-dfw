import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base stays '/' for Cloudflare Pages. Do not set it to a repo name —
// that is only needed for GitHub Pages, and it breaks CSS/JS paths here.
export default defineConfig({
  base: '/',
  plugins: [react()],
})
