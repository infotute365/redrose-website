# Administrator setup and verification

Historical report. Current JWT, CSP, dependencies and validation results are documented
in [PRODUCTION_READINESS_REPORT.md](PRODUCTION_READINESS_REPORT.md).

Verified locally on 2026-11-05 with Node.js 24.11.1, Next.js 16.4.3 and the running local MongoDB service.

## Local credentials and configuration

- `.env.local` is configured with the actual application variables: `MONGODB_URI`, `MONGODB_DATABASE`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `APP_ORIGIN`.
- Database: `red_rose_academy` on `127.0.0.1:27017`.
- Login username: `school-admin`. No administrator email was configured: the existing schema and login form use usernames, not email addresses.
- Read `ADMIN_PASSWORD` in your local `.env.local` file. It was generated directly into that file using Node.js `crypto.randomBytes(32)` and base64url encoding (43 characters). Its value is deliberately absent from this report and application logs.
- `.gitignore` already excludes `.env.local`; its ignore behavior was verified. `.env.example` contains safe placeholders only.
- Authentication remains database-backed. Each login generates a fresh 32-byte cryptographically random session token and stores only its SHA-256 hash in MongoDB. There is no JWT or session signing secret to configure or generate for this design.
- `NODE_ENV` is intentionally unset in `.env.local`, allowing Next.js to select development or production and set the cookie's Secure flag correctly.
- Login URL: <http://localhost:3000/admin/login>.

## Commands and behavior

```sh
npm run seed:admin
```

This loads `.env.local` and provisions only the first administrator, with salted scrypt credentials, role `admin`, active status and a session version. Repeated runs leave existing credentials, permissions and sessions unchanged. A unique normalized username and fixed initial account ID protect concurrent first-run provisioning, including processes using different usernames. If another administrator already exists, no additional account is created.

`npm run db:seed` remains the school-content initialization command. It reuses the same administrator helper. Because this local database was empty, it was run separately after verifying the admin-only command: it imported the two original documents, three original slides and four original events, without inventing or editing school content. There are zero original circulars to import.

An intentional password reset is available through `npm run seed:admin -- --reset-password` after updating the local password. It increments the session version and removes the account's existing sessions. Normal seeding never performs this reset.

## Changes

Created:

- `.env.local`: private local configuration and generated password.
- `src/server/auth/password.mjs`: shared asynchronous scrypt hashing and constant-time verification, compatible with existing stored hashes.
- `scripts/lib/admin-seed.mjs`: shared idempotent administrator provisioning and explicit password reset.
- `scripts/seed-database.mjs`: preserved school initialization logic, separated from the admin-only entry point.
- `tests/admin-password.test.mjs`: hash compatibility and invalid-credential checks.
- `tests/admin-integration.mjs`: real MongoDB and HTTP integration checks, including temporary-database concurrency/reset checks and temporary media cleanup.
- `ADMIN_SETUP_REPORT.md`: this report.

Updated:

- `package.json`: `seed:admin`, `test:admin`, and the separated `db:seed` entry point; dependency ranges are unchanged.
- `.env.example`: safe configuration guidance and placeholders.
- `scripts/seed-admin.mjs`: administrator-only CLI, with errors that do not dump connection strings or credentials.
- `src/lib/admin-auth.ts`: shared password verification, reusable server-side API access guard, and atomic account/IP login limits.
- `src/app/api/admin/login/route.ts`: malformed JSON validation and rate-limit retry header.
- `src/app/api/admin/logout/route.ts`: report database revocation failures instead of returning false success.
- `src/app/api/admin/content/route.ts`, `src/app/api/admin/documents/route.ts`, and `src/app/api/admin/sections/[kind]/route.ts`: authenticated server-side read guards. Public readers continue using their existing public routes/server functions.
- `src/components/admin/AdminDashboard.tsx`: keep the user in place with an error if logout cannot revoke the session.
- `src/components/admin/ContentStudio.tsx`: derive editor drafts without the existing synchronous-state-in-effect lint error; no layout or styling changes.
- `src/app/admin/dashboard/page.tsx`: remove an existing `instant` option that cannot compile without Cache Components enabled.
- `src/lib/media.ts` and `src/app/api/media/[id]/route.ts`: use MongoDB 7 GridFS MIME metadata, retaining compatibility with older records. This fixes an existing type/build failure and preserves image upload/download behavior.
- `tests/source-audit.test.mjs`: account for the separated seed entry points.
- `README.md` and `TEST_REPORT.md`: setup instructions and current verification reference.
- `package-lock.json`: refreshed by installing the existing dependencies.
- `next-env.d.ts`: regenerated by Next.js during build/dev.

