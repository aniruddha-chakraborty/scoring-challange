/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/integration.ts'],
  testTimeout: 60000,
  clearMocks: true
};
