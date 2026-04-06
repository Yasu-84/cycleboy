# CycleBoy - Keirin Prediction AI System

CycleBoy is a specialized system designed to scrape Keirin (Japanese bicycle racing) data, process it, and generate AI-powered race predictions using the Gemini API.

## Project Overview

- **Core Technologies:** Next.js (App Router), TypeScript, Supabase (PostgreSQL), Gemini API.
- **Scraping Engine:** Axios and Cheerio for robust HTML parsing of Keirin data sources (primarily NetKeiba).
- **AI Integration:** Uses Gemini (`gemini-2.0-flash-exp`) to analyze race entries, recent results, and match records to provide structured predictions.
- **Architecture:** 
    - **Frontend:** Next.js pages and API routes for management and display.
    - **Services:** Orchestration logic for multi-step scraping (`scrapeService`) and AI predictions (`predictionService`).
    - **Repositories:** Data access layer interacting with Supabase tables.
    - **Scrapers:** Modular parsers for specific data types (schedules, programs, entries, results).
    - **Automation:** GitHub Actions for scheduled scraping and maintenance tasks.

## Building and Running

### Prerequisites
- Node.js 18+
- Supabase project
- Gemini API Key

### Installation
```bash
npm install
```

### Environment Setup
Create a `.env.local` file with the following:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`, `GEMINI_MODEL` (default: `gemini-2.0-flash-exp`)
- `ADMIN_API_KEY` (for protecting admin routes)
- `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_TOKEN` (for triggering actions)

### Development
```bash
npm run dev
```

### Scraping & Predictions (CLI)
```bash
# Full scraping cycle for today
npm run scrape all

# Specific step (schedule, program, entry, prediction)
npm run scrape <step> [YYYY-MM-DD]

# Cleanup old data (older than 31 days)
npm run cleanup
```

## Core Workflows

### 1. Scraping Lifecycle
The `scrapeService.ts` orchestrates the following steps:
1.  **Schedule:** Fetches grade race schedules for the month.
2.  **Program:** Retrieves race programs for active venues on the target date.
3.  **Entry:** Collects detailed entry sheets (basic info, recent results, and match-up history) for each race.
4.  **Prediction:** Triggers the AI prediction engine for processed races.

### 2. AI Prediction Engine
`predictionService.ts` performs the following:
- Aggregates race data (entries, results, match history) into a structured prompt.
- Calls Gemini API with configurable retry logic and exponential backoff.
- Parses the AI response into seven distinct sections (confidence, development, evaluations, scenarios, etc.).
- Stores results in the `race_predictions` table.

### 3. Maintenance
- **Cleanup:** `cleanupService.ts` automatically removes data older than 31 days to manage database size.
- **Error Handling:** Enhanced error logging captures stack traces and context into `job_errors` for easier debugging of scraping failures.

## Development Conventions

- **Type Safety:** Strict TypeScript usage for all data models and repository interfaces.
- **Surgical Updates:** Use the repository pattern for database interactions to maintain clean service layers.
- **Resilience:** Scrapers use retries and rate limiting (`scrapeDelay`) to avoid being blocked by target sites.
- **Documentation:** SQL migrations and design documents are maintained in the `docs/` directory.

## Key Directories
- `src/app/api`: Serverless functions for cron jobs and admin triggers.
- `src/lib/scrapers`: Site-specific parsing logic.
- `src/lib/services`: Main business logic and orchestration.
- `src/lib/repositories`: Supabase CRUD operations.
- `scripts/`: CLI entry points for automation.
