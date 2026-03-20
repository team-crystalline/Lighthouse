const airbnbBase = require('eslint-config-airbnb-base/rules/imports');
const airbnbES6 = require('eslint-config-airbnb-base/rules/es6');
const airbnbStyle = require('eslint-config-airbnb-base/rules/style');

module.exports = {
  files: ['**/*.js'],
  extends: [
    'airbnb-base',
  ],
  rules: {
    ...airbnbBase.rules,
    ...airbnbES6.rules,
    ...airbnbStyle.rules,
    'import/prefer-default-export': 'off',
    'no-param-reassign': ['error', { props: false }],
    'no-unused-vars': ['error', { argsIgnorePattern: 'next' }],
    'jsdoc/require-jsdoc': 'off',
    'max-len': ['error', { code: 120 }],
    
    'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0 }],
    'function-paren-newline': ['error', 'multiline-arguments'],
    'object-curly-newline': ['error', { consistent: true }],
  },
};