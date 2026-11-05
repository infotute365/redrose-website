# Red Rose Academy

Next.js 16 / React 19 / TypeScript / MongoDB, using the original `red-rose.zip` school logo, school photographs, leadership messages, facilities content and public routes.

## What changed

- The existing approved public design is preserved, including the latest forest/ivory homepage palette and 90svh first fold.
- Original pictures and text remain in the source and render as defaults. The public homepage retains all original content sections.
- Dynamic visual editor: edit text and replace an image on each listed public page, header and footer through an authenticated admin page. The edits are saved in MongoDB without changing original source files.
- MongoDB collections: `admins`, `adminSessions`, `loginLimits`, `siteContent`, `documents`, `circulars`, `seedStates`, and `media.files`/`media.chunks` via GridFS.
- Circulars and school documents are stored in MongoDB; new media is held in GridFS with signature/type checks and size limits.
- Admin login has signed JWT cookies with database-backed revocation, password hashing (scrypt), persistent login throttling, origin checking and admin-required mutations. No website can guarantee absolute security.

## Local setup

1. Use patched Node.js LTS (24.22.2 was verified for this audit), MongoDB and install dependencies with `npm ci`.
2. Copy `.env.example` to `.env.local` and set a unique, randomly generated `ADMIN_PASSWORD` of 20-256 characters. Keep this file private. `ADMIN_USERNAME` is the login identifier; this application does not use an administrator email field.
3. Run `npm run auth:configure` to generate missing private JWT/proxy secrets, then `npm run seed:admin` to provision only the administrator. For a new, empty school database, also run `npm run db:seed` to initialize the original documents, circulars, events, slides and content record.
4. Start with `npm run dev` then open `http://localhost:3000` and `http://localhost:3000/admin/login`.
5. Admin dashboard: `/admin/dashboard`. Visual website editor: `/admin/editor`.

The public homepage can run from preserved static content with no MongoDB configured for preview; the admin dashboard requires a working MongoDB connection.

### Seed behavior

`npm run seed:admin` loads `.env.local` and writes only administrator records. It uses the same salted scrypt format as login. Repeated runs preserve passwords, permissions and sessions. A unique username index and a fixed initial account ID prevent duplicate first accounts even during simultaneous runs. An already-provisioned database with another username is left alone.

`npm run db:seed` remains available for school initialization: it reuses the same admin provisioning helper and preserves existing website edits and seed-once original records.

To explicitly reset the existing admin password, set a new password in `.env.local`, then run `npm run seed:admin -- --reset-password`. This increments the session version and revokes old sessions without seeding school content. The existing `npm run db:seed -- --reset-password` command remains supported.

Authentication uses jose HS256 JWTs in HttpOnly, SameSite Strict cookies (Secure in production). Tokens expire after eight hours and include issuer, audience, stable administrator database ID, session version, role and a random session identifier. Every private request also checks the MongoDB session and the account's current active status, role and version. Logout revokes the server record; password reset increments the version and marks sessions revoked. Legacy opaque cookies are rejected. `JWT_SECRET` must contain at least 32 random bytes encoded as base64url. `ADMIN_JWT_SECRET` is obsolete. JWTs are never returned in JSON or stored in localStorage. Set `MONGODB_DATABASE` explicitly and leave `NODE_ENV` unset in development configuration.

Behind Nginx, set `TRUST_PROXY=true` and use the same private `PROXY_SHARED_SECRET` in its header-overwrite snippet. `APP_ORIGIN` is the exact public HTTPS origin. Direct development ignores forwarded IP headers and shares a conservative IP rate-limit bucket.

### Admin verification

Run `npm run test:security`, `npm run lint`, `npx tsc --noEmit`, and `npm run build`. With the local server running, `npm run test:admin` exercises real MongoDB seeding, password preservation, concurrent provisioning, protected APIs, login/logout, cookie flags, session expiry, media upload/download, rate limiting and browser-bundle secret checks. It uses a dedicated temporary database for reset/concurrent seed checks and deletes only its own test records. School content and real administrator credentials are preserved.

