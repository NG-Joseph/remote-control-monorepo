const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const resolveFrom = require('resolve-from');

// Find the project root (where package.json is located)
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the workspace
config.watchFolders = [workspaceRoot];

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Force Metro to resolve (sub)dependencies only from the `nodeModulesPaths`
config.resolver.disableHierarchicalLookup = true;

// 4. WebRTC specific configuration
config.resolver.alias = {
  ...config.resolver.alias,
  'event-target-shim': require.resolve('event-target-shim'),
  'react-native-webrtc': require.resolve('react-native-webrtc'),
};

// 5. Platform extensions for better WebRTC support
config.resolver.platforms = [
  'native',
  'android', 
  'native.android',
  'ios', 
  'native.ios',
  'web',
  'js',
  'ts', 
  'tsx'
];

// 6. Source extensions
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'jsx',
  'js',
  'ts',
  'tsx'
];

// 7. Asset extensions for WebRTC
config.resolver.assetExts = [
  ...config.resolver.assetExts,
  'bin'
];

// 8. Custom resolver for event-target-shim compatibility with react-native-webrtc
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    // If the bundle is resolving "event-target-shim" from a module that is part of "react-native-webrtc".
    moduleName.startsWith("event-target-shim") &&
    context.originModulePath.includes("react-native-webrtc")
  ) {
    // Resolve event-target-shim relative to the react-native-webrtc package to use v6.
    // React Native requires v5 which is not compatible with react-native-webrtc.
    const eventTargetShimPath = resolveFrom(
      context.originModulePath,
      moduleName
    );

    return {
      filePath: eventTargetShimPath,
      type: "sourceFile",
    };
  }

  // Ensure you call the default resolver.
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
