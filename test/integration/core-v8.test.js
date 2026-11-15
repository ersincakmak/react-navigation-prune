'use strict';
const React = require('react');

// @react-navigation/core@8 (alpha) calls `React.use`, which exists only in React 19+.
// The repo's dev React is 18.3.1, so the suite is skipped (not hacked) until React 19 is installed.
const skip =
  typeof React.use === 'function'
    ? undefined
    : `core v8 requires React >= 19.2 (React.use); installed React ${React.version}`;

require('./scenarios').defineSuite('v8', 'core-v8', { major: 8, skip });
