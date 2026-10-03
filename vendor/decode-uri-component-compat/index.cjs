'use strict';
// query-string 7 expects a CommonJS function; the fixed upstream decoder is ESM.
// Node 24 supports require(ESM), and Metro exposes its default export identically.
module.exports = require('decode-uri-component-modern').default;
