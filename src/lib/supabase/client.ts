import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase クライアント（Service Role）
 * - サーバーサイド（Next.js Route Handler / GitHub Actions スクリプト）専用
 * - RLS をバイパスして書き込み操作が可能
 * - クライアントサイドには絶対に露出させないこと
 */
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
        'Missing Supabase environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.'
    );
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        // サーバーサイドではセッションを永続化しない
        persistSession: false,
        autoRefreshToken: false,
    },
});
