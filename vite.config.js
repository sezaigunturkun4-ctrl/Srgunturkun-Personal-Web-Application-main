// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// Use an explicit root and input so vite build always finds index.html
export default defineConfig(({ command, mode }) => ({
  root: path.resolve(__dirname),
  base: './', // use relative paths for portability when deploying to file systems
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3000,
    open: false
  },
  build: {
    outDir: 'dist',
    target: 'es2015',
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html')
    }
  }
}))