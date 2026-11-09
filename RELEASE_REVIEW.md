# Red Rose Academy — backend alignment release review

Reference reviewed: `stmary-guwahaticlub-website-main.zip`. Red Rose source reviewed: `red-rose-academy-source.zip` (and previous aligned working copy).

## Delivered

- Same core paths as St. Mary's: `scripts/seed-admin.mjs`, `src/server/config/database.js`, `src/server/model/auth.model.js`, `src/server/util/provisionAdmin.js`, `src/server/config/auth.js`, `src/server/controller/auth.controller.js`, and middleware.
- One Mongoose connection for Red Rose runtime, keyed by database name in `MONGODB_URI`. Login and seed use the Mongoose `Auth` model with bcrypt (12 rounds). Existing CMS content collections/CRUD logic still use native `.collection(...)` methods **through the same Mongoose connection**; they were not rewritten as new Mongoose schemas, to avoid changing functionality.
- Seed reads `ADMIN_INITIAL_EMAIL`, `ADMIN_INITIAL_NAME` (1–12 characters), and `ADMIN_INITIAL_PASSWORD` (exactly 8 characters, uppercase/lowercase/digit/symbol). Red Rose login remains email-based like St. Mary's.
- Admin pages and mutation API routes continue checking authenticated admin privileges and Origin, with secure HttpOnly cookies, JWT access/refresh and persistent throttling.
- Seven-day cleanup of replaced or removed managed GridFS images/PDFs. The old homepage background has seven days to restore. The scheduled job scans references before deleting GridFS files **and chunks**, preserving any still-active/shared media URL. Original `/public` assets cannot be deleted by the job.
- Prettier configuration and npm format commands included. New media-retention tests, admin policy tests and source-level security checks included.

## Setup (Windows local)

1. Make a database backup before upgrading any previously deployed Red Rose installation.
2. `Copy-Item .env.example .env.local`
3. Set `MONGODB_URI=mongodb://127.0.0.1:27017/red_rose_academy`; set a private 32+ byte `JWT_SECRET`, `APP_ORIGIN=http://localhost:3000`, `ADMIN_INITIAL_EMAIL`, `ADMIN_INITIAL_NAME` and `ADMIN_INITIAL_PASSWORD` in `.env.local`. Don't set `MONGODB_DATABASE`. Do not copy St. Mary's secrets or database URI.
4. `npm ci`
5. `npm run format` then `npm run format:check`
6. `npm run seed:check` then `npm run seed:admin` and `npm run db:seed` (the school content seed is separate).
7. `npm run test:security`, `npm run lint`, `npx tsc --noEmit`, `npm run build` and `npm audit --omit=dev`. Check all warnings before deploying.
8. `npm run dev`; sign in at `/admin/login` with the seeded **email**, not the display name.
9. After provisioning, remove `ADMIN_INITIAL_EMAIL`, `ADMIN_INITIAL_NAME` and `ADMIN_INITIAL_PASSWORD` from the private environment, keeping the MongoDB and JWT settings.

The initial password is limited to 8 characters at your request; this is less secure than a longer password and cannot offer a guarantee against compromise. Keep HTTPS and the rate limits, and consider increasing the limit later.

## Automatic media cleanup

- Local manual inspection: `npm run media:cleanup -- --dry-run`.
- Local manual deletion job: `npm run media:cleanup`.
- Production automatic job: install/enable **both** `deploy/red-rose-media-cleanup.service` and `deploy/red-rose-media-cleanup.timer`, following `DEPLOYMENT.md`. Daily run is scheduled after 03:15 server time. If this timer is not installed, **automatic** deletion is not active.
- Deletions occur at the first scheduled run **after** the seven-day deadline. Files still referenced anywhere are not deleted. No deletes from `public/`. Remember to back up `media.files` and `media.chunks` before enabling a destructive cleanup.

## Tests performed in this isolated environment

- 10 dependency-free tests passed: seed policy, access-guard source checks, seven-day retention reference scan, core paths, original public assets.
- All 79 TS/TSX source files syntactically parsed with TypeScript; 0 syntax errors.
- Changed JS module syntax checked with Node 22; 0 syntax errors.
- Original 34 public files (including logos, images and PDFs) are byte-for-byte identical to the original Red Rose source.

## Not verified

- `npm ci`, Prettier execution, full TypeScript type checking, ESLint, Next.js production build, `npm audit`, actual MongoDB connection/seed, live login, full CRUD, browser testing, concurrency/load testing and destructive cleanup against real GridFS data. npm registry DNS was unavailable and no private Red Rose database was accessible from this environment.
- This is a **source-level review build, not a certified production release**. Test with a database backup in staging before production.
- Legacy Red Rose `admins` and `adminSessions` are not migrated to the new Mongoose `auths` collection; seed the new email-based admin. No old data is silently deleted.
