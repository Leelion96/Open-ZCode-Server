import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/database.test.ts'],
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 20_000,
  },
});
