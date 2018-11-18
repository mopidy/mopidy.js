module.exports = {
  projects: [
    {
      displayName: "Browser tests",
      testEnvironment: "jsdom",
    },
    {
      displayName: "Node tests",
      testEnvironment: "node",
    },
    {
      displayName: "ESLint",
      runner: "jest-runner-eslint",
      testMatch: ["**/*.js"],
      testPathIgnorePatterns: ["/dist/", "/node_modules/"],
    },
  ],
};
