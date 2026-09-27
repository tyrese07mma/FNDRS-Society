# Compatibility overrides

Node 24 is required by package.json and CI.

- `xcode` uses UUID v4. Its uuid dependency is overridden to 11.1.1, which retains a CommonJS export and fixes GHSA-w5hq-g745-h8pq. The project-ID test checks its actual xcode caller.
- Expo Router consumes query-string 7's CommonJS API. decode-uri-component 0.5.0 fixes GHSA-vcc3-ghjq-m6fr but exports an ESM default. A one-line local CommonJS adapter bridges that default; the upstream package is installed as the pinned `decode-uri-component-modern` alias. The direct local dependency and `$decode-uri-component` override keep the lockfile link relative to the project root.

Do not run `npm audit fix --force` to downgrade Expo. Remove these overrides when supported upstream packages incorporate the fixes, rerunning query parsing, malformed-input, xcode-ID tests and all platform exports.

Verified September 26: fresh offline `npm ci --ignore-scripts` against the populated cache in a separate folder, three compatibility tests, and full Expo export. npm installation audit reported zero known vulnerabilities. This is a point-in-time dependency result, not a security guarantee.

Sources: https://github.com/advisories/GHSA-w5hq-g745-h8pq and https://github.com/advisories/GHSA-vcc3-ghjq-m6fr.
