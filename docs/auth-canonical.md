# Shared authentication source

`auth-canonical.json` lists the shared auth source and its verification tools in
FlowDesk and Template. Add shared files to the manifest when introducing them.
The comparison reads only listed files and never copies or edits project files.
It checks source text after normalizing BOM and CRLF; comments and formatting
changes still count as differences. Missing files fail the check.

Run from either project:

```sh
npm run test:auth
npm run check:auth-types
npm run check:auth-sync -- "<absolute path to the other frontend>"
```

The tests use Node's test runner and the installed TypeScript compiler; no extra
test dependency is required. The loader supplies a test API URL. An in-memory
Axios adapter intercepts all requests, including refresh/logout transport, so
the tests never contact a backend or use real credentials. Coverage includes the
shared contracts, API response validation, cancellation, refresh deduplication,
cookie/CSRF ordering, logout races, OAuth/2FA API branches, password requests,
authorization identity checks and the drift detector itself.

The TypeScript command keeps strict checking and uses only manifest source
entries plus the Vite declarations and API environment adapter. It excludes
project references and refuses to read unrelated application source imports.
It does not build the application or validate business modules.

Project-specific integration files are listed separately in the manifest:
API URL/environment values, compatibility exports containing business types,
application routes, navigation/branding and package scripts/dependencies.
They are not copied or compared as entire canonical files. Preserve each
project's integration when updating common auth code.

These checks do not prove browser behavior. Mounted React flows, routing,
cookie behavior in a real browser, and backend integration still require
separate focused browser/integration checks when authorized. Do not describe
the whole project as type-safe based on this limited check.
