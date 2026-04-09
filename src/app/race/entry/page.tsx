import { supabase } from '@/lib/supabase/client';
import type { RaceEntry } from '@/types/raceEntry';
import type { RaceRecentResult } from '@/types/raceRecentResult';
import type { RaceMatchResult } from '@/types/raceMatchResult';
import type { RacePrediction } from '@/types/racePrediction';
import type { RaceResult } from '@/types/raceResult';
import type { RaceRefund } from '@/types/raceRefund';
import EntryTabs from './EntryTabs';
import BackButton from './BackButton';
import styles from './entry.module.css';

// ------------------------------------------------------------------
// 型定義
// ------------------------------------------------------------------
interface RaceInfo {
    race_no: number;
    race_title: string;
    departure_time: string;
    deadline_time: string;
    car_count: number;
    jyo_name: string;
    grade: string;
    kaisai_name: string;
}

// ------------------------------------------------------------------
// ヘルパー
// ------------------------------------------------------------------
function getGradeBadgeClass(grade: string): string {
    const map: Record<string, string> = {
        GP: 'grade-gp', G1: 'grade-g1', G2: 'grade-g2',
        G3: 'grade-g3', F1: 'grade-f1', F2: 'grade-f2',
    };
    return map[grade] ?? 'grade-f2';
}

function getGradeLabel(grade: string): string {
    const map: Record<string, string> = {
        GP: 'GP', G1: 'GI', G2: 'GII', G3: 'GIII', F1: 'FI', F2: 'FII',
    };
    return map[grade] ?? grade;
}

function formatTime(time: string): string {
    return time.slice(0, 5);
}

// ------------------------------------------------------------------
// データ取得
// ------------------------------------------------------------------
async function getRaceInfo(raceId: string): Promise<RaceInfo | null> {
    const { data, error } = await supabase
        .from('races')
        .select(`
      race_no,
      race_title,
      departure_time,
      deadline_time,
      car_count,
      programs!inner (
        race_schedules!inner (
          jyo_name,
          grade,
          kaisai_name
        )
      )
    `)
        .eq('netkeiba_race_id', raceId)
        .maybeSingle();

    if (error) throw new Error(`[getRaceInfo] ${error.message}`);
    if (!data) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rs = (data as any).programs.race_schedules;
    return {
        race_no: data.race_no,
        race_title: data.race_title,
        departure_time: data.departure_time,
        deadline_time: data.deadline_time,
        car_count: data.car_count,
        jyo_name: rs.jyo_name,
        grade: rs.grade,
        kaisai_name: rs.kaisai_name,
    };
}

async function getEntries(raceId: string): Promise<RaceEntry[]> {
    const { data, error } = await supabase
        .from('race_entries')
        .select('*')
        .eq('netkeiba_race_id', raceId)
        .order('sha_no', { ascending: true });

    if (error) throw new Error(`[getEntries] ${error.message}`);
    return (data as RaceEntry[]) ?? [];
}

async function getRecentResults(raceId: string): Promise<RaceRecentResult[]> {
    const { data, error } = await supabase
        .from('race_recent_results')
        .select('*')
        .eq('netkeiba_race_id', raceId)
        .order('sha_no', { ascending: true });

    if (error) throw new Error(`[getRecentResults] ${error.message}`);
    return (data as RaceRecentResult[]) ?? [];
}

async function getMatchResults(raceId: string): Promise<RaceMatchResult[]> {
    const { data, error } = await supabase
        .from('race_match_results')
        .select('*')
        .eq('netkeiba_race_id', raceId)
        .order('sha_no', { ascending: true });

    if (error) throw new Error(`[getMatchResults] ${error.message}`);
    return (data as RaceMatchResult[]) ?? [];
}

async function getRacePrediction(raceId: string): Promise<RacePrediction | null> {
    const { data, error } = await supabase
        .from('race_predictions')
        .select('*')
        .eq('netkeiba_race_id', raceId)
        .maybeSingle();

    if (error) {
        console.error(`[getRacePrediction] ${error.message}`);
        return null;
    }
    return (data as RacePrediction) ?? null;
}

async function getRaceResults(raceId: string): Promise<RaceResult[]> {
    const { data, error } = await supabase
        .from('race_results')
        .select('*')
        .eq('netkeiba_race_id', raceId)
        .order('rank');

    if (error) throw new Error(`[getRaceResults] ${error.message}`);
    return (data as RaceResult[]) ?? [];
}

async function getRaceRefunds(raceId: string): Promise<RaceRefund[]> {
    const { data, error } = await supabase
        .from('race_refunds')
        .select('*')
        .eq('netkeiba_race_id', raceId)
        .order('bet_type');

    if (error) throw new Error(`[getRaceRefunds] ${error.message}`);
    return (data as RaceRefund[]) ?? [];
}

// ------------------------------------------------------------------
// Page Component
// ------------------------------------------------------------------
export const revalidate = 60;

export default async function EntryPage({
    searchParams,
}: {
    searchParams: Promise<{ race_id?: string }>;
}) {
    const params = await searchParams;
    const raceId = params.race_id ?? '';

    if (!raceId) {
        return (
            <div className="container">
                <div className="error-message">レースIDが指定されていません</div>
            </div>
        );
    }

    const [raceInfo, entries, recentResults, matchResults, prediction, raceResults, raceRefunds] = await Promise.all([
        getRaceInfo(raceId),
        getEntries(raceId),
        getRecentResults(raceId),
        getMatchResults(raceId),
        getRacePrediction(raceId),
        getRaceResults(raceId),
        getRaceRefunds(raceId),
    ]);

    if (!raceInfo) {
        return (
            <div className="container">
                <div className="empty-message">レースデータが見つかりません</div>
            </div>
        );
    }

    return (
        <div className="container">
            <div className={styles.topNav}>
                <BackButton />
            </div>


            {/* レースヘッダー */}
            <div className={styles.raceHeader}>
                <div className={styles.raceHeaderTop}>
                    <span className={`grade-badge ${getGradeBadgeClass(raceInfo.grade)}`}>
                        {getGradeLabel(raceInfo.grade)}
                    </span>
                    <span className={styles.raceKaisaiName}>{raceInfo.kaisai_name}</span>
                </div>
                <h1 className={styles.raceTitle}>
                    {raceInfo.jyo_name} {raceInfo.race_no}R {raceInfo.race_title}
                </h1>
                <div className={styles.raceMeta}>
                    発走 {formatTime(raceInfo.departure_time)}
                    <span className={styles.metaSep}>｜</span>
                    締切 {formatTime(raceInfo.deadline_time)}
                    <span className={styles.metaSep}>｜</span>
                    {raceInfo.car_count}車
                </div>
            </div>

            <EntryTabs
                entries={entries}
                recentResults={recentResults}
                matchResults={matchResults}
                prediction={prediction}
                results={raceResults}
                refunds={raceRefunds}
            />

            {/* 下部戻るボタン */}
            <div className={styles.topNav}>
                <BackButton className={styles.backLinkBottom} />
            </div>
        </div>
    );
}
