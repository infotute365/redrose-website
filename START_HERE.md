> **Admin setup update:** Red Rose admin now uses St. Mary's email-based Mongoose/bcrypt provisioning. See `docs/RED_ROSE_ADMIN_SETUP.md` and `README.md` for the current commands.

# Red Rose Academy - source guide

This archive contains the current application source, configuration, lockfile, tests,
maintenance/deployment scripts, seed data, original school images, and public PDFs.
It is intended for reviewing the complete application logic in ChatGPT and for
installing the project on another machine.

## Read these first

1. README.md: setup, features, admin workflows, security behavior, and CMS limitations.
2. package.json: exact project scripts and dependency declarations.
3. src/app/page.tsx and src/app/layout.tsx: homepage composition and shared application layout.
4. src/proxy.ts: request handling and security headers.
5. src/lib/ and src/server/: content, persistence, authentication, and media logic.
6. tests/: expected behavior and regression checks.

## Application structure

- Next.js App Router, React, TypeScript, Tailwind CSS, MongoDB, and GridFS.
- src/app/: public pages, admin pages, route handlers, global CSS, metadata, and layout.
- src/components/public/: public website UI and the browser-side CMS runtime.
- src/components/admin/: dashboard, content editor, background manager, documents,
  circulars, image picker, and slides/events manager.
- src/components/shared/: common layout wrappers and motion support.
- src/lib/: content defaults, public-page registry, CMS overrides, slides/events,
  circulars, documents, media processing, and administrator access helpers.
- src/server/config/: database connections and authentication configuration.
- src/server/model/auth.model.js + src/server/config/auth.js: bcrypt password hashing, JWT access/refresh tokens, and admin session-version checks.
- src/server/http/: request parsing, input bounds, and API error handling.
- src/server/homepage-background.ts: changing/restoring the published hero image.
- lib/utils.ts: shared cn helper used by the UI. This root-level lib folder is required.
- public/: original school images, fallback JSON records, and static documents.
- data/: original homepage slide and school-event seed records.
- scripts/: admin provisioning, content seeding, auth configuration, database backup,
  migration, formatting inventory, and verification tools.
- tests/: security/unit/source checks and integration/browser/proxy checks.
- deploy/: systemd service and Nginx examples. Read DEPLOYMENT.md for deployment.
- tsconfig.json maps @/* to the repository root, so @/src/... and @/lib/... differ.

## Main routes and data flow

- Public pages include /, /gallery, /circulars, and /pages/... school information pages.
- Admin login is /admin/login; the dashboard is /admin/dashboard.
- Admin pages include /admin/background, /admin/editor, /admin/sections,
  /admin/documents, and /admin/circulars.
- src/app/api/admin/ contains protected login/logout and content-management APIs.
- Public read APIs cover site content, circulars, media, and document downloads.
- Login verifies a bcrypt password, issues an HttpOnly access-token cookie,
  and rotates a hashed refresh token in the Mongoose Auth collection. Protected requests check the token, active account, session,
  and authorization. Mutations also check their request origin.
- MongoDB stores administrators, sessions, throttling records, CMS overrides,
  documents, circulars, homeSlides, schoolEvents, and initialization markers.
- GridFS media.files/media.chunks store new uploaded bytes. Media validation and
  image processing are in src/lib/media.ts; Sharp handles image processing.
- The homepage reads published slides, events, circulars, and source defaults.
- Page-wide visual-editor overrides are applied in the browser by CmsRuntime;
  consult README.md for initial-HTML/SEO limitations.
- Without MONGODB_URI, public content can use source/JSON fallback data.
  The administrator features require a configured MongoDB database.

## Run the full application after extracting

Use a supported Node.js version compatible with package.json and the installed Next.js.
Run the following from the extracted red-rose-academy directory:

1. npm ci
2. Copy .env.example to .env.local and supply your own MongoDB/origin settings.
3. npm run auth:configure
4. npm run seed:admin (reads private ADMIN_INITIAL_EMAIL, ADMIN_INITIAL_NAME and ADMIN_INITIAL_PASSWORD from .env.local)
5. npm run db:seed (initializes original content in a new database)
6. npm run dev

For production: npm run build, then npm start, with production configuration.
Review README.md and DEPLOYMENT.md before deploying.

## Verification

- npm run lint
- npx tsc --noEmit
- npm run test:security
- npm run build

The additional integration scripts need a running/configured database and, depending
on the suite, a browser, an existing server, or Nginx. Audit-local tools are excluded;
provide your own tools/paths when rerunning those integration suites.

## Intentionally excluded

node_modules, .next, Git history, audit outputs/tools, backups, private environment
files, database exports, logs, caches, and this ZIP itself are excluded.
Dependencies can be restored with npm ci; Next.js regenerates its build/type output.
Only .env.example is included, with empty private-secret fields.
Live MongoDB content, CMS edits, uploaded GridFS files, administrator accounts, and
credentials are not exported. All logic for handling those records is included.

ARCHIVE_MANIFEST.json lists each included project file and its SHA-256 checksum.
START_HERE.md and ARCHIVE_MANIFEST.json are archive-only additions; the working
application source was not changed while making this ZIP.
