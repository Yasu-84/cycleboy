import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import styles from './page.module.css';

// ------------------------------------------------------------------
// 型定義
// ------------------------------------------------------------------
interface RaceListItem {
    netkeiba_race_id: string;
    race_no: number;
    race_title: string;
    departure_time: string;
    deadline_time: string;
    car_count: number;
}

interface VenueInfo {
    jyo_name: string;
    grade: string;
    kaisai_name: string;
    program_type: string;
    kaisai_type: string[] | null;
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

function getKaisaiTypeBadge(types: string[] | null): { label: string; className: string; icon: string }[] {
    if (!types) return [];
    const map: Record<string, { className: string; icon: string }> = {
        'モーニング': { className: 'kaisai-morning', icon: '🌅' },
        'ナイター': { className: 'kaisai-nighter', icon: '🌃' },
        'ミッドナイト': { className: 'kaisai-midnight', icon: '🌑' },
        'ガールズ': { className: 'kaisai-girls', icon: '👩' },
    };
    return types
        .filter((t) => map[t])
        .map((t) => ({ label: t, ...map[t] }));
}

function formatTime(time: string): string {
    // HH:MM:SS -> HH:MM
    return time.slice(0, 5);
}

function getRaceNoBgColor(raceNo: number): string {
    return '#FFFFFF';
}

function getRaceNoTextColor(raceNo: number): string {
    return '#333';
}

// ------------------------------------------------------------------
// データ取得
// ------------------------------------------------------------------
async function getRaces(dateStr: string, jyoCd: string): Promise<{
    venue: VenueInfo | null;
    races: RaceListItem[];
}> {
    // dateStr: YYYYMMDD -> YYYY-MM-DD
    const targetDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;

    // まず venue 情報を取得
    const { data: progData, error: progErr } = await supabase
        .from('programs')
        .select(`
      program_type,
      kaisai_type,
      id,
      race_schedules!inner (
        jyo_name,
        grade,
        kaisai_name,
        jyo_cd
      )
    `)
        .eq('kaisai_date', targetDate)
        .eq('race_schedules.jyo_cd', jyoCd)
        .limit(1)
        .maybeSingle();

    if (progErr) throw new Error(`[getRaces/venue] ${progErr.message}`);

    if (!progData) return { venue: null, races: [] };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rs = (progData as any).race_schedules;
    const venue: VenueInfo = {
        jyo_name: rs.jyo_name,
        grade: rs.grade,
        kaisai_name: rs.kaisai_name,
        program_type: progData.program_type,
        kaisai_type: progData.kaisai_type,
    };

    // レース一覧取得
    const { data: raceData, error: raceErr } = await supabase
        .from('races')
        .select('netkeiba_race_id, race_no, race_title, departure_time, deadline_time, car_count')
        .eq('program_id', progData.id)
        .order('race_no', { ascending: true });

    if (raceErr) throw new Error(`[getRaces/races] ${raceErr.message}`);

    return { venue, races: raceData ?? [] };
}

// ------------------------------------------------------------------
// Page Component
// ------------------------------------------------------------------
export const revalidate = 60;

export default async function RaceListPage({
    searchParams,
}: {
    searchParams: Promise<{ date?: string; jyo_cd?: string }>;
}) {
    const params = await searchParams;
    const dateStr = params.date ?? '';
    const jyoCd = params.jyo_cd ?? '';

    if (!dateStr || !jyoCd) {
        return (
            <div className="container">
                <div className="error-message">パラメータが不足しています</div>
            </div>
        );
    }

    const { venue, races } = await getRaces(dateStr, jyoCd);

    if (!venue) {
        return (
            <div className="container">
                <div className="empty-message">開催データが見つかりません</div>
            </div>
        );
    }

    return (
        <div className="container">
            {/* 戻るリンク */}
            <div className={styles.topNav}>
                <Link href="/" className={styles.backLink}>← 戻る</Link>
            </div>

            {/* 競輪場ヘッダー */}
            <div className={styles.venueHeader}>
                <div className={styles.venueTop}>
                    <span
                        className={`grade-badge ${getGradeBadgeClass(venue.grade)}`}
                        aria-label={`グレード ${getGradeLabel(venue.grade)}`}
                    >
                        {getGradeLabel(venue.grade)}
                    </span>
                    <h1 className={styles.venueName}>{venue.jyo_name}競輪場</h1>
                </div>
                <div className={styles.venueInfo}>
                    <span>{venue.kaisai_name}</span>
                    <span className={styles.separator}>─</span>
                    <span>{venue.program_type}</span>
                </div>
                <div className={styles.venueBadges}>
                    {getKaisaiTypeBadge(venue.kaisai_type).map((badge) => (
                        <span
                            key={badge.label}
                            className={`kaisai-badge ${badge.className}`}
                        >
                            {badge.icon} {badge.label}
                        </span>
                    ))}
                </div>
            </div>

            {/* レース一覧 */}
            {races.length === 0 ? (
                <div className="empty-message">レースプログラムがありません</div>
            ) : (
                <div className={styles.raceList}>
                    {races.map((race) => (
                        <Link
                            key={race.netkeiba_race_id}
                            href={`/race/entry?race_id=${race.netkeiba_race_id}`}
                            className={styles.raceCard}
                        >
                            <div
                                className={styles.raceNo}
                                style={{
                                    backgroundColor: getRaceNoBgColor(race.race_no),
                                    color: getRaceNoTextColor(race.race_no),
                                    border: '1px solid #CCC',
                                }}
                            >
                                {race.race_no}R
                            </div>
                            <div className={styles.raceBody}>
                                <div className={styles.raceTitle}>{race.race_title}</div>
                                <div className={styles.raceMeta}>
                                    <span>発走 {formatTime(race.departure_time)}</span>
                                    <span className={styles.metaSep}>｜</span>
                                    <span>締切 {formatTime(race.deadline_time)}</span>
                                    <span className={styles.metaSep}>｜</span>
                                    <span>{race.car_count}車</span>
                                </div>
                            </div>
                            <div className={styles.raceArrow}>▶</div>
                        </Link>
                    ))}
                </div>
            )}

            {/* 下部戻るボタン */}
            <div className={styles.topNav}>
                <Link href="/" className={`${styles.backLink} ${styles.backLinkBottom}`}>← 戻る</Link>
            </div>
        </div>
    );
}
