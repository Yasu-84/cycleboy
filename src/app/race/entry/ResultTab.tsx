'use client';

import type { RaceResult } from '@/types/raceResult';
import type { RaceRefund } from '@/types/raceRefund';
import styles from './entry.module.css';

interface ResultTabProps {
    results: RaceResult[];
    refunds: RaceRefund[];
}

function getRankClass(rank: number): string {
    if (rank === 1) return styles.rank1;
    if (rank === 2) return styles.rank2;
    if (rank === 3) return styles.rank3;
    return '';
}

function formatPayout(value: number): string {
    return value.toLocaleString() + '円';
}

export default function ResultTab({ results, refunds }: ResultTabProps) {
    if (results.length === 0) {
        return <div className="empty-message">レース結果はまだ確定していません</div>;
    }

    return (
        <div className={styles.resultWrapper}>
            {/* 着順テーブル */}
            <div className={styles.resultSection}>
                <h3 className={styles.resultSectionTitle}>着順</h3>
                <div className={styles.tableScroll}>
                    <table className={styles.entryTable}>
                        <thead>
                            <tr>
                                <th className={styles.colNarrow}>着</th>
                                <th className={styles.colNarrow}>枠</th>
                                <th className={styles.colNarrow}>車</th>
                                <th className={styles.colPlayerShort}>選手名</th>
                                <th className={styles.colNarrow}>着差</th>
                                <th className={styles.colNarrow}>上り</th>
                                <th className={styles.colNarrow}>決</th>
                                <th className={styles.colNarrow}>SB</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((r) => (
                                <tr key={r.sha_no}>
                                    <td className={`${styles.colNarrow} ${getRankClass(r.rank)}`}>
                                        {r.rank}
                                    </td>
                                    <td className={styles.colNarrow}>
                                        <span className={`${styles.wakuBadge} ${styles.shaBadge}`}>
                                            {r.waku_no}
                                        </span>
                                    </td>
                                    <td className={styles.colNarrow}>
                                        <span className={`${styles.wakuBadge} ${styles.shaBadge}`}>
                                            {r.sha_no}
                                        </span>
                                    </td>
                                    <td className={styles.colPlayerShort}>
                                        <span className={styles.playerName}>{r.player_name}</span>
                                    </td>
                                    <td className={styles.colNarrow}>{r.margin ?? ''}</td>
                                    <td className={styles.colNarrow}>
                                        {r.last_lap !== null ? r.last_lap.toFixed(1) : ''}
                                    </td>
                                    <td className={styles.colNarrow}>{r.move_type ?? ''}</td>
                                    <td className={styles.colNarrow}>{r.sb_flag ?? ''}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 払戻金テーブル */}
            {refunds.length > 0 && (
                <div className={styles.resultSection}>
                    <h3 className={styles.resultSectionTitle}>払戻金</h3>
                    <div className={styles.tableScroll}>
                        <table className={styles.entryTable}>
                            <thead>
                                <tr>
                                    <th className={styles.colBetType}>券種</th>
                                    <th className={styles.colCombination}>結果</th>
                                    <th className={styles.colPayout}>払戻金</th>
                                    <th className={styles.colNarrow}>人気</th>
                                </tr>
                            </thead>
                            <tbody>
                                {refunds.map((rf, i) => (
                                    <tr key={`${rf.bet_type}-${rf.combination}-${i}`}>
                                        <td className={styles.colBetType}>{rf.bet_type}</td>
                                        <td className={styles.colCombination}>{rf.combination}</td>
                                        <td className={`${styles.colPayout} ${rf.payout >= 10000 ? styles.highPayout : ''}`}>
                                            {formatPayout(rf.payout)}
                                        </td>
                                        <td className={styles.colNarrow}>
                                            {rf.popularity !== null ? `${rf.popularity}人気` : ''}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
