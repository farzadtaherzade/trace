const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  globalIgnores(['.expo/*', 'coverage/*', 'dist/*', 'node_modules/*']),
  expoConfig,
  {
    files: ['*.config.js'],
    languageOptions: {
      globals: {
        __dirname: 'readonly',
        module: 'readonly',
        require: 'readonly',
      },
      sourceType: 'commonjs',
    },
  },
]);
