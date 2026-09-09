import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Injected before any module loads so `src/config/env.ts` (which throws on
    // missing required vars) can be imported safely inside tests.
    env: {
      NODE_ENV: 'test',
      MONGO_URI: 'mongodb://127.0.0.1:27017/placeholder-replaced-by-memory-server',
      JWT_SECRET: 'test_jwt_secret',
      JWT_EXPIRES_IN: '1h',
      CLIENT_URL: 'http://localhost:5173',
      EMAIL_FROM: 'test@example.com',
      OTP_EXPIRES_MINUTES: '10',
      RESET_TOKEN_EXPIRES_MINUTES: '15',
      CLOUDINARY_CLOUD_NAME: 'test-cloud',
      CLOUDINARY_API_KEY: 'test-key',
      CLOUDINARY_API_SECRET: 'test-secret'
    },
    setupFiles: ['./tests/setup/mock-external-services.ts', './tests/setup/in-memory-database.ts'],
    testTimeout: 20000,
    // First run may download the mongod binary used by mongodb-memory-server.
    hookTimeout: 120000,
    restoreMocks: true
  }
});
