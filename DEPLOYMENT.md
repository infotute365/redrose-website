# Red Rose Academy: Hetzner Ubuntu deployment

These are operator instructions. No live VPS was accessed or deployed to during the audit.
The local HTTPS checks use the official Windows Nginx binary and a temporary localhost
certificate. Ubuntu service management, public DNS, trusted certificates, production
MongoDB authentication and off-site backups still require staging verification.

## 1. Prepare a dedicated application release

Use a supported Ubuntu LTS server, an authenticated private MongoDB service, and a patched
Node.js LTS. The verified Node 24 release for this audit is **24.22.2**. Recheck the
[official Node releases](https://nodejs.org/en/download) before installing a later release.
On a shared VPS, inspect existing services, ports and Nginx sites first. Do not replace
the default site, change another application's Node installation, or reset firewall rules.

On the VPS, after uploading the reviewed project archive to `/tmp/red-rose-source.tar.gz`:

```bash
sudo apt-get update
sudo apt-get install -y nginx ca-certificates curl xz-utils
id redrose || sudo useradd --system --create-home --home-dir /srv/red-rose-academy --shell /usr/sbin/nologin redrose
sudo install -d -o redrose -g redrose -m 0750 /srv/red-rose-academy/releases
sudo install -d -o root -g root -m 0700 /var/backups/red-rose-academy

cd /tmp
NODE_VERSION=v24.22.2
# x64; use linux-arm64 on a Hetzner ARM server.
NODE_ARCH=linux-x64
curl --fail --show-error --location --remote-name "https://nodejs.org/dist/$NODE_VERSION/node-$NODE_VERSION-$NODE_ARCH.tar.xz"
curl --fail --show-error --location --output node-SHASUMS256.txt "https://nodejs.org/dist/$NODE_VERSION/SHASUMS256.txt"
grep " node-$NODE_VERSION-$NODE_ARCH.tar.xz\$" node-SHASUMS256.txt | sha256sum --check -
sudo install -d /opt/red-rose-node
sudo tar -xJf "node-$NODE_VERSION-$NODE_ARCH.tar.xz" --strip-components=1 -C /opt/red-rose-node
/opt/red-rose-node/bin/node --version

RELEASE=$(date -u +%Y%m%dT%H%M%SZ)
sudo install -d -o redrose -g redrose -m 0750 "/srv/red-rose-academy/releases/$RELEASE"
sudo tar -xzf /tmp/red-rose-source.tar.gz -C "/srv/red-rose-academy/releases/$RELEASE"
sudo chown -R redrose:redrose "/srv/red-rose-academy/releases/$RELEASE"
```

Build the archive from the project contents, excluding `.env*` other than `.env.example`,
`.backups`, `.audit`, `.private`, `node_modules`, `.next`, `.git`, logs and coverage.
Keep original `public/`, `data/`, `src/`, `lib/`, `components/`, `scripts/`, package files,
configurations, deployment files and tests. Never transfer a private local backup in the
application archive. Do not copy Windows `node_modules` to Ubuntu.

## 2. Configure private production values

```bash
sudo install -o root -g root -m 0600 /dev/null /etc/red-rose-academy.env
sudoedit /etc/red-rose-academy.env
```

Set `MONGODB_URI` to an authenticated connection with access only to this school's
database, `MONGODB_DATABASE=red_rose_academy`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`,
`APP_ORIGIN=https://YOUR_REAL_DOMAIN`, `JWT_SECRET`, `JWT_ISSUER=red-rose-academy`,
`JWT_AUDIENCE=red-rose-admin`, `TRUST_PROXY=true`, and `PROXY_SHARED_SECRET`.
Use the same issuer, audience and secret on every application instance. `ADMIN_JWT_SECRET`
is obsolete and is never a fallback. Do not use a `NEXT_PUBLIC_` prefix.

Generate each secret separately and paste its output directly into the private file:

```bash
/opt/red-rose-node/bin/node -e 'process.stdout.write(require("node:crypto").randomBytes(64).toString("base64url"))'
```

This operator-only command intentionally displays a new secret; do not run it in shared
logs. Use at least 32 random bytes encoded as base64url, not a sentence. Use a separate
random administrator password of 20–256 characters. Changing the environment password
does not reset an existing account. Set `NODE_ENV=production` in the service, not in the
developer's `.env.local`.

For managed MongoDB, allow only the VPS/private network, enable TLS, create an application
user scoped to `red_rose_academy`, and enable provider backups. For a dedicated local MongoDB,
bind it to loopback and enable authentication using the
[official MongoDB access-control guide](https://www.mongodb.com/docs/manual/tutorial/enable-authentication/).
Create a scoped user with `readWrite` on this database; enter passwords using
`passwordPrompt()` in an authenticated `mongosh` administrator session. Do not change a
shared MongoDB server's authentication or network settings without reviewing its other
clients. Never expose port 27017 to the public internet.

## 3. Install and validate the release

```bash
sudo -u redrose env PATH="/opt/red-rose-node/bin:$PATH" bash -c "cd '/srv/red-rose-academy/releases/$RELEASE' && npm ci && npm run format:check && npx tsc --noEmit && npm run lint && npm run test:security && npm run build && npm audit --omit=dev"
sudo -u redrose mkdir -p "/srv/red-rose-academy/releases/$RELEASE/.next/cache"
```

The build does not need production administrator secrets. It does need any public build
configuration introduced in the future. Current server variables are read at request
time. Keep development packages during the build: Tailwind and shadcn CSS are build inputs.
The shadcn CLI is not a runtime dependency. `npm audit` findings must be reviewed on every
release; a passing audit does not establish that the application has no vulnerabilities.

For an existing deployment, take and verify a database backup **before** changing code.
For the first migration from opaque sessions, use the verified backup directory:

```bash
cd "/srv/red-rose-academy/releases/$RELEASE"
sudo env BACKUP_ROOT=/var/backups/red-rose-academy BACKUP_ENV_FILE=/etc/red-rose-academy.env /opt/red-rose-node/bin/node --env-file=/etc/red-rose-academy.env scripts/backup-database.mjs
# Substitute the actual newly printed backup directory in each following command.
sudo /opt/red-rose-node/bin/node --env-file=/etc/red-rose-academy.env scripts/verify-backup.mjs /var/backups/red-rose-academy/VERIFIED_BACKUP
sudo /opt/red-rose-node/bin/node --env-file=/etc/red-rose-academy.env scripts/migrate-jwt-sessions.mjs /var/backups/red-rose-academy/VERIFIED_BACKUP
sudo /opt/red-rose-node/bin/node --env-file=/etc/red-rose-academy.env scripts/seed-admin.mjs
```

The normal admin seed preserves existing passwords. Do not run `db:seed` or
`--reset-password` as part of a normal deployment. The reset flag is a deliberate
password operation that increments the account version and marks old sessions revoked.

## 4. Run the application on loopback with systemd

Choose port 3300 only after checking it is free. Change both the service and Nginx
upstream together if another application uses it.

```bash
sudo ss -ltnp
sudo ln -s "/srv/red-rose-academy/releases/$RELEASE" /srv/red-rose-academy/current.new
sudo mv -Tf /srv/red-rose-academy/current.new /srv/red-rose-academy/current
sudo install -o root -g root -m 0644 deploy/red-rose-academy.service /etc/systemd/system/red-rose-academy.service
sudo systemctl daemon-reload
sudo systemctl enable --now red-rose-academy
sudo systemctl status red-rose-academy --no-pager
curl --fail http://127.0.0.1:3300/admin/login >/dev/null
```

Only `.next/cache` is writable through this service's filesystem sandbox. Runtime
uploads are in GridFS. If a future Next.js feature needs additional writable storage,
identify its exact directory before adjusting the service. Do not make the source tree
world-writable. `Restart=on-failure` and systemd boot enablement provide process recovery.

## 5. Configure this Nginx site and HTTPS

Point the real domain's DNS at the VPS. First install an HTTP-only site for that domain,
serving `/.well-known/acme-challenge/` from `/var/www/red-rose-acme`; omit the TLS block
until the certificate exists. Keep other virtual hosts untouched. Follow
[Certbot's current Ubuntu/Nginx instructions](https://certbot.eff.org/instructions?ws=nginx&os=snap)
to install Certbot if it is not already available.

```bash
sudo install -d -m 0755 /var/www/red-rose-acme
sudo nginx -t
sudo systemctl reload nginx
sudo certbot certonly --webroot --webroot-path /var/www/red-rose-acme -d YOUR_REAL_DOMAIN
sudo certbot renew --dry-run
```

Copy `deploy/nginx.conf.example` into a new site file, replace **every** `SCHOOL_DOMAIN`
with the real domain, then enable only that site. Create this root-only snippet:

```nginx
proxy_set_header X-Red-Rose-Proxy-Secret "THE_SAME_PRIVATE_PROXY_SHARED_SECRET";
```

```bash
sudo install -d -m 0755 /etc/nginx/snippets
sudo install -o root -g root -m 0600 /dev/null /etc/nginx/snippets/red-rose-proxy-secret.conf
sudoedit /etc/nginx/snippets/red-rose-proxy-secret.conf
sudoedit /etc/nginx/sites-available/red-rose-academy
sudo ln -s /etc/nginx/sites-available/red-rose-academy /etc/nginx/sites-enabled/red-rose-academy
sudo nginx -t
sudo systemctl reload nginx
```

Do not run `nginx -T` into public logs: it expands the private snippet. Nginx overwrites
client-supplied forwarding and proxy-secret headers. The application ignores arbitrary
`X-Forwarded-For`; only a secret-authenticated `X-Real-IP` is used for per-IP limits.
When using Cloudflare or another upstream proxy, configure Nginx's real-IP module only
for that provider's verified address ranges before using its client address. Do not
trust all addresses. The app port must remain loopback-only even with the shared header.
The [Nginx proxy module reference](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
documents the header-overwrite behavior used here.

Do not add a second CSP or publicly cache HTML/admin APIs at Nginx or a CDN. Each HTML
response has a unique nonce and `private, no-store`. Uploaded GridFS asset URLs are
immutable and may be cached. The CSP allows same-origin PDF frames. Styles retain
`unsafe-inline` for existing React/Framer Motion style attributes; production scripts
allow neither `unsafe-inline` nor `unsafe-eval`.

Review the Hetzner firewall and existing UFW rules. Allow the site's HTTP/HTTPS ports
and the existing SSH policy; ensure there is no public rule for application port 3300
or MongoDB port 27017. On a shared host, do not enable/reset UFW or remove another
application's rules. Confirm actual listeners and external reachability from a separate
machine. HSTS applies only to this domain, with no unreviewed `includeSubDomains` policy.

## 6. Backups, monitoring and recovery

Use authenticated MongoDB Database Tools with a root-only `--config` YAML file containing
the URI. Do not put database passwords in command-line arguments. During a maintenance
window or with a backup method providing a consistent snapshot:

```bash
sudo install -o root -g root -m 0600 /dev/null /etc/red-rose-mongodump.yml
sudoedit /etc/red-rose-mongodump.yml
# File contents: uri: "THE_PRIVATE_AUTHENTICATED_MONGODB_URI"
sudo sh -c 'umask 077; mongodump --config=/etc/red-rose-mongodump.yml --db=red_rose_academy --gzip --archive="/var/backups/red-rose-academy/$(date -u +%Y%m%dT%H%M%SZ).archive.gz"'
```

The complete database includes `media.files` **and** `media.chunks`. Back up all collections,
including admin hashes, revocation records, document mappings and seed state. Encrypt
off-site copies, back up the environment separately, define retention and schedule
restore drills. The supplied BSON backup helper is useful for this small application;
it buffers each collection and is not a point-in-time snapshot during concurrent writes.
For larger live databases use managed snapshots or the appropriate replica-set backup
workflow. See [MongoDB backup tools](https://www.mongodb.com/docs/database-tools/mongodump/)
and [restore documentation](https://www.mongodb.com/docs/database-tools/mongorestore/).

Restore into a **new isolated database** before considering any production restoration:

```bash
mongorestore --config=/etc/red-rose-mongodump.yml --gzip --archive=/var/backups/red-rose-academy/SELECTED.archive.gz --nsFrom='red_rose_academy.*' --nsTo='red_rose_restore_drill.*'
```

Do not use `--drop` against production. An application rollback normally changes only
the `current` symlink to a previously verified **JWT-compatible** release and restarts
this service. Keep the same database, issuer/audience and signing secret. Do not roll
back to the insecure partial JWT implementation. Database restoration requires a
separate maintenance decision and a fresh backup of the current state.

```bash
sudo journalctl -u red-rose-academy --since '1 hour ago' --no-pager
sudo systemctl restart red-rose-academy
sudo nginx -t
```

Monitor this service's restart count, response errors, CPU/memory, MongoDB connections,
disk/backup space and certificate renewal. Do not log cookies, request authorization
headers, private proxy headers or environment values. The supported document batch can
contain 200 MiB of file data; Next.js parses multipart uploads in memory. Size the VPS
and concurrency limits accordingly and monitor memory under realistic uploads.

## 7. Required staging acceptance

Verify the real domain, trusted certificate chain, HTTP-to-HTTPS redirect, Secure cookie,
login/logout replay, origin rejection, header spoofing/direct-port denial, every CMS form,
PDF previews/download byte ranges, image persistence after service restart, sitemap and
canonical URLs, mobile layout, and browser console. Test SSH/service reboot recovery,
MongoDB access control, firewall reachability and backup restoration. No production
release is accepted until these environment-specific checks pass.
