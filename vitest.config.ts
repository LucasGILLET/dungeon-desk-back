import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['dist/**', 'node_modules/**'],
    env: {
      AUTH0_AUDIENCE: 'https://test-audience.com',
      AUTH0_ISSUER: 'https://test-issuer.com/',
      JWT_SECRET: 'test-secret',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
      DIRECT_URL: 'postgresql://test:test@localhost:5432/test_db',
    },
  },
});
