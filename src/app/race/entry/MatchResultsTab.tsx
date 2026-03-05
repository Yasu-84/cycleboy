'use client';

import type { RaceMatchResult } from '@/types/raceMatchResult';
import styles from './entry.module.css';

interface MatchResultsTabProps {
    results: RaceMatchResult[];
}

function getWakuClass(wakuNo: number): string {
    return `waku-${wakuNo}`;
}

function getCellStyle(value: string | null): string {
    if (!value || value === '-') return '';
    const parts = value.split('-');
    if (parts.length !== 2) return '';
    const wins = parseInt(parts[0], 10);
    const losses = parseInt(parts[1], 10);
    if (isNaN(wins) || isNaN(losses)) return '';
    if (wins > losses) return styles.cellWin;
    if (wins < losses) return styles.cellLose;
    return '';
}

export default function MatchResultsTab({ results }: MatchResultsTabProps) {
    if (results.length === 0) {
        return <div className="empty-message">対戦表データがまだ取得されていません</div>;
    }

    return (
        <div className={styles.tableWrapper}>
            <table className={styles.matchTable}>
                <thead>
                    <tr>
                        <th className={`${styles.stickyCol} ${styles.colWaku}`}>枠</th>
                        <th className={`${styles.stickyCol} ${styles.colSha}`}>車</th>
                        <th className={`${styles.stickyCol} ${styles.colPlayerShort}`}>選手名</th>
                        <th className={styles.colMatch}>総合</th>
                        {results.map((r) => (
                            <th key={r.sha_no} className={styles.colMatch}>
                                <span className={`${styles.matchHeaderBadge} ${getWakuClass(r.waku_no)}`}>
                                    {r.sha_no}
                                </span>
                                <br />
                                <span className={styles.matchHeaderName}>
                                    {r.player_name.slice(0, 3)}
                                </span>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {results.map((row) => (
                        <tr key={row.sha_no}>
                            <td className={`${styles.stickyCol} ${styles.colWaku} ${styles.wakuCell}`}>
                                <span className={`${styles.wakuBadge} ${getWakuClass(row.waku_no)}`}>{row.waku_no}</span>
                            </td>
                            <td className={`${styles.stickyCol} ${styles.colSha} ${styles.wakuCell}`}>
                                <span className={`${styles.wakuBadge} ${getWakuClass(row.waku_no)}`}>{row.sha_no}</span>
                            </td>
                            <td className={`${styles.stickyCol} ${styles.colPlayerShort}`}>
                                <strong>{row.player_name}</strong>
                            </td>
                            <td className={`${styles.colMatch} ${styles.totalCell}`}>
                                {row.total ?? '—'}
                            </td>
                            {results.map((col) => {
                                const key = String(col.sha_no);
                                const value = row.vs_records[key] ?? null;
                                const isSelf = row.sha_no === col.sha_no;
                                return (
                                    <td
                                        key={col.sha_no}
                                        className={`${styles.colMatch} ${isSelf ? styles.cellSelf : getCellStyle(value)}`}
                                    >
                                        {isSelf ? '-' : (value ?? '')}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* 凡例 */}
            <div className={styles.legend}>
                <span className={styles.legendTitle}>■ 凡例</span>
                <span>勝-敗 : 直接対戦成績</span>
                <span>- : 自分自身</span>
                <span>空欄 : 対戦履歴なし</span>
                <span className={styles.legendWin}>● 勝ち越し</span>
                <span className={styles.legendLose}>● 負け越し</span>
            </div>
        </div>
    );
}
