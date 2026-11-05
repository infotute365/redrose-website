# Red Rose Academy production readiness audit

Audit date: 5 November 2026. Scope: the current local repository, MongoDB database,
admin CMS, public pages, development mode and a local production/TLS environment.
No live VPS was accessed. This report supersedes older reports for authentication,
CSP and current verification results.

## Project and preservation

- Next.js **16.4.5**, React/React DOM **19.3.0**, native MongoDB driver **7.8.0**,
  jose **6.2.15**, Prettier **3.9.10**, TypeScript App Router application.
- The machine's system Node remains **24.11.1**. A separate official **24.22.2** LTS
  executable was downloaded and checked against Node's published SHA-256 manifest
  for the final verification. Other applications' runtimes were not changed.
- Public design, school wording, crest, photographs, contact information and the
  latest 90svh first fold were retained. Footer Admin Login and the exact credit
  `Design by Apex@aspire Digicom solution` remain present.
- Private backup: `.backups/2026-11-05T07-02-59.578Z-21f0f4e7`. All 11 collections
  have BSON data, metadata/indexes, counts and SHA-256 manifest entries. Source,
  private configuration and original public assets are included. Keep it private.
- Restoration of all 11 collections and their indexes into an isolated database
  was executed successfully. Preservation checks compared 9 persistent collections,
  including administrator hashes, and 39 original public files against the backup.
  Session and rate-limit collections are transient and excluded from that comparison.
- Two backed-up legacy sessions were marked revoked, without deleting their records.
  Old opaque cookies are rejected independently of the migration marker.
- Windows ACLs restrict the backup, audit directory and local environment to the
  current account and SYSTEM. An initially incorrect file ACL interrupted testing;
  it was corrected and private-file readability was verified before rerunning.
- The supplied St Mary's folder contained school documents, not application source.
  No reference implementation could be inspected there; its sensitive documents
  were not opened. Red Rose retains the requested native-driver architecture.

## Findings and fixes

No Critical issue was established by this audit. This is not a penetration-test
certification or a guarantee that undiscovered vulnerabilities do not exist.

