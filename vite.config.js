import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/expenses-pro/', // Crucial for GitHub Pages subfolder hosting
  server: {
    port: 3000,
    open: true
  }
})
