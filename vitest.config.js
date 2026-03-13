import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,playwright}.config.*',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'styles/',
        'e2e/',
        '**/*.config.js',
        '**/firebase-config.js',
      ],
    },
  },
  resolve: {
    alias: {
      'https://cdn.jsdelivr.net/npm/marked@12.0.0/lib/marked.esm.js': 'marked',
      'https://cdn.jsdelivr.net/npm/dompurify@3.0.8/dist/purify.es.mjs': 'dompurify',
    },
  },
});
