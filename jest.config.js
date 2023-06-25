/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  projects: [
    {
      displayName: "Browser tests",
      preset: "ts-jest",
      testEnvironment: "jsdom",
      setupFilesAfterEnv: ["jest-extended"],
    },
    {
      displayName: "Node tests",
      preset: "ts-jest",
      testEnvironment: "node",
      setupFilesAfterEnv: ["jest-extended"],
    },
    {
      displayName: "ESLint",
      preset: "ts-jest",
      runner: "jest-runner-eslint",
      testMatch: ["**/*.js"],
      testPathIgnorePatterns: ["/dist/", "/node_modules/"],
    },
  ],
};
