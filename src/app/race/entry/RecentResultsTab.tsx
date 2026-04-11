'use client';

import type { RaceRecentResult, RecentSession, RaceResult } from '@/types/raceRecentResult';
import styles from './entry.module.css';

interface RecentResultsTabProps {
    results: RaceRecentResult[];
}

function getWakuClass(wakuNo: number): string {
    return `waku-${wakuNo}`;
}

function getRankClass(rank: number | string): string {
    if (rank === 1) return 'rank-1';
    if (rank === 2) return 'rank-2';
    if (rank === 3) return 'rank-3';
    return 'rank-out';
}

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

function formatSessionDate(dateStr: string): string {
    // DB内では "M/D" 形式 (例: "3/5") で格納されている
    if (dateStr.includes('/')) return dateStr;
    // YYYY-MM-DD 形式の場合もフォールバック
    const d = new Date(dateStr + 'T00:00:00+09:00');
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getMonth() + 1}/${d.getDate()}`;
}

function renderRaces(races: RaceResult[]) {
    return (
        <div className={styles.recentRaces}>
            {races.map((r, i) => (
                <div key={i} className={styles.recentRaceCell}>
                    <div className={styles.recentRaceName}>{r.race_name}</div>
                    <div className={getRankClass(typeof r.rank === 'number' ? r.rank : 99)}>
                        {r.rank}
                    </div>
                </div>
            ))}
        </div>
    );
}

function renderSession(session: RecentSession | null, label: string) {
    if (!session) {
        return (
            <div className={styles.recentCol}>
                <div className={styles.recentColHeader}>
                    <span className={styles.recentLabel}>{label}</span>
                </div>
                <div className={styles.recentEmpty}>—</div>
            </div>
        );
    }

    return (
        <div className={styles.recentCol}>
            <div className={styles.recentColHeader}>
                <span className={styles.recentDate}>{formatSessionDate(session.kaisai_date)}</span>
                <span className={`grade-badge ${getGradeBadgeClass(session.grade)} ${styles.gradeBadgeSmall}`}>
                    {getGradeLabel(session.grade)}
                </span>
                <span className={styles.recentJyo}>{session.jyo_name}</span>
            </div>
            {renderRaces(session.races)}
        </div>
    );
}

export default function RecentResultsTab({ results }: RecentResultsTabProps) {
    if (results.length === 0) {
        return <div className="empty-message">直近成績データがまだ取得されていません</div>;
    }

    return (
        <div className={styles.tableWrapper}>
            <table className={styles.entryTable}>
                <thead>
                    <tr>
                        <th className={`${styles.stickyCol} ${styles.colWaku}`}>枠</th>
                        <th className={`${styles.stickyCol} ${styles.colSha}`}>車</th>
                        <th className={`${styles.stickyCol} ${styles.colPlayer}`}>選手名<br /><span className={styles.subHead}>府県 年齢 期別 級班</span></th>
                        <th className={styles.colRecent}>今節</th>
                        <th className={styles.colRecent}>直近1</th>
                        <th className={styles.colRecent}>直近2</th>
                        <th className={styles.colRecent}>直近3</th>
                    </tr>
                </thead>
                <tbody>
                    {results.map((r) => (
                        <tr key={r.sha_no}>
                            <td className={`${styles.stickyCol} ${styles.colWaku} ${styles.wakuCell}`}>
                                <span className={`${styles.wakuBadge} ${styles.shaBadge}`}>{r.waku_no}</span>
                            </td>
                            <td className={`${styles.stickyCol} ${styles.colSha} ${styles.wakuCell}`}>
                                <span className={`${styles.wakuBadge} ${getWakuClass(r.sha_no)}`}>{r.sha_no}</span>
                            </td>
                            <td className={`${styles.stickyCol} ${styles.colPlayer}`}>
                                <div className={styles.playerName}>{r.player_name}</div>
                                <div className={styles.playerMeta}>
                                    {r.prefecture} {r.age}歳 {r.kinen} {r.class_rank}
                                </div>
                            </td>
                            <td className={styles.colRecent}>
                                {r.current_session ? (
                                    <div className={styles.recentCol}>
                                        <div className={styles.recentColHeader}>
                                            <span className={styles.recentLabel}>今節</span>
                                        </div>
                                        {renderRaces(r.current_session.races)}
                                    </div>
                                ) : (
                                    <span className={styles.recentEmpty}>—</span>
                                )}
                            </td>
                            <td className={styles.colRecent}>{renderSession(r.recent1, '直近1')}</td>
                            <td className={styles.colRecent}>{renderSession(r.recent2, '直近2')}</td>
                            <td className={styles.colRecent}>{renderSession(r.recent3, '直近3')}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
