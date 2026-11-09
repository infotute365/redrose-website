# Red Rose Academy

Next.js 16 / React 19 / TypeScript / MongoDB, using the original `red-rose.zip` school logo, school photographs, leadership messages, facilities content and public routes.

## What changed (St. Mary's Guwahati Club alignment)

- Red Rose keeps its original design, text, images, PDFs, school logo, public routes and CMS. The 34 original `public/` files are protected by a SHA-256 manifest.
- Admin setup now uses the SAME path/naming pattern as St. Mary's: `scripts/seed-admin.mjs`, `src/server/util/provisionAdmin.js`, `src/server/model/auth.model.js`, `src/server/config/database.js`, `src/server/config/auth.js`, `src/server/controller/auth.controller.js`, `src/server/middleware/auth.middleware.js`.
- MongoDB is connected through **Mongoose**; the existing Red Rose CMS collections and GridFS continue using that same MongoDB connection. The name `red_rose_academy` comes from the **MONGODB_URI** path. St. Mary's school database must never be used here.
- The admin is stored in the `auths` collection (Mongoose model `Auth`), login is via **email** and a bcrypt-hashed strong password, role is `super-admin`, and reset requires an explicit `--reset-password` flag.
- Auth uses a 15-minute HttpOnly JWT access cookie and a seven-day rotating HttpOnly refresh cookie. `src/app/api/admin/refresh/route.ts` refreshes active editors. Existing protected CMS routes retain server-side authentication, Origin checks and MongoDB-backed login limits.
- Existing school content uses `siteContent`, `documents`, `circulars`, `seedStates`, `schoolEvents`, `homeSlides` and `media.files` / `media.chunks`. The retired `admins` and `adminSessions` collections are **not** automatically deleted or converted.
- Frontend still uses Next.js 16 and React/TypeScript, rather than the older St. Mary's Next.js 15 frontend. Only the requested admin/seed/database/backend layout is aligned, not the whole public website.

## Local setup

1. Install Node.js 22.14+ and MongoDB; run `npm ci`.
2. Copy `.env.example` to `.env.local`. Set `MONGODB_URI=mongodb://127.0.0.1:27017/red_rose_academy`, `APP_ORIGIN=http://localhost:3000`, a strong `JWT_SECRET`, `ADMIN_INITIAL_EMAIL` and `ADMIN_INITIAL_PASSWORD`. Never use St. Mary's database URI or share secrets between schools.
3. Run `npm run seed:check` to find missing configuration values, then `npm run seed:admin`. The admin is created only if no admin already exists in the new `auths` model.
4. To deliberately reset an existing **active** admin, set the same `ADMIN_INITIAL_EMAIL` and a new strong password, then run `npm run seed:admin -- --reset-password`. All previous sessions will be invalidated. Normal reruns do not reset the password.
5. Remove `ADMIN_INITIAL_EMAIL` and `ADMIN_INITIAL_PASSWORD` from `.env.local` after seeding, retaining them only temporarily for deliberate resets. Keep them out of version control.
6. If this is a new school database, run `npm run db:seed` to initialize Red Rose school content. This command is separate from `seed:admin`.
7. Run `npm run dev`, open `http://localhost:3000/admin/login`, and sign in with the email/password you seeded. Use exactly the hostname configured in `APP_ORIGIN` (`localhost` is different from `127.0.0.1`).

The public website can render its original content without the database, but the admin and dynamic content need a live MongoDB connection. For Red Rose, the initial admin name (`ADMIN_INITIAL_NAME`) must be 1–12 characters and the initial password must be exactly 8 printable ASCII characters with uppercase, lowercase, number and symbol. Eight characters is weaker than recommended for production; keep login rate limits enabled. MongoDB data, PDF files and original assets are not reset by `seed:admin`.

### Administration verification

Run `npm run test:security`, `npm run lint`, `npx tsc --noEmit` and `npm run build` after installing dependencies. The `test:admin` script runs the new unit tests for admin provisioning, passwords, JWT claims and URI parsing; it does **not** substitute for a full end-to-end MongoDB test. The prior username/scrypt/JWT-session tests are retained in `tests/legacy/` but are not valid for the new architecture. Perform live admin login/logout, refresh, upload and CRUD tests on a staging database before deployment.

