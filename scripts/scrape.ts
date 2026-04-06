#!/usr/bin/env node
/**
 * スクレイピング実行エントリポイント
 * GitHub Actions および npm run scrape から実行される
 *
 * 使い方:
 *   npx tsx scripts/scrape.ts [step] [target_date]
 *
 * 引数:
 *   step        : all | schedule | program | entry (省略時: all)
 *   target_date : YYYY-MM-DD 形式 (省略時: JST 当日)
 */
import * as scrapeService from '@/lib/services/scrapeService';
import type { JobStep } from '@/types/jobRun';

const VALID_STEPS: JobStep[] = ['all', 'schedule', 'program', 'entry', 'prediction'];

const rawStep = process.argv[2] || 'all';
const targetDate = process.argv[3] || undefined;

// 引数バリデーション
if (!VALID_STEPS.includes(rawStep as JobStep)) {
    console.error(`Invalid step: "${rawStep}". Must be one of: ${VALID_STEPS.join(', ')}`);
    process.exit(1);
}
const step = rawStep as JobStep;

// target_date バリデーション
if (targetDate && !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    console.error(`Invalid target_date: "${targetDate}". Must be YYYY-MM-DD.`);
    process.exit(1);
}

console.log(`[scrape] start  step=${step}  target_date=${targetDate ?? '(JST 当日)'}`);

scrapeService
    .run({ step, targetDate, triggerSource: 'cron' })
    .then((result) => {
        console.log('[scrape] done', JSON.stringify(result.summary, null, 2));
        if (result.errors.length > 0) {
            console.error('[scrape] errors:', result.errors);
        }
        process.exit(result.success ? 0 : 1);
    })
    .catch((err: unknown) => {
        console.error('[scrape] fatal', err);
        process.exit(1);
    });
