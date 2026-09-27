# Fan-letter asset pipeline

Offline pipeline that turns approved fan-letter submissions into the
content archive consumed by the 2026 experience's floating-letter orbit.
Publishing content is fully independent of site deployments: new letters
never require rebuilding or redeploying the app.

## Layout

```text
content/fan-letters/raw/    approved submissions (input, not committed unless sample)
experiences/2026/public/fan-letters/   local build output (committed seed sample)
```

Input conventions:

- One letter per file. Images: `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`,
  `.gif`. Text: `.txt` (rendered to a card image by the pipeline).
- Optional `authors.json` sidecar: `{ "<filename>": "Author Name" }`.
- Letter ids are content hashes of the source files, so re-running the
  build is idempotent and duplicate submissions collapse into one letter.

## Commands

| Command                     | What it does                                          |
| --------------------------- | ----------------------------------------------------- |
| `bun run fan-letters:sample`  | Generate sample submissions into `content/fan-letters/raw` |
| `bun run fan-letters:build`   | Normalize, pack atlases, write manifests + `index.json`    |
| `bun run fan-letters:publish` | Upload the built directory to R2 (dry run by default)      |

Build flags: `--in <dir>` (default `content/fan-letters/raw`),
`--out <dir>` (default `experiences/2026/public/fan-letters`).

Publish flags: `--execute` performs the upload, `--out` overrides the
source directory. Requires env vars `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
`R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, optional `R2_KEY_PREFIX`
(e.g. `moka/2026/fan-letters`).

## Output shape

```text
index.json                      stable entry point, short cache TTL
pages/page-000.<hash>.json      per-page manifests (content-addressed)
atlases/page-000.<hash>.webp    1024x1024 preview atlases (mirrored gutters)
full/<letter-hash>.webp         full display assets (long edge <= 1600)
```

All page/manifest/full URLs are content-hashed and immutable; only
`index.json` changes between publications. The build uploads nothing
itself — run the publish script after building. The publish order puts
`index.json` last so a published index never references missing assets.

## Runtime consumption

The 2026 experience fetches `${VITE_FAN_LETTERS_BASE ?? <app base>}fan-letters/index.json`.
Until R2 is provisioned, the committed sample under
`experiences/2026/public/fan-letters/` is served by Cloudflare Pages and
the local Vite dev server.

## One-time R2 setup (Cloudflare dashboard)

1. Create a Standard bucket (e.g. `moka-day-assets`).
2. Connect a custom domain such as `assets.mokaday.com` to the bucket
   (public bucket via custom domain; `r2.dev` is dev-only: rate-limited,
   no CDN caching).
3. Configure the bucket's CORS policy to allow `GET` (and `HEAD`) from
   the site origin(s), required for WebGL textures fetched cross-origin.
4. Add the build-time env var `VITE_FAN_LETTERS_BASE` to the Pages
   project, e.g. `https://assets.mokaday.com/moka/2026/fan-letters`.
5. Create an R2 API token with Object Read & Write for the bucket and
   store its credentials as the publish env vars above.