`.gitignore` needed no changes. No public page/component design, original content, seed JSON, images, PDFs or school business rules were edited.

## Verification results

| Check                                      | Result                                                                                                                                                                                                |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First `npm run seed:admin`                 | Passed: created the initial administrator.                                                                                                                                                            |
| Second `npm run seed:admin`                | Passed: existing credentials and sessions preserved; administrator count remained one.                                                                                                                |
| Admin-only collection isolation            | Passed: the database contained only `admins` after both runs.                                                                                                                                         |
| `npm run db:seed`                          | Passed: separately initialized the project's original school records.                                                                                                                                 |
| `npm run dev`                              | Passed: local server starts on port 3000.                                                                                                                                                             |
| `npm run build`                            | Passed: production compilation, type validation and prerendering.                                                                                                                                     |
| `npx tsc --noEmit`                         | Passed.                                                                                                                                                                                               |
| `npm run lint`                             | Passed with zero errors and seven existing warnings.                                                                                                                                                  |
| `npm run test:security`                    | 12/12 checks passed.                                                                                                                                                                                  |
| `npm run test:admin`, development          | 13/13 checks passed, including the parent test.                                                                                                                                                       |
| Production HTTP integration                | 13/13 checks passed against `npm start -- --port 3001`, including Secure cookies and production bundle scanning.                                                                                      |
| Real browser form, headless Microsoft Edge | Passed: incorrect password rejected; correct local credentials navigate to dashboard; authenticated API works; Sign out returns to login and revokes the database session. No screenshots were taken. |
| Cookie settings                            | HTTP-only, SameSite Strict, path `/`, eight-hour duration; Secure enabled in production. Browser JavaScript cannot read the session cookie.                                                           |
| Protected access                           | Anonymous admin API calls return 401; admin pages redirect to login. All existing mutation methods remain guarded on the server.                                                                      |
| Logout and expiry                          | Cookie replay rejected after logout; expired sessions rejected before TTL deletion.                                                                                                                   |
| Login throttling                           | Concurrent attempts enforce eight requests per account and forty per IP in each fifteen-minute window; rotating either identity does not bypass the other limit.                                      |
| Media behavior                             | Authenticated image upload/download preserves exact bytes and image MIME type; invalid image bytes rejected. The temporary upload was deleted.                                                        |
| Secrets                                    | No password or session token in tested HTML/API response bodies or generated browser JavaScript. Only the expected HTTP-only cookie carries the browser's session token.                              |
| Content preservation                       | All 66 captured public assets, original seed/content files and public components retained identical SHA-256 checksums. Integration checks preserved all school records.                               |

Run the integration suite while a local application server is running. It uses a dedicated temporary database for provisioning/reset tests, cleans up temporary media/session/limit records, and never resets the real administrator's credentials.

## Remaining issues and limits

- No functional blocker remains for the requested local admin setup.
- Seven existing lint warnings remain: unused imports in public components and recommendations about admin `<img>` elements. They do not fail lint or build.
- This folder has no `.git` directory, so tracked/staged-file auditing was unavailable. The existing ignore rules were verified to exclude `.env.local`; no repository was initialized.
- Verification covers the local setup. Destructive edits to real school records, deployment, backup/restore and infrastructure security testing were outside this change.
