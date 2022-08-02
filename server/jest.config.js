/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ['./src/test', './src/entrypoints'],
  modulePathIgnorePatterns: ['./dist', './src/tests'],
  setupFilesAfterEnv: ['./src/test/setupTestEnvironment.ts'],
}
