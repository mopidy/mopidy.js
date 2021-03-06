module.exports = {
  extends: ["airbnb-base", "plugin:prettier/recommended"],
  env: {
    "shared-node-browser": true,
  },
  globals: {
    document: true,
  },
  rules: {
    "class-methods-use-this": "off",
    "max-classes-per-file": "off",
    "no-underscore-dangle": "off",
  },
};
