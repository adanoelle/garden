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
  browsers: [
    playwrightLauncher({ product: 'chromium' }),
  ],
  coverage: true,
  coverageConfig: {
    reportDir: 'coverage',
    reporters: ['html', 'lcov', 'text-summary'],
    include: ['src/**/*.ts'],
    exclude: ['src/**/*.test.ts', 'src/index.ts'],
  },
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
};
