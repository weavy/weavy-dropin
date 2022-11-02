/* eslint-env node */

module.exports = {
  "root": true,
  "env": {
    "browser": true,
    "es2022": true
  },
  "extends": "eslint:recommended",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module",
  },
  "ignorePatterns": ["node_modules/**/*", "wwwroot/**/*"],
  "rules": {
    "no-empty": "warn",
    "eqeqeq": "warn",
    "no-unused-vars": [
      "warn",
      {
        "args": "none",
        "ignoreRestSiblings": true,
        "caughtErrors": "none"
      }
    ]
  }
}

