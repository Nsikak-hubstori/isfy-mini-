const js = require('@eslint/js');

// Node globals declared by hand to avoid an extra dependency.
const nodeGlobals = {
  require: 'readonly', module: 'writable', process: 'readonly', console: 'readonly',
  __dirname: 'readonly', Buffer: 'readonly', fetch: 'readonly', setTimeout: 'readonly',
  clearTimeout: 'readonly', URL: 'readonly',
};

module.exports = [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'commonjs', globals: nodeGlobals },
    rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }] },
  },
  { ignores: ['node_modules/**'] },
];
