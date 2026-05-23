// Learn more: https://docs.expo.dev/guides/customizing-metro/
// Firebase JS SDK ships some CommonJS entrypoints; Metro must treat `.cjs` as source.
const { getDefaultConfig } = require('expo/metro-config');
const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = wrapWithReanimatedMetroConfig(getDefaultConfig(__dirname));

if (!config.resolver.sourceExts.includes('cjs')) {
  config.resolver.sourceExts.push('cjs');
}

module.exports = config;
