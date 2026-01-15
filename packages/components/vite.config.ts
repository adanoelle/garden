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
      name: 'GardenComponents',
      fileName: 'garden-components',
      formats: ['es']
    },
    rollupOptions: {
      external: ['lit', /^lit\//, /^@strudel/],
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
