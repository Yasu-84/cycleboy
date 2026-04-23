export const PREFECTURE_TO_REGION: Record<string, string> = {
    // 北日本
    北海道: '北日本ライン',
    青森: '北日本ライン',
    岩手: '北日本ライン',
    宮城: '北日本ライン',
    秋田: '北日本ライン',
    山形: '北日本ライン',
    福島: '北日本ライン',
    // 関東
    茨城: '関東ライン',
    栃木: '関東ライン',
    群馬: '関東ライン',
    埼玉: '関東ライン',
    東京: '関東ライン',
    新潟: '関東ライン',
    山梨: '関東ライン',
    長野: '関東ライン',
    // 南関東
    千葉: '南関東ライン',
    神奈川: '南関東ライン',
    神奈: '南関東ライン', // 略称対応
    静岡: '南関東ライン',
    // 中部
    岐阜: '中部ライン',
    三重: '中部ライン',
    愛知: '中部ライン',
    富山: '中部ライン',
    石川: '中部ライン',
    // 近畿
    福井: '近畿ライン',
    滋賀: '近畿ライン',
    京都: '近畿ライン',
    奈良: '近畿ライン',
    大阪: '近畿ライン',
    兵庫: '近畿ライン',
    和歌山: '近畿ライン',
    // 中四国
    鳥取: '中四国ライン',
    島根: '中四国ライン',
    岡山: '中四国ライン',
    広島: '中四国ライン',
    山口: '中四国ライン',
    徳島: '中四国ライン',
    香川: '中四国ライン',
    愛媛: '中四国ライン',
    高知: '中四国ライン',
    // 九州
    福岡: '九州ライン',
    佐賀: '九州ライン',
    長崎: '九州ライン',
    大分: '九州ライン',
    熊本: '九州ライン',
    宮崎: '九州ライン',
    鹿児島: '九州ライン',
    沖縄: '九州ライン',
};

export function getRegionFromPrefecture(prefecture: string): string {
    const normalized = prefecture.replace(/[都道府県]$/, '');
    return PREFECTURE_TO_REGION[normalized] || PREFECTURE_TO_REGION[prefecture] || '不明ライン';
}

export function determineLineName(prefectures: string[]): string {
    if (prefectures.length === 0) return '不明ライン';
    if (prefectures.length === 1) return '単騎';

    const regions = prefectures.map(getRegionFromPrefecture).filter(r => r !== '不明ライン');
    
    if (regions.length === 0) return '不明ライン';

    const counts: Record<string, number> = {};
    for (const r of regions) {
        counts[r] = (counts[r] || 0) + 1;
    }

    const uniqueRegions = Object.keys(counts);

    // 全て同じ地区
    if (uniqueRegions.length === 1) {
        return uniqueRegions[0];
    }

    // 全て異なる場合 (人数がそのまま uniqueRegions の数)
    if (uniqueRegions.length === regions.length) {
        if (uniqueRegions.length === 2 && uniqueRegions.includes('関東ライン') && uniqueRegions.includes('南関東ライン')) {
            return '東日本ライン';
        }
        return '混合ライン';
    }

    // 異なる地区が混ざっているが、被りがある場合
    let maxCount = 0;
    for (const region of uniqueRegions) {
        if (counts[region] > maxCount) {
            maxCount = counts[region];
        }
    }
    
    const maxRegions = uniqueRegions.filter(r => counts[r] === maxCount);

    // 最大派閥が1つの場合
    if (maxRegions.length === 1) {
        return maxRegions[0];
    }

    // 最大派閥が複数ある場合（同数）
    if (maxRegions.length === 2 && maxRegions.includes('関東ライン') && maxRegions.includes('南関東ライン')) {
        return '東日本ライン';
    }

    return '混合ライン';
}
