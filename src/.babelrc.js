/* eslint-env node */
module.exports = {
  "plugins": [
    "@babel/plugin-proposal-class-properties",
    "@babel/plugin-transform-runtime"
  ],
  "presets": [
    [
      "@babel/preset-env",
      { "modules": "auto" }
    ]
  ]
}
