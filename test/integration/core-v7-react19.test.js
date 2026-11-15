'use strict';
// v7 supports both React 18 and 19; run it on React 19 as well.
const env = require('../react19/setup');
require('./scenarios').defineSuite('v7 (React 19)', env.core('core-v7'), { major: 7 });
