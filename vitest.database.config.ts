import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/database.test.ts', 'tests/announcements.database.test.ts'],
    testTimeout: 15_000,
    hookTimeout: 20_000,
  },
});
