# Admin dashboard and homepage background manager

Historical dashboard report. Current authentication, CSP, dependencies and final
verification results are in [PRODUCTION_READINESS_REPORT.md](PRODUCTION_READINESS_REPORT.md).

Implemented and verified locally on 2026-11-05 with Next.js 16.4.3, TypeScript, MongoDB and headless Microsoft Edge.

## Staff workflow

Sign in at `/admin/login`, then open `/admin/dashboard`. The navy, teal, champagne and pearl workspace provides real database counts, a current-background preview, quick access cards, a public-website button and consistent management screens.

The sidebar contains:

1. Dashboard Overview — `/admin/dashboard`
2. Homepage Background — `/admin/background`
3. Website Content Editor — `/admin/editor`
4. Homepage Slides — `/admin/sections?tab=slides`
5. Circulars & Notices — `/admin/circulars`
6. Documents & PDFs — `/admin/documents`
7. Photo Gallery / Events — `/admin/sections?tab=events`
8. Logout — the existing protected logout API

On mobile, the menu opens as a modal drawer with focus handling, Escape dismissal and close-on-navigation. Animations are restrained and scoped admin styles do not restyle public pages.

## Homepage Background

The existing carousel remains in place. Its first published slide, sorted by `{ displayOrder: 1, id: 1 }`, is still the first homepage photograph. No separate hero collection, duplicate slide or automatic migration was introduced.

The dedicated manager shows the current photograph and clearly identifies it as **Current Homepage Background**. Staff can select or drag in an image, see its dimensions and file size immediately, switch between desktop/mobile crop previews, choose Original/Center/Left/Right/Top/Bottom positioning, then save or cancel. Selection and cancellation do not upload or modify the published photograph.

Saving uses the existing protected media system, then updates the exact active `homeSlides` record. **Restore Previous Image** swaps the prior photograph and position back, retaining the newer photograph as the next restore option. Concurrent or stale edits receive a reload message rather than silently overwriting another save. Normal slide editing also retains image history and supports revision checking.

MongoDB fields:

| Collection/field                         | Purpose                                                                            |
| ---------------------------------------- | ---------------------------------------------------------------------------------- |
| `homeSlides.id`                          | Existing slide identifier; never recreated by the manager.                         |
| `homeSlides.src`                         | The permanent image reference used by the public carousel.                         |
| `homeSlides.backgroundPosition`          | Optional image position. Missing/null retains the original centered styling.       |
| `homeSlides.previousBackground.src`      | Previous photograph, retained on save.                                             |
| `homeSlides.previousBackground.position` | Previous position, restored with its photograph.                                   |
| `homeSlides.backgroundRevision`          | Optimistic concurrency counter, added only when an image/position change is saved. |
| `media.files` / `media.chunks`           | Existing GridFS bucket holding uploaded bytes and MIME/dimension metadata.         |

Background-only writes leave the slide title, description, alt text, publication status, sequence and all other records untouched. They do not write text overrides or change the notice panel, buttons, layout or school information. The public image gains only the optional object-position style and a CMS coordination attribute; the existing responsive Next.js image delivery, overlays and carousel controls remain.

Older visual-editor hero references in `siteContent.overrides["page:/:i:0"]` are honored on reads until an explicit background save. Reads never migrate data. After saving, the revised slide is authoritative, and the general content editor directs hero changes to Homepage Background. The legacy record is retained rather than deleted.

## API and upload behavior

- Existing endpoints and standard slide/event CRUD contracts remain available.
- `GET /api/admin/sections/slides?view=background` adds a protected background-specific view.
- `PATCH /api/admin/sections/slides` accepts an additional `action: "background"` operation with the active ID, expected source/revision, and optional new image, position or restore request.
- `POST /api/admin/media?purpose=homepage-background` adds background-specific validation and optimization. The original media-upload behavior remains available for documents, circulars, events and other content images.
- Background uploads accept still JPEG, PNG and WebP images, up to 20 MB and 40 megapixels. MIME types, signatures and actual decoding are checked. Invalid, truncated, animated/unsupported and oversized uploads are rejected.
- Images are rotated using their orientation, stripped of embedded metadata, resized proportionally within 3840 × 3840 without enlargement, and stored as WebP at quality 90. Next.js generates responsive delivery sizes for the public image. Published URLs are permanent `/api/media/<id>` references, never browser blob URLs.
- Generated storage filenames use random UUIDs. Image references are restricted to validated project images or GridFS URLs; traversal, external URLs and nonexistent media are rejected by the background manager.
- Sharp was already installed through Next.js; it is now explicitly declared at its existing version because the upload pipeline imports it. No new UI library was added.

## Other admin tools

- The Website Content Editor groups fields by page, page images, header and footer; shows friendly labels and existing values; stages image uploads until Save; and provides Cancel and Restore Original actions. Field keys are kept out of the staff interface.
- Circulars support publish, edit, PDF attachment preview, promotion and confirmed deletion, with search and useful empty states.
- Documents support upload, section filtering/search, inline title editing, PDF/image preview, file replacement and confirmed deletion. Replacement retains stable public download links. An open preview updates with title/file changes and closes if its record is deleted.
- Slides/events retain add, edit, image replacement, publication status, sequence and confirmed deletion. The current background is marked, and the last published slide cannot be hidden or deleted accidentally.

## Security and preservation

MongoDB-backed sessions, scrypt password verification, HTTP-only/SameSite Strict cookies, production Secure cookies, login throttling and origin checks are retained. New admin pages check the session on the server; all new operations reuse the authenticated API guards. No JWT, alternate login mechanism or frontend secret was introduced.

