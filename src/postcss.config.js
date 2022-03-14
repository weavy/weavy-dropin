/* eslint-env node */
'use strict'

module.exports = ctx => {
  return {
    map: false,
    plugins: {
      autoprefixer: {
        cascade: false
      }
    }
  }
}
