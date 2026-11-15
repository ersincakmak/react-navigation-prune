'use strict';
// @react-navigation/core@8 requires React >= 19.2, so it runs in the isolated React 19 env.
const env = require('../react19/setup');
require('./scenarios').defineSuite('v8 (React 19)', env.core('core-v8'), { major: 8 });
