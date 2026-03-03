/** 今節成績・直近開催成績内の1レース */
export interface RaceResult {
    race_name: string;
    rank: number;
}

/** 今節成績（current_session）JSONB 構造 */
export interface CurrentSession {
    races: RaceResult[];
}

/** 直近開催成績（recent1〜3）JSONB 構造 */
export interface RecentSession {
    kaisai_date: string; // YYYY-MM-DD
    grade: string;
    jyo_name: string;
    races: RaceResult[];
}

/** race_recent_results テーブルの型定義 */
export interface RaceRecentResult {
    id: string;
    netkeiba_race_id: string;
    waku_no: number;
    sha_no: number;
    player_name: string;
    prefecture: string;
    age: number;
    kinen: string;
    class_rank: string;
    /** 今節成績。開催初日等は null */
    current_session: CurrentSession | null;
    /** 直近1開催成績 */
    recent1: RecentSession | null;
    /** 直近2開催成績 */
    recent2: RecentSession | null;
    /** 直近3開催成績 */
    recent3: RecentSession | null;
    created_at: string;
}

/** race_recent_results INSERT/UPSERT 用の型 */
export type RaceRecentResultInput = Omit<RaceRecentResult, 'id' | 'created_at'>;
