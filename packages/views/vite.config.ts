import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    dts({ include: ['src'] })
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'GardenViews',
      fileName: 'garden-views',
      formats: ['es']
    },
    rollupOptions: {
      external: ['lit', /^lit\//, /^@garden\//, /^@tauri-apps\//],
      output: {
        globals: {
          lit: 'Lit'
        }
      }
    },
    copyPublicDir: false
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});
