/**
 * 環境変数チェックスクリプト
 * 必須の環境変数が正しく設定されているかを確認する
 */

import { config } from 'dotenv';

// .env.localを読み込む
config({ path: '.env.local' });

interface EnvVarConfig {
    name: string;
    required: boolean;
    description: string;
}

const ENV_VARS: EnvVarConfig[] = [
    {
        name: 'SUPABASE_URL',
        required: true,
        description: 'SupabaseプロジェクトのURL',
    },
    {
        name: 'SUPABASE_SERVICE_ROLE_KEY',
        required: true,
        description: 'Supabase Service Roleキー',
    },
    {
        name: 'ADMIN_API_KEY',
        required: true,
        description: '管理画面APIキー',
    },
    {
        name: 'GEMINI_API_KEY',
        required: true,
        description: 'Gemini APIキー',
    },
    {
        name: 'GEMINI_MODEL',
        required: false,
        description: 'Geminiモデル名（デフォルト: gemini-2.0-flash-exp）',
    },
    {
        name: 'GITHUB_OWNER',
        required: false,
        description: 'GitHubリポジトリオーナー名',
    },
    {
        name: 'GITHUB_REPO',
        required: false,
        description: 'GitHubリポジトリ名',
    },
    {
        name: 'GITHUB_TOKEN',
        required: false,
        description: 'GitHub Personal Access Token',
    },
    {
        name: 'SCRAPE_DELAY_MS',
        required: false,
        description: 'スクレイピング遅延時間（ミリ秒）',
    },
];

function checkEnvVars(): void {
    console.log('🔍 環境変数チェックを開始します...\n');

    let hasErrors = false;
    const missingVars: string[] = [];
    const presentVars: string[] = [];

    for (const envVar of ENV_VARS) {
        const value = process.env[envVar.name];
        const isSet = !!value;

        if (envVar.required && !isSet) {
            console.error(`❌ ${envVar.name}: 未設定（必須）`);
            console.error(`   説明: ${envVar.description}`);
            missingVars.push(envVar.name);
            hasErrors = true;
        } else if (!isSet) {
            console.warn(`⚠️  ${envVar.name}: 未設定（オプション）`);
            console.warn(`   説明: ${envVar.description}`);
        } else {
            console.log(`✅ ${envVar.name}: 設定済み`);
            if (envVar.name === 'GEMINI_MODEL') {
                console.log(`   値: ${value}`);
            } else if (envVar.name === 'SCRAPE_DELAY_MS') {
                console.log(`   値: ${value}ms`);
            } else {
                console.log(`   値: ${value!.substring(0, 10)}${value!.length > 10 ? '...' : ''}`);
            }
            presentVars.push(envVar.name);
        }
        console.log('');
    }

    console.log('---');
    console.log(`✅ 設定済み: ${presentVars.length}個`);
    console.log(`❌ 未設定（必須）: ${missingVars.length}個`);

    if (hasErrors) {
        console.error('\n❌ 必須の環境変数が不足しています:');
        console.error(missingVars.map(v => `  - ${v}`).join('\n'));
        console.error('\n.env.localファイルにこれらの環境変数を設定してください。');
        console.error('詳細は .env.local.example を参照してください。');
        process.exit(1);
    } else {
        console.log('\n✅ すべての必須環境変数が正しく設定されています！');
        process.exit(0);
    }
}

checkEnvVars();
