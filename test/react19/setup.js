'use strict';
// Test-only shim: makes every `require('react')` in this process (the library
// build, the harness and the cores) resolve to this environment's React 19, so
// there is exactly one React instance.
const Module = require('module');
const path = require('path');

const here = path.join(__dirname, 'package.json');
const redirected = new Set(['react', 'react-test-renderer']);
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  const base = request.split('/')[0];
  if (redirected.has(base)) {
    return origResolve.call(this, request, { ...parent, paths: Module._nodeModulePaths(__dirname), filename: here, id: here }, ...rest);
  }
  return origResolve.call(this, request, parent, ...rest);
};

/** Absolute entry of a core alias installed in this environment. */
exports.core = (alias) => require.resolve(alias, { paths: [__dirname] });
