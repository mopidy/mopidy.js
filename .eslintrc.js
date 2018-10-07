module.exports = {
  env: {
    "shared-node-browser": true,
  },
  extends: ["airbnb-base", "plugin:prettier/recommended"],
  globals: {
    document: true,
  },
  rules: {
    "no-underscore-dangle": "off",
  },
};
