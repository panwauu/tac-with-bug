/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ["./src/test"],
  modulePathIgnorePatterns: ["./dist"],
  setupFilesAfterEnv: ['./src/test/setupTestEnvironment.ts']
};
