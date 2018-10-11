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
      testMatch: ["<rootDir>/*.js"],
    },
  ],
};
