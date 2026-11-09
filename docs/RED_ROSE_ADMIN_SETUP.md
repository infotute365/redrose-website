# Red Rose Academy — St. Mary's admin/database alignment

## Confirmed root differences

The uploaded Red Rose originally used terminal-prompted usernames, 5–15-character scrypt passwords, the native MongoDB driver, a separate `MONGODB_DATABASE` variable, `admins` and `adminSessions`. The St. Mary's Guwahati Club source uses `.env.local` admin email/password, bcrypt, Mongoose, `Auth` (`auths` collection), and a separate `src/server/util/provisionAdmin.js`.

## Aligned files

| File                                       | Updated role                                                                                 |
| ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `scripts/seed-admin.mjs`                   | St. Mary's admin seed script, using environment credentials and explicit reset               |
| `src/server/config/database.js`            | Mongoose connection, St. Mary's settings, with Red Rose name and CMS helper exports          |
| `src/server/config/auth.js`                | JWT access/refresh, cookies, admin/session checks; adapted for Next.js and Red Rose security |
| `src/server/model/auth.model.js`           | St. Mary's Mongoose model and bcrypt hash hook (copied)                                      |
| `src/server/util/provisionAdmin.js`        | St. Mary's create-once/reset logic (copied)                                                  |
| `src/server/util/validation.mjs`           | St. Mary's email/password rules (copied)                                                     |
| `src/server/controller/auth.controller.js` | Login, logout, refresh for Next.js App Router                                                |
| `src/server/middleware/auth.middleware.js` | Check active admin session                                                                   |
| `src/server/route-adapter.js`              | Dispatch admin login/logout/refresh actions                                                  |
| `scripts/lib/mongo-client.mjs`             | Native-driver helper retained only for the older Red Rose maintenance scripts                |

The **public Red Rose design, content, original logos and assets, CMS routes and Next.js 16 TypeScript frontend remain Red Rose-specific**. The two websites are not byte-for-byte identical; only the requested backend/admin architecture has been aligned.

## Safe setup (Windows PowerShell or terminal)

Create private `.env.local` using `.env.example`, with your own credentials:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/red_rose_academy
JWT_SECRET=YOUR_OWN_RANDOM_PRIVATE_SECRET_AT_LEAST_32_BYTES
APP_ORIGIN=http://localhost:3000
NEXT_PUBLIC_API_URL=/api
TRUST_PROXY=false
ADMIN_INITIAL_EMAIL=admin@example.com
ADMIN_INITIAL_NAME=Rose Admin
ADMIN_INITIAL_PASSWORD=Ab3!xyZ7
```

Use a **different database, admin account, JWT secret and domain for each school**. Do not copy St. Mary's private data. Red Rose reads its database name from `MONGODB_URI`; `MONGODB_DATABASE` is rejected: keep the database name inside the URI only. A missing database name is rejected. The admin name is 1–12 characters. The seed password is exactly eight printable ASCII characters, with uppercase, lowercase, digit and symbol. Eight characters is weaker than recommended; keep the login throttling and HTTPS safeguards.

```bash
npm ci
npm run seed:check
npm run seed:admin
npm run db:seed
npm run dev
```

Open `http://localhost:3000/admin/login` and log in with the **email** and password supplied during seeding. Use the exact hostname configured in `APP_ORIGIN`. After seeding, remove `ADMIN_INITIAL_EMAIL` and `ADMIN_INITIAL_PASSWORD` from your private environment configuration. Do not remove the ongoing MongoDB URI or JWT secret.

To intentionally reset an existing active admin, temporarily set the same email and new password in your private environment, then run:

```bash
npm run seed:admin -- --reset-password
```

Normal seed reruns do **not** reset the password. `db:seed` initializes the school content separately and does not replace the admin.

## Breaking authentication change

The old Red Rose `admins` collection and `adminSessions` are **not automatically deleted or silently migrated**. Existing username/scrypt credentials and cookies no longer work with the new `auths` model. **Take a verified backup before deploying to a live school** and seed a new email-based super-admin. Test login, refresh, logout, uploads, all CRUD operations, site pages, images and PDFs in staging first. The original public assets are unchanged. Do not delete legacy collections without an approved migration and backup plan.

## Validation status

**Passed locally:** JavaScript syntax checks, source/folder structure checks, and SHA-256 preservation of all 34 original public assets; also independent JSON request boundary tests.

**Not verified here:** `npm ci`, TypeScript compilation, Next.js build, live MongoDB seed/login, refresh flow, browser/API CRUD, security/load tests, and actual production deployment. Registry access and the user's private MongoDB are unavailable. This is a **source-level corrected ZIP**, not a production certification. Updated unit tests can run after installing dependencies. Old username/scrypt tests are retained under `tests/legacy/` only as history.

## Seven-day replacement cleanup

`src/server/util/media-retention.mjs` marks old uploaded images and PDFs on
replacement or deletion. The cleanup script `scripts/cleanup-media.mjs` scans
references in `siteContent`, `homeSlides`, `schoolEvents`, `documents`, and
`circulars`, then deletes unreferenced GridFS files **and chunks** only after
seven days. The previous background remains restorable for seven days.
Original school files under `public/` are never deleted. The cleanup is not
self-running unless you install and enable the supplied **systemd timer** in
`deploy/`, which calls the script daily. Check `DEPLOYMENT.md`.

```bash
npm run media:cleanup -- --dry-run
```

The cleanup does not perform off-site backups. Back up first and verify on a
staging database before running destructive jobs.
