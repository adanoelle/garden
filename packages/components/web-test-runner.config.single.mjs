import { playwrightLauncher } from '@web/test-runner-playwright';
import { esbuildPlugin } from '@web/dev-server-esbuild';

export default {
  files: ['src/**/*.test.ts'],
  nodeResolve: true,
  plugins: [
    esbuildPlugin({
      ts: true,
      target: 'auto',
      tsconfig: './tsconfig.json',
    }),
  ],
  browsers: [playwrightLauncher({ product: 'chromium' })],
  coverage: false,
  testFramework: {
    config: {
      timeout: 5000,
    },
  },
  testRunnerHtml: (testFramework) => `
    <!DOCTYPE html>
    <html>
      <head>
        <link rel="stylesheet" href="/src/styles/tokens.css">
      </head>
      <body>
        <script type="module" src="${testFramework}"></script>
      </body>
    </html>
  `,
  watch: true,
};