For `npm start -- --port 3001`, set `ADMIN_TEST_ORIGIN=http://localhost:3001`, `ADMIN_TEST_SECURE=true`, and `ADMIN_TEST_STATIC_DIR=.next/static` in the test process before running `npm run test:admin`. These variables are test settings, not application secrets. See `ADMIN_SETUP_REPORT.md` for the local setup and verification results.

### Admin workspace and homepage background

Open `/admin/dashboard` after signing in. The sidebar provides Dashboard Overview, Homepage Background, Website Content Editor, Homepage Slides, Circulars & Notices, Documents & PDFs, Photo Gallery / Events, and Logout. The same menu opens as a drawer on phones. Counts come from the current database records.

**Replace the main background:** open **Homepage Background**, choose or drag in a JPEG, PNG or WebP (up to 20 MB and 40 megapixels), check the immediate desktop/mobile preview, optionally choose its position, and select **Save Changes**. **Cancel** discards the local preview without uploading it. **Restore Previous Image** swaps back to the last photograph and position; it keeps the newer image available to restore again.

The first published `homeSlides` record, sorted by `displayOrder` and then `id`, remains the homepage's first image. The manager updates only that record's `src`, `backgroundPosition`, `previousBackground` and `backgroundRevision`. It does not change titles, descriptions, other photos, visibility or order. Normal slide editing still works, and the current background is labelled in the slide list. If someone else saves first, reload instead of overwriting their change.

Uploads use the existing protected media API and MongoDB GridFS. Background photographs are decoded and checked, rotated using their orientation, stripped of embedded metadata, resized proportionally within 3840 × 3840 without upscaling, and encoded as WebP at quality 90. The public `next/image` component provides responsive delivery. Existing source photographs are not reprocessed or replaced automatically.

The content editor groups text and images by page/header/footer, uses friendly labels, and stages image replacements until **Save Changes**. The main hero image links to the dedicated background manager. Earlier visual-editor hero overrides remain readable without a database migration; the first explicit background save makes the slide record authoritative.

**Production storage:** MongoDB holds both records and uploaded bytes. Use a persistent MongoDB volume or a managed MongoDB service with backups. Every VPS, Docker replica or application instance must use the same database and GridFS bucket. Runtime writes to `public/` or an application's container filesystem are not used for these uploads. Next.js image caches may be ephemeral and can be regenerated from GridFS. Configure the reverse proxy to accept the allowed upload sizes. Deploy dependencies with the native Sharp build for the server platform (`npm ci`); Sharp was already part of Next.js and is now explicitly declared because the upload pipeline uses it.

After `npm run build`, run `npm run test:dashboard` for an isolated production-server/MongoDB/browser regression suite. It clones school records into a uniquely named temporary database, creates a test-only administrator, checks the real forms and media pipeline, restarts its own server to verify persistence, and cleans up its database and processes. It does not edit `.env.local`, run a reset, or use ports 3000/3001. A local Chromium browser is auto-detected; set `ADMIN_TEST_BROWSER_PATH` if needed. If unavailable, the browser portion is explicitly reported as skipped. See `ADMIN_DASHBOARD_REPORT.md` for the implementation and results.

### Editing website content

Open the editor, choose a page and click text/images in the live preview. Original text is not deleted. Admin changes live in the `siteContent.overrides` MongoDB record. Image replacements are uploaded through `/api/admin/media`, using a permanent `/api/media/<id>` URL.

**Current CMS limitation:** The original components still render their source text on the server; page-wide overrides are applied in the browser after hydration. If you need edited text in the initial HTML for SEO, add explicit server-rendered CMS fields to each original component. Changing carousels or repeatable card lists can change the inspector's DOM indexes; re-check changes after structural upgrades. The visual editor does not support creating additional event cards or facilities, only changing text/images already visible.

### Deployment and safety checklist