**Existing database warning:** Older Red Rose `admins` / `adminSessions` credentials are no longer used. Make a verified backup before deploying this auth change; seed the new admin using the private email/password fields. This is a **breaking authentication migration**, not a silent credential migration.

### Admin workspace and homepage background

Open `/admin/dashboard` after signing in. The sidebar provides Dashboard Overview, Homepage Background, Website Content Editor, Homepage Slides, Circulars & Notices, Documents & PDFs, Photo Gallery / Events, and Logout. The same menu opens as a drawer on phones. Counts come from the current database records.

**Replace the main background:** open **Homepage Background**, choose or drag in a JPEG, PNG or WebP (up to 20 MB and 40 megapixels), check the immediate desktop/mobile preview, optionally choose its position, and select **Save Changes**. **Cancel** discards the local preview without uploading it. **Restore Previous Image** swaps back to the last photograph and position; it keeps the newer image available to restore again.

The first published `homeSlides` record, sorted by `displayOrder` and then `id`, remains the homepage's first image. The manager updates only that record's `src`, `backgroundPosition`, `previousBackground` and `backgroundRevision`. It does not change titles, descriptions, other photos, visibility or order. Normal slide editing still works, and the current background is labelled in the slide list. If someone else saves first, reload instead of overwriting their change.

Uploads use the existing protected media API and MongoDB GridFS. Background photographs are decoded and checked, rotated using their orientation, stripped of embedded metadata, resized proportionally within 3840 × 3840 without upscaling, and encoded as WebP at quality 90. The public `next/image` component provides responsive delivery. Existing source photographs are not reprocessed or replaced automatically.

The content editor groups text and images by page/header/footer, uses friendly labels, and stages image replacements until **Save Changes**. The main hero image links to the dedicated background manager. Earlier visual-editor hero overrides remain readable without a database migration; the first explicit background save makes the slide record authoritative.

**Production storage:** MongoDB holds both records and uploaded bytes. Use a persistent MongoDB volume or a managed MongoDB service with backups. Every VPS, Docker replica or application instance must use the same database and GridFS bucket. Runtime writes to `public/` or an application's container filesystem are not used for these uploads. Next.js image caches may be ephemeral and can be regenerated from GridFS. Configure the reverse proxy to accept the allowed upload sizes. Deploy dependencies with the native Sharp build for the server platform (`npm ci`); Sharp was already part of Next.js and is now explicitly declared because the upload pipeline uses it.

The older dashboard browser integration suite was written for the retired username/scrypt login system. It remains under `tests/legacy/`, but must be adapted before it can be used for regression testing with the new admin model.

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

## Production deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the dedicated systemd/Nginx deployment procedure.

Use `npm run format` and `npm run format:check` for the required Prettier style. Security,
dashboard, development and local Nginx/TLS checks are available through `test:security`,
`test:dashboard`, `test:development` and `test:proxy`. The proxy test needs a local Nginx
binary; browser checks report a skip when no Chromium browser is available.

If `npm run dev` says another Next server already owns this project, use its displayed
URL. A second development process exits to protect the shared build directory. Stop
the identified project server before starting a replacement; do not kill every Node process.

## Seven-day uploaded media cleanup

When an administrator replaces/removes an uploaded image or PDF, the old GridFS
file is marked for deletion **seven days later**. A daily cleanup job checks
all references before deleting the complete GridFS file and its chunks. The
old homepage background can be restored within the same seven-day window.
The cleanup only touches managed `/api/media/<id>` files, **never** original
photos or PDFs stored in `public/`. New, unused uploads also expire.

Dry run: `npm run media:cleanup -- --dry-run`; real run: `npm run media:cleanup`.
**Automatic** daily deletion requires enabling the bundled systemd timer on
the production VPS (see `DEPLOYMENT.md`). Without the timer, files are only
marked and are not removed automatically. Take a verified backup first.
