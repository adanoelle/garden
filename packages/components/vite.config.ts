import { defineConfig, Plugin } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';
import { copyFileSync, mkdirSync } from 'fs';

// Plugin to copy tokens.css to dist
function copyTokens(): Plugin {
  return {
    name: 'copy-tokens',
    closeBundle() {
      const src = resolve(__dirname, 'src/styles/tokens.css');
      const dest = resolve(__dirname, 'dist/styles/tokens.css');
      mkdirSync(resolve(__dirname, 'dist/styles'), { recursive: true });
      copyFileSync(src, dest);
    }
  };
}

export default defineConfig({
  plugins: [
    dts({ include: ['src'] }),
    copyTokens()
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'GardenComponents',
      fileName: 'garden-components',
      formats: ['es']
    },
    rollupOptions: {
      external: ['lit', /^lit\//, /^@strudel/, /^@garden\//, /^@tauri-apps\//],
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
