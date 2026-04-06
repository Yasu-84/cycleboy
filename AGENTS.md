# AGENTS.md — CycleBoy

Keirin (競輪) race scraping & AI prediction system. Next.js 16 + Supabase + Gemini API. Japanese-language codebase.

## Commands

```bash
npm run dev          # Next.js dev server (localhost:3000)
npm run build        # Production build (also run by Vercel)
npm run lint         # ESLint (next/core-web-vitals + next/typescript)
npm run scrape       # tsx scripts/scrape.ts [step] [target_date]
npm run cleanup      # tsx scripts/cleanup.ts
npm run check-env    # tsx scripts/check-env.ts — verify env vars are set
```

There is **no test framework**. Files like `scripts/test_*.ts` are ad-hoc debugging scripts, not a test suite. Do not attempt `npm test`.

## Architecture

```
src/
  app/               # Next.js App Router
    api/admin/       # Admin routes (require x-admin-api-key header)
    api/cron/        # Cron-triggered routes (scrape, cleanup)
    api/health/      # Health check endpoint
    race/            # Race entry pages
  lib/
    scrapers/        # HTML scrapers (cheerio, puppeteer)
    repositories/    # Supabase data access
    services/        # Business logic (scrapeService, predictionService, cleanupService)
    supabase/client  # Server-side Supabase client (SERVICE_ROLE_KEY, bypasses RLS)
    utils/           # Shared utilities
  types/             # TypeScript type definitions
scripts/             # Standalone scripts run via tsx (also called from GitHub Actions)
docs/migrations/     # Supabase SQL migrations
```

## Key facts

- **Path alias**: `@/*` → `./src/*`
- **Scrape entry point** (`scripts/scrape.ts`) handles both scraping and prediction. Steps: `all | schedule | program | entry | prediction`. Prediction is invoked as a step, not a separate script.
- **Supabase client** (`src/lib/supabase/client.ts`) uses the service role key and bypasses RLS. Server-side only — never expose to the client.
- **Admin API routes** authenticate via `x-admin-api-key` header checked against `ADMIN_API_KEY` env var. These routes proxy to GitHub Actions `workflow_dispatch` rather than running work inline (avoids Vercel hobby 10s timeout).
- **Scripts run via `tsx`**, not compiled output. `tsconfig.scripts.json` exists but is for IDE support only.
- **GitHub Actions** (3 workflows): `scrape.yml` (daily cron JST 05:15), `cleanup.yml` (daily cron JST 05:00), `prediction.yml` (manual only). All use `npx tsx scripts/xxx.ts`.
- **Required env vars**: See `.env.local.example`. Minimum for dev: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_API_KEY`, `GEMINI_API_KEY`.
- **Gemini model** defaults to `gemini-2.0-flash-exp` in code but `gemini-1.5-flash` in CI secrets — be aware of this discrepancy.

## Conventions

- Language: comments, docs, and UI text are in Japanese
- Lint config: flat ESLint config (`eslint.config.mjs`) with `next/core-web-vitals` and `next/typescript` presets
- No state management library — React components use local state
- CSS: check existing components for the styling approach before adding new ones