All mutation/browser tests used a uniquely named temporary database and a temporary administrator. The suite copied school data for realistic checks, never copied or edited the real administrator account, used a free test port rather than ports 3000/3001, restarted only its own production server, and cleaned up its database and processes.

The nine original persistent collections matched their pre-task SHA-256 record snapshots. The `.env.local`, authentication and seeding sources were unchanged. Of seventy captured source/asset/configuration files, only the two intended public integration files changed: `HomeExperience.tsx` and `CmsRuntime.tsx`. Original images, logo, PDFs, school content data, public styles and other public components retained their original hashes. No seed/reset/migration was run against the real database.

## Verification

| Check                            | Result                                                                                                                                          |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run build`                  | Passed: production compilation, type validation and prerendering.                                                                               |
| `npx tsc --noEmit`               | Passed.                                                                                                                                         |
| `npm run lint`                   | Passed: zero errors, four existing unused-import warnings in public files.                                                                      |
| `npm run test:security`          | 12/12 passed.                                                                                                                                   |
| `npm run test:dashboard`         | 16/16 passed, including the parent test; no skipped browser checks.                                                                             |
| Existing `test:admin` suite      | 13/13 passed, run against the isolated production server/database.                                                                              |
| 4K and format support            | PNG, JPEG and WebP accepted; 4096 × 2304 input verified as proportional 3840 × 2160 output.                                                     |
| Image validation                 | Unsupported types, misleading signatures, truncated images, oversized files, unsafe paths and nonexistent references rejected.                  |
| Image-only save                  | Verified every non-image slide field and all other slide records were preserved.                                                                |
| Concurrency                      | Stale background saves and stale slide-editor revisions rejected.                                                                               |
| Persistence                      | Image bytes, source and position survived a real Next.js server restart.                                                                        |
| Restore/carousel                 | Previous source and position restored; public next/previous slideshow controls remained working.                                                |
| Browser background workflow      | Current image, file selection, drag/drop, dimensions, immediate preview, cancel, save, public rendering, positioning and restore passed.        |
| Browser content editor           | Grouping, friendly labels, text and image preview/cancel/save/restore passed.                                                                   |
| Browser document workflow        | Upload, PDF preview frame, title edit, synchronized preview title, file replacement, deletion cancellation and confirmed deletion passed.       |
| Browser circular/event workflows | Circular publish/edit/delete and event publish/hide/delete passed. API promotion and remaining CRUD operations also passed.                     |
| Responsive navigation            | Desktop and 390px mobile layouts checked; no horizontal overflow; mobile drawer, Escape, navigation and logout passed.                          |
| Authentication regression        | Incorrect login, unauthorized APIs, origin rejection, secure cookie flags, session expiration, logout replay prevention and rate limits passed. |
| Public regressions               | Homepage, About, gallery, circulars, fee/TC documents and all admin route loads passed.                                                         |

Authenticated desktop/mobile screenshots are available in the ignored local cache at `node_modules/.cache/red-rose-dashboard/`: `dashboard-desktop.png`, `dashboard-mobile.png`, `sidebar-mobile.png`, `background-preview-desktop.png`, and `background-mobile.png`. They contain no password or session-token values.

## Production storage and remaining limits

Uploaded images live in MongoDB GridFS. Use a persistent MongoDB volume or managed database with backups. All VPS/Docker/application replicas must use the same database and bucket. Rebuilding or restarting Next.js does not remove the images. Next.js image caches may be ephemeral and can be regenerated from GridFS; runtime storage inside `public/` or a container filesystem is not relied on. Install Sharp's native dependencies for the deployment platform with `npm ci`, and configure the reverse proxy to allow the supported upload size.

No functional blocker remains for the requested local implementation. Four pre-existing lint warnings remain. PDF preview frames and download links were exercised, but individual PDF page contents were not visually audited. External hosting, multi-instance load testing and infrastructure backup/restore were not performed. This folder has no `.git` directory, so a repository diff could not be produced; the source changes and preservation hashes were checked directly.

## Created and modified files

Created:

- `src/app/admin/layout.tsx`
- `src/app/admin/admin.css`
- `src/app/admin/background/page.tsx`
- `src/app/admin/circulars/page.tsx`
- `src/app/admin/documents/page.tsx`
- `src/components/admin/AdminShell.tsx`
- `src/components/admin/BackgroundManager.tsx`
- `src/components/admin/DocumentsManager.tsx`
- `src/components/admin/ImagePicker.tsx`
- `src/components/admin/ConfirmDialog.tsx`
- `src/lib/background-types.ts`
- `src/server/homepage-background.ts`
- `tests/dashboard-integration.mjs`
- `tests/helpers/dashboard-browser.mjs`
- `ADMIN_DASHBOARD_REPORT.md`

Modified:

- `src/app/admin/dashboard/page.tsx`
- `src/app/admin/sections/page.tsx`
- `src/components/admin/AdminDashboard.tsx`
- `src/components/admin/SectionsManager.tsx`
- `src/components/admin/ContentStudio.tsx`
- `src/components/admin/CircularManager.tsx`
- `src/components/public/home/HomeExperience.tsx`
- `src/components/public/CmsRuntime.tsx`
- `src/lib/dynamic-sections.ts`
- `src/lib/media.ts`
- `src/app/api/admin/sections/[kind]/route.ts`
- `src/app/api/admin/media/route.ts`
- `src/app/api/admin/content/route.ts`
- `tests/admin-integration.mjs`
- `tests/source-audit.test.mjs`
- `package.json`
- `package-lock.json`
- `README.md`
- `TEST_REPORT.md`

Next.js also regenerates `next-env.d.ts` when switching between build/dev. Build caches and browser verification artifacts are ignored local output. Credentials, `.env.local`, original asset files and seeding commands were not changed.
