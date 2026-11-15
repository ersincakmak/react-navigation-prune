const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, '../..');
const libSrc = path.join(repoRoot, 'src');
const shared = path.resolve(projectRoot, '../shared');
const appModules = path.join(projectRoot, 'node_modules');

const config = getDefaultConfig(projectRoot);

// Watch the library source and the shared demo code (both live outside the app).
config.watchFolders = [libSrc, shared];

// Only resolve packages from this app's node_modules. The repo root node_modules
// is never searched, so there is exactly one copy of react / react-native.
config.resolver.nodeModulesPaths = [appModules];
config.resolver.disableHierarchicalLookup = true;

// Files outside the app (shared/, src/) must still get react & co from the app.
// Force the core packages to the app's copy, whoever asks for them.
const pinned = ['react', 'react-native', 'react/jsx-runtime', 'react/jsx-dev-runtime'];
config.resolver.extraNodeModules = new Proxy(
  { 'react-navigation-stack-pruner': path.join(libSrc, 'index.ts') },
  { get: (target, name) => (name in target ? target[name] : path.join(appModules, String(name))) }
);

const defaultResolve = (context, moduleName, platform) =>
  context.resolveRequest(context, moduleName, platform);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Library consumed from source.
  if (moduleName === 'react-navigation-stack-pruner') {
    return { type: 'sourceFile', filePath: path.join(libSrc, 'index.ts') };
  }
  // The library uses ESM-style `./x.js` imports that point at `./x.ts` files.
  if (
    moduleName.startsWith('.') &&
    moduleName.endsWith('.js') &&
    context.originModulePath.startsWith(libSrc)
  ) {
    return defaultResolve(context, moduleName.slice(0, -3), platform);
  }
  // Pin react / react-native (and subpaths) to this app's node_modules.
  if (pinned.some((p) => moduleName === p || moduleName.startsWith(p + '/'))) {
    return defaultResolve(
      { ...context, originModulePath: path.join(projectRoot, 'App.tsx') },
      moduleName,
      platform
    );
  }
  return defaultResolve(context, moduleName, platform);
};

module.exports = config;