| Severity | Verified issue and cause                                                                                                                                                        | Correction and principal files                                                                                                                                                                                               | Evidence                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| High     | The partial JWT path could authorize independently of the session record; logout revocation and account changes were ineffective for that path. Legacy token fallback remained. | One JWT-only verifier with DB session, active account, role and session-version checks; stable database ID and hashed random jti. `src/server/auth/{jwt,sessions}.mjs`, `src/lib/admin-auth.ts`, login/logout routes.        | JWT unit and live authorization/replay/disabled-account/version tests.                                               |
| High     | JWT configuration and claims were incomplete: obsolete secret fallback, no fixed issuer/audience or unique revocable identifier.                                                | Required strong `JWT_SECRET`, HS256 allowlist, required claims, issuer/audience, eight-hour maximum age, fresh 32-byte jti; no token in response JSON/localStorage. `src/server/config/auth.mjs`.                            | Wrong algorithm, missing/malformed claims, modified signature, expired/unsigned tokens and invalid secrets rejected. |
| High     | Forwarded IP and origin fallback could rely on untrusted request headers/URLs.                                                                                                  | Exact configured `APP_ORIGIN`; direct mode ignores forwarding headers; proxy mode requires a private overwritten shared header and valid `X-Real-IP`. Loopback binding and Nginx template prevent public direct-port access. | Cross-origin, spoofed-header and direct-upstream denial tests.                                                       |
| Medium   | Login JSON parsing was unbounded before credential validation; large bodies could consume memory.                                                                               | Stream-counted JSON reader, 4 KiB login and 64 KiB private JSON limits, including requests without Content-Length. `src/server/http/json.mjs` and admin JSON routes.                                                         | Unit byte-limit checks and live 413 tests.                                                                           |
| Medium   | Production scripts allowed general inline execution, while development blocked React's required eval debugging.                                                                 | Per-request nonces in `src/proxy.ts`; dynamic root rendering; development-only unsafe-eval; production strict-dynamic with no script unsafe-inline/eval. One CSP authority.                                                  | Browser parser-injected inline script and eval tests; development HMR test.                                          |
| Medium   | Internal Next.js hostname leaked into document redirects, blocking PDF frames and breaking public proxy URLs.                                                                   | Validated relative Location redirects in `src/app/api/documents/[id]/file/route.ts`.                                                                                                                                         | Stable-link redirect assertions and real PDF preview browser workflows.                                              |
| Medium   | Failed initial Mongo connections were not safely recoverable; configuration/driver errors could escape inconsistently.                                                          | Shared, cached, bounded pool with sanitized configuration and connection errors; failed clients close and later calls retry. `src/server/config/{database.ts,mongo-client.mjs}`.                                             | Concurrent-pool/retry tests; isolated HTTP database-outage 503 checks.                                               |
| Medium   | Some mutation handlers assumed object JSON, could throw on null, or expose raw upload errors; invalid document replacement could upload before ID validation.                   | Typed shape checks, safe boundary responses, known validation messages, validation before upload, strict private content-read errors. Admin content/circular/document/media/section APIs; `src/server/http/api.ts`.          | Malformed/null/array inputs, upload validation and outage tests.                                                     |
| Medium   | GridFS downloads buffered complete files into application memory.                                                                                                               | Backpressure-aware streaming, abort cleanup, single byte ranges, safe MIME/filename and sandbox response policy. `src/app/api/media/[id]/route.ts`.                                                                          | Exact-byte downloads, 206 prefix/suffix and 416 tests over TLS.                                                      |
| Medium   | General image uploads checked magic bytes without proving the image decoded.                                                                                                    | Sharp decode and 40-megapixel limit; background optimization retained. PDFs validate version signature and EOF marker. `src/lib/media.ts`.                                                                                   | Forged, truncated, oversized and valid upload checks.                                                                |
| Medium   | Next.js 16.4.3 preceded the reviewed November fixes.                                                                                                                            | Next.js and matching eslint config upgraded to 16.4.5; jose pinned to 6.2.15; lockfile updated.                                                                                                                              | Clean installation and production build checks.                                                                      |
| Low      | shadcn CLI and its dependency chain were classified as production dependencies.                                                                                                 | CLI moved to devDependencies; build CSS import retained.                                                                                                                                                                     | Production dependency audit; full dev audit reported separately.                                                     |
| Low      | Above-the-fold gallery/facility/admin preview images triggered development LCP warnings; deprecated Image priority props remained.                                              | Eager-load the identified first images; use the documented preload API. Public gallery/facilities/navbar/hero/photo tile and admin dashboard/background components.                                                          | Development browser warnings and production regression checks.                                                       |
| Low      | Missing sitemap/canonical/Open Graph setup and repeated title suffixes.                                                                                                         | Trusted-origin metadata, public route inventory, dynamic robots/sitemap, admin noindex. Local URLs are not advertised as canonical public URLs. `src/lib/public-pages.ts`, root/admin layouts, robots/sitemap.               | Source review and local HTTP checks; real-domain acceptance remains required.                                        |
| Low      | Formatting and stale authentication documentation were inconsistent.                                                                                                            | Required Prettier config/scripts/ignores, full supported-source format, ESLint cleanup and updated README/deployment documentation.                                                                                          | Final formatting, types and lint checks.                                                                             |

