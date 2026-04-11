# AGENTS.md — CycleBoy

Keirin (競輪) race scraping & AI prediction system. Next.js 16 + Supabase + Gemini API. Japanese-language codebase.

## Commands

```bash
npm run dev          # Next.js dev server (localhost:3000)
npm run build        # Production build (also run by Vercel)
npm run lint         # ESLint (flat config, next/core-web-vitals + next/typescript)
npm run scrape       # tsx scripts/scrape.ts [step] [target_date]
npm run cleanup      # tsx scripts/cleanup.ts
npm run check-env    # tsx scripts/check-env.ts — verify env vars are set
```

There is **no test framework**. Files like `scripts/test_*.ts` are ad-hoc debugging scripts, not a test suite. Do not attempt `npm test`.

## Architecture

```
src/
  app/
    admin/           # Admin management page
    api/admin/       # Admin routes (x-admin-api-key header → proxy to GitHub Actions)
    api/cron/        # Vercel Cron routes (CRON_SECRET auth, run work inline)
    api/health/      # Health check endpoint
    components/      # Shared UI components (Header)
    race/            # Race entry detail pages
    race_list/       # Race list page
  lib/
    scrapers/        # HTML scrapers (axios + cheerio; puppeteer available)
    repositories/    # Supabase data access layer
    services/        # Business logic (scrapeService, predictionService, cleanupService)
    supabase/client  # Server-side Supabase client (SERVICE_ROLE_KEY, bypasses RLS)
    utils/           # Shared utilities (dateUtils, arrayUtils, authUtils, gradeUtils)
  types/             # TypeScript type definitions
scripts/             # Standalone scripts run via tsx (also called from GitHub Actions)
docs/migrations/     # Supabase SQL migrations
```

## Key facts

- **Path alias**: `@/*` → `./src/*`
- **Scrape entry point** (`scripts/scrape.ts`) handles both scraping and prediction. Steps: `all | schedule | program | entry | prediction`. Prediction is invoked as a step, not a separate script.
- **Supabase client** (`src/lib/supabase/client.ts`) uses `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (not the `NEXT_PUBLIC_*` vars). Server-side only — never expose to the client.
- **Two auth mechanisms for API routes**:
  - `/api/admin/*`: `x-admin-api-key` header → proxies to GitHub Actions `workflow_dispatch` (avoids Vercel hobby 10s timeout)
  - `/api/cron/*`: `CRON_SECRET` Bearer token → runs work inline
- **Job locking**: `scrapeService` uses the `job_runs` table for concurrency control — prevents duplicate scrape runs.
- **Scripts run via `tsx`**, not compiled output. `tsconfig.scripts.json` exists but is for IDE support only.
- **GitHub Actions** (5 workflows): `scrape.yml` (daily cron JST 05:15), `result.yml` (daily cron JST 23:00), `cleanup.yml` (daily cron JST 05:00), `prediction.yml` (manual only), `ci.yml` (PR/push to main). All use `npx tsx scripts/xxx.ts`. Note: `scrape.yml` offers `all|schedule|program|entry|result` as inputs, and `prediction.yml` calls `scrape.ts prediction` directly.
- **Required env vars**: See `.env.local.example`. Minimum for dev: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_API_KEY`, `GEMINI_API_KEY`. GitHub Actions additionally need `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_TOKEN`.
- **Gemini model**: Code defaults to `gemini-2.0-flash-exp` but CI secrets set `gemini-1.5-flash` — this is intentional, not a bug to fix.
- **Rate limiting**: `SCRAPE_DELAY_MS` env var (default 500ms) controls delay between scrape requests.

## Conventions

- Language: comments, docs, and UI text are in Japanese
- CSS: CSS Modules (`.module.css`). Global CSS variables defined in `src/app/globals.css` (昭和レトロ design system)
- No state management library — React components use local state
- Lint config: flat ESLint config (`eslint.config.mjs`) with `next/core-web-vitals` and `next/typescript` presets
