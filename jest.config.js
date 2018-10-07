module.exports = {
  projects: [
    {
      displayName: "Browser tests",
      testEnvironment: "jsdom",
      testMatch: ["<rootDir>/__tests__/**/*.test.js"],
    },
    {
      displayName: "Node tests",
      testEnvironment: "node",
      testMatch: ["<rootDir>/__tests__/**/*.test.js"],
    },
    {
      displayName: "ESLint",
      runner: "jest-runner-eslint",
      testMatch: ["<rootDir>/src/**/*.js", "<rootDir>/__tests__/**/*.js"],
    },
  ],
};
