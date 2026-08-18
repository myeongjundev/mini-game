import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/mini-game/',
  build: { outDir: '../site', emptyOutDir: true },
})
