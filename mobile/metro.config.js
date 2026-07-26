const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix for Zustand and other modern libraries using ES Module `.mjs` exports with `import.meta`.
// Metro on Web does not compile `import.meta` syntax down by default.
// Filtering out `.mjs` and disabling modern package exports forces Metro to use the robust CommonJS builds (`.js`),
// which use standard `process.env` instead of `import.meta`.
config.resolver.sourceExts = config.resolver.sourceExts.filter((ext) => ext !== 'mjs');
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