- Set `APP_ORIGIN` to your exact HTTPS public origin. Use HTTPS and set `NODE_ENV=production`.
- MongoDB must be authenticated, network-restricted and backed up. Use a separate database user with minimum permissions.
- Set a strong admin password and keep the `.env.local` outside version control.
- Ensure reverse proxy limits upload request sizes and supplies trustworthy client IP headers; configure WAF/brute-force limits.
- Run `npm run lint`, `npx tsc --noEmit`, `npm run build`; exercise admin login, every CRUD operation, logout, media access, mobile display, backups and restore on a staging server.
- Inspect dependency advisories and run a professional security audit / penetration test before promising production security.
- Media previously in `public/uploads` remains unchanged and public so original PDF links continue working.

## Homepage and events editor

The **Photos & Events** admin page allows create/edit/hide/delete operations on homepage slides and event cards. The first seed imports all three original slides and all four original events from `data/seed-slides.json` and `data/seed-events.json`. The main hero starts with the school's original building photo; other original photos remain available.

## Existing document updates

Admin can upload new documents, change document titles, delete document records, and replace an uploaded PDF or image. New and replaced document records use permanent `/api/documents/<id>/file` links so later replacement doesn't require changing the published link. Existing legacy public static document URLs are kept as originally uploaded until their record is replaced (their prior static URLs continue to point to the original file).

## Preview

`design-preview/index.html` is a **static design preview** with copied original school assets; it is not a running Next.js instance and does not demonstrate the admin API. `design-preview/preview.png` is the visual design board.

### Security headers

Next.js sends baseline security headers and a per-request nonce CSP through `src/proxy.ts`. Only development permits `unsafe-eval` for React debugging. Production scripts require nonces, with no `unsafe-eval` or `unsafe-inline`. Existing React and Framer Motion style attributes retain a separate `style-src unsafe-inline` permission. Pages are rendered dynamically and are private/no-store; GridFS asset URLs retain immutable caching. Configure HTTPS/HSTS at Nginx without adding a duplicate CSP.

## Approved 2026 homepage design (navy / teal / pearl / champagne)

The latest design uses the approved frosted floating header, original school crest, a
cinematic hero photograph, notice-board/circulars tabs, six clay-style quick links,
and a polished school-introduction section. The school is identified as **Red Rose
Academy, Rongpur, Silchar, Assam**, based on its original source content (not the
incorrect Guwahati location visible in an earlier illustrative concept).

**Change the main hero image (no coding required):**

1. Log in at `/admin/login`.
2. Choose **Homepage Background** (`/admin/background`) in the sidebar.
3. Select **Replace Background Image**, or drag in a JPEG, PNG or WebP photograph.
4. Check the preview, adjust the position if needed, then choose **Save Changes**.
   The protected upload API stores the optimized image permanently in MongoDB GridFS.
5. Use **Restore Previous Image** to switch back. Original project images remain in `/public/images`.

To change a slideshow headline or paragraph, use **Homepage Slides** in the sidebar.
To add or reorder photos, manage published slides and their photo sequence in
that section. Do not use a full screenshot of the earlier concept as a hero image;
use a photograph that shows the real school.

New public pages: `/gallery` uses published slides and school events; `/circulars`
lists published circulars with original titles/descriptions and any linked PDFs.
The notice panel shows an empty state until the admin publishes circulars.

`design-preview/index.html` and `design-preview/preview.png` are _static,
non-interactive visual previews_, not proof of an operational server build.

## Production audit and deployment

See [PRODUCTION_READINESS_REPORT.md](PRODUCTION_READINESS_REPORT.md) for current findings,
tests and limitations, and [DEPLOYMENT.md](DEPLOYMENT.md) for the dedicated systemd/Nginx
deployment procedure. Older reports describe earlier point-in-time implementations and
are superseded for authentication and CSP.

Use `npm run format` and `npm run format:check` for the required Prettier style. Security,
dashboard, development and local Nginx/TLS checks are available through `test:security`,
`test:dashboard`, `test:development` and `test:proxy`. The proxy test needs a local Nginx
binary; browser checks report a skip when no Chromium browser is available.

If `npm run dev` says another Next server already owns this project, use its displayed
URL. A second development process exits to protect the shared build directory. Stop
the identified project server before starting a replacement; do not kill every Node process.
