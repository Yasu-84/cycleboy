#!/usr/bin/env node
/**
 * データ削除実行エントリポイント
 * GitHub Actions および npm run cleanup から実行される
 *
 * 使い方:
 *   npx tsx scripts/cleanup.ts
 */
import * as cleanupService from '@/lib/services/cleanupService';

console.log('[cleanup] start');

cleanupService
    .run({ triggerSource: 'cron' })
    .then((result) => {
        console.log('[cleanup] done', JSON.stringify(result.deleted, null, 2));
        process.exit(result.success ? 0 : 1);
    })
    .catch((err: unknown) => {
        console.error('[cleanup] fatal', err);
        process.exit(1);
    });
