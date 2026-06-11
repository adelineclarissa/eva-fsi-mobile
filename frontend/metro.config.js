const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Exclude iOS/macOS-specific paths that don't exist on Linux
// Fixes: ENOENT: no such file or directory, watch '.../ZXingObjC.xcframework/...'
config.watchFolders = [
  path.resolve(__dirname, "node_modules"),
  path.resolve(__dirname, "app"),
  path.resolve(__dirname, "components"),
  path.resolve(__dirname, "constants"),
  path.resolve(__dirname, "services"),
  path.resolve(__dirname, "store"),
  path.resolve(__dirname, "types"),
  path.resolve(__dirname, "utils"),
];

// Transform exclude to skip problematic .xcframework and .dSYM paths
config.resolver = config.resolver || {};
config.resolver.blacklistRE = [
  /node_modules\.\/\.expo-camera-.+\/prebuilds\/spm-deps\/.*/,
  /node_modules\/.*\.xcframework\/.*/,
  /node_modules\/.*\.dSYM\/.*/,
];

module.exports = withNativeWind(config, { input: "./global.css" });