The Next.js upgrade was checked against the
[official 16.4.5 release](https://github.com/vercel/next.js/releases/tag/v16.4.5)
and [official advisories](https://github.com/vercel/next.js/security/advisories).
The nonce approach follows the installed 16.4.5 CSP guide at
`node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`.

## Authentication, API and database behavior

Passwords retain the original salted scrypt format, timing-safe comparison and dummy
work for unknown accounts. Normal admin seeding is idempotent, uses a stable initial
ID and unique normalized username index, and never resets credentials. Explicit
password reset increments sessionVersion and marks existing sessions revoked.

JWTs have HS256/typ JWT, sub=database administrator ID, role, sessionVersion, jti,
iat/exp, issuer and audience. jose verifies signatures and required claims with a
fixed algorithm, no clock-tolerance extension, and an eight-hour maximum lifetime.
Only the jti's SHA-256 digest is indexed in MongoDB. Legacy records and valid-but-
unregistered JWTs do not authenticate. Logout must persist revocation before clearing
the cookie; database failure returns 503 and retains the cookie for retry.

Cookies are HttpOnly, SameSite Strict, Path=/, Max-Age=28800 and Secure in production.
All admin management GETs and mutations enforce current server authorization.
Mutations additionally require the configured exact Origin. Invalid authentication
returns 401, denied role/proxy/origin returns 403, malformed input returns 400,
oversized JSON returns 413, throttling returns 429 with Retry-After, and unavailable
authentication/database operations return 503 without driver credentials in bodies.

Login limits are atomic MongoDB counters: eight attempts per normalized account and
40 per trusted IP within 15 minutes. Success clears the account counter only. Direct
development uses one conservative IP bucket; production Nginx supplies a trusted
client address. Redis is unnecessary for the existing application size.

`src/server/config/database.ts` remains the main façade, exposing connectDB(),
getDatabase() and mediaBucket(). The shared implementation is cached across hot
reloads. Pool maximum=20, minimum=0, maxConnecting=2, idle timeout=60s; connection,
server-selection and wait-queue timeouts=7s. Failed initial connections close and
clear their promise, allowing later requests to retry. No Mongoose conversion.

Verified indexes include administrator username uniqueness, session hash uniqueness,
session/login-limit expiry TTL indexes, and GridFS chunk/file indexes. The media
bucket is still `media`; original GridFS files, mappings and IDs are preserved.
Standalone seed tools disconnect cleanly and share database configuration validation.

## CSP details

The earlier warning came from a CSP that omitted unsafe-eval even in development.
Only development now allows it for React's debugging call-stack reconstruction.
Production browser tests explicitly attempt eval with DevTools CSP bypass disabled.
The inline-injection test modifies only a test browser response before parsing;
ordinary DevTools-created nodes can carry debugger privileges and are unsuitable
for that assertion. Browser console errors are collected, not suppressed.

Next.js receives the same nonce policy in its request headers and puts nonces on
framework/hydration scripts. Root request-time rendering prevents static nonce reuse.
Pages/admin data are private/no-store. Script attribute execution is disallowed.
Styles retain unsafe-inline because existing React style attributes, image positioning
and Framer Motion need it; this is separate from script policy. Images allow self,
data and blob; fonts/connect/frame sources are restricted. Local development permits
its HMR WebSocket. A temporary browser profile is granted the normal loopback-network
permission for that test origin so headless automation can connect HMR; application
CSP and the user's browser settings are unchanged. No duplicate Nginx CSP is configured.

## CMS and public-site verification

- Dashboard counts, protected server navigation, searches, mobile drawer and logout.
- Background selection, invalid/oversized image handling, actual 4K decode/optimization,
  preview, cancel, drag/drop, positioning, save, public rendering, refresh, application
  restart persistence, previous-image restore and carousel controls.
- Existing text/image editor grouping, readable labels, staged image selection,
  save/cancel/restore, MongoDB storage and public preview.
- Circular create/read/edit/promote/delete, PDF attachment and public display.
- Document upload, stable-link replacement, title rename, metadata preservation,
  delete confirmation, public download and PDF preview.
- Event/photo creation, image replacement, editing, publish/hide, public gallery
  display and deletion; last published homepage slide protection.
- Public home and all 12 additional page routes checked in a real Edge browser;
  homepage sizes 1440, 1366, 390 and 320 pixels, no horizontal overflow, 90svh
  navigation+hero budget, alt attributes, original footer credit and working carousel.
- Original account and school data are fingerprinted before/after isolated mutation
  suites. Test-only accounts, content and uploads exist only in temporary databases.

Circular unpublish and separate gallery albums are not implemented features of this
source. Circulars publish immediately; events/slides have publish/hide controls.
The audit did not invent these additional business features or claim to test them.

## Formatting and final verification

The mandatory configuration is `.prettierrc.json`: semicolons, double quotes, two
spaces, trailingComma=all, printWidth=100, bracket spacing, arrowParens=always and LF.
Scripts are `prettier --write .` and `prettier --check .`. Ignored: dependencies,
generated/build/cache outputs, credentials, lockfile, original public images/uploads/
PDFs, private backup/audit directories and copied design-preview assets.

The full pass checked **133 supported files** and rewrote **119**. The final report and
file inventory were formatted again after recording validation results. See
[MODIFIED_FILES.md](MODIFIED_FILES.md) for the combined inventory of 135 edited/new paths,
including private environment/configuration filenames without their contents.

Final validation used checksum-verified **Node 24.22.2**, TypeScript **5.9.3** and ESLint
**9.39.5**. The commands ran in the requested order. The first formatting check caught
three remaining differences; these were corrected and the formatter/check rerun before
continuing from the already successful clean install. Final results:

| Check                                       | Actual result                                                                                                                                                  |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci`                                    | Pass; lockfile installation completed.                                                                                                                         |
| `npm run format`                            | Pass; complete supported-source formatting.                                                                                                                    |
| `npm run format:check`                      | Pass.                                                                                                                                                          |
| `npx tsc --noEmit`                          | Pass.                                                                                                                                                          |
| `npm run lint`                              | Pass, no warnings or errors.                                                                                                                                   |
| `npm run test:security`                     | **21/21 passed**, no skips.                                                                                                                                    |
| `npm run build`                             | Pass, Next.js 16.4.5 production build.                                                                                                                         |
| `npm audit --omit=dev`                      | Pass; the registry reported no production dependency advisories at this check.                                                                                 |
| `npm run test:dashboard`                    | **17/17 passed**, including real Edge browser CMS flows and actual server restart; no skips.                                                                   |
| Authentication suite within dashboard tests | **13/13 passed** in the isolated database.                                                                                                                     |
| `npm run test:proxy`                        | **5/5 passed**, including real Edge login/logout through local Nginx TLS, proxy-header trust, streaming byte ranges and database-outage responses; no skips.   |
| `npm run test:development`                  | **1/1 passed**, including React debug eval permission, actual HMR connection, navigation/hydration, login/logout and no unexpected browser warnings; no skips. |
| `npm run seed:admin`                        | Pass; existing credentials and sessions preserved.                                                                                                             |
| BSON restore verification                   | All **11 collections** and indexes restored and compared in an isolated database, then that database removed.                                                  |
| Final preservation check                    | All **9 persistent collections** and **39 original public files** unchanged.                                                                                   |
| Existing local credentials                  | Read-only verification matched the preserved active administrator; no credential values printed.                                                               |
| Test cleanup                                | **0** isolated test databases remaining; owned browser/application/Nginx test processes stopped.                                                               |

Production start is exercised by the dashboard and proxy suites using the built Next.js
server on isolated loopback ports. Private `.audit/final-checks.json`,
`.audit/functional-results.json` and associated logs retain execution evidence. Browser
screenshots from the dashboard suite are in `node_modules/.cache/red-rose-dashboard/`;
they are test artifacts, not application content, and a later clean install removes them.

## Dependencies and remaining limitations

The reviewed full dependency audit reports **13 development-toolchain findings**:
2 low and 11 moderate, through shadcn/registry/deepmerge, ts-morph/minimatch and
typescript-eslint/minimatch. Available audit suggestions include incompatible major
downgrades; no force fix or unreviewed major override was applied. These tooling
packages do not enter the production dependency graph. Recheck advisories before
deployment and avoid processing untrusted projects through the affected tooling.
An npm audit result is a registry snapshot, not a claim of zero application vulnerabilities.

The clean install also reports ESLint 9.39.5 as deprecated. It remains a build-time
tool; a compatible major toolchain upgrade should be scheduled separately from the
requested minimal production security fixes.

The generic DOM-index editor still applies text/image overrides after browser hydration.
Original source text appears in visible initial HTML; override values also travel in
serialized initial data. Slides, events, circulars, documents and the managed background
are server-rendered. Converting generic DOM indexes into explicit server-rendered fields
would require a broader component/CMS schema migration and was deliberately deferred
to preserve current content mappings. This is a Medium SEO limitation.

Nonce rendering prevents full-page static/CDN caching. Image optimization, immutable
GridFS caching and streaming downloads remain available. No field Core Web Vitals,
Lighthouse score, sustained load-test result, malware-scanning guarantee or formal
penetration-test claim is made. Multipart parsing buffers up to ten 20 MiB documents
per supported batch; monitor authorized upload concurrency and VPS memory. PDFs are
signature/EOF validated, not fully parsed or antivirus scanned.

Actual Hetzner Ubuntu systemd/reboot behavior, domain DNS, trusted public certificates,
MongoDB production authentication/firewall access, external-port reachability, real-domain
SEO metadata and off-site backup scheduling remain deployment acceptance checks.
The local runtime installation is separate; update the user's normal Node installation
to a supported patched LTS before relying on its default commands for production.

## Deployment and rollback

[DEPLOYMENT.md](DEPLOYMENT.md) contains the exact release, Node checksum, environment,
seed/migration, systemd, Nginx, certificate, firewall review, backup and rollback steps.
Templates: `deploy/red-rose-academy.service` and `deploy/nginx.conf.example`.
Next listens only on loopback, port 3300 in the supplied production template. Nginx
overwrites forwarding and proxy-secret headers. Do not expose that port or MongoDB.
No other hosted application should be changed. Production rollout remains conditional
on the environment-specific acceptance checks; no live deployment was performed.

The verification table above records actual execution results. The functional paths
identify non-formatting changes; the linked file inventory also accounts for the
broad source formatting requested by the user.
