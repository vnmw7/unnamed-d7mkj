# Moka Day

A permanent home for Moka's annual birthday experiences. Each year gets its own
self-contained app; the hub ties them together and preserves the archive.

## Structure

```text
/
├── apps/
│   └── hub/               # Permanent site (home, archive) — TanStack Router + Vite
├── experiences/
│   └── 2026/              # 2026 birthday experience — own Vite app, served at /2026/
├── scripts/
│   └── build-site.ts      # Builds the hub and every edition, then assembles dist/
├── package.json           # Bun workspace root + build orchestration
└── .oxlintrc.json
```

Annual editions are independent apps: they own their dependencies, source, and
assets, and are frozen as shipped once archived. The hub never contains
annual creative code.

## Commands

| Command               | What it does                                   |
| --------------------- | ---------------------------------------------- |
| `bun install`         | Install all workspace dependencies             |
| `bun run dev:hub`     | Dev server for the permanent site              |
| `bun run dev:2026`    | Dev server for the 2026 experience             |
| `bun run build`       | Full production assembly into `dist/`          |
| `bun run build:hub`   | Build only the hub                             |
| `bun run build:2026`  | Build only the 2026 experience                 |
| `bun run typecheck`   | Typecheck the hub, all editions, and scripts   |
| `bun run lint`        | Oxlint across the workspace                    |

## Deployment (Cloudflare Pages)

- Build command: `bun run build`
- Build output directory: `dist`
- `/` and `/archive` are the hub SPA. Cloudflare Pages serves unmatched
  navigation paths from the root `index.html` automatically — do **not** add a
  top-level `404.html`, or that SPA fallback is disabled.
- Each edition is a static bundle under `/{year}/` with its own base path.

## Adding a new year

1. Create a fresh Vite app at `experiences/<year>/` with `base: '/<year>/'`.
   Start from the new concept, not from a copy of the previous edition.
2. Add the year to `editionYears` in `scripts/build-site.ts`.
3. Register the edition in `apps/hub/src/data/editions.ts` and flip the
   previous year's `status` to `'archived'`.
4. Optional: if the new edition needs client-side subroutes, add a Pages
   rewrite so unknown `/{year}/*` paths resolve to `/{year}/index.html`.

## Archival policy

Released editions are software snapshots. They change only for critical bugs,
broken browser behavior, dead dependencies, security problems, or asset
failures — never for refactors, style preferences, or newer libraries.
