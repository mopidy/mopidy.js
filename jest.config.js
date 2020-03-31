module.exports = {
  projects: [
    {
      displayName: "Browser tests",
      testEnvironment: "jsdom",
      setupFilesAfterEnv: ["jest-extended"],
    },
    {
      displayName: "Node tests",
      testEnvironment: "node",
      setupFilesAfterEnv: ["jest-extended"],
    },
    {
      displayName: "ESLint",
      runner: "jest-runner-eslint",
      testMatch: ["**/*.js"],
      testPathIgnorePatterns: ["/dist/", "/node_modules/"],
    },
  ],
};
