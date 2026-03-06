'use client';

import type { RaceEntry } from '@/types/raceEntry';
import styles from './entry.module.css';

interface BasicInfoTabProps {
    entries: RaceEntry[];
}

function getWakuClass(wakuNo: number): string {
    return `waku-${wakuNo}`;
}

function formatRate(value: number): string {
    return value.toFixed(1) + '%';
}

function formatScore(value: number): string {
    return value.toFixed(2);
}

function formatGear(value: number): string {
    return value.toFixed(2);
}

export default function BasicInfoTab({ entries }: BasicInfoTabProps) {
    if (entries.length === 0) {
        return <div className="empty-message">出走表データがまだ取得されていません</div>;
    }

    return (
        <div className={styles.tableWrapperNoScroll}>
            <div className={styles.tableScroll}>
                <table className={styles.entryTable}>
                    <thead>
                        <tr>
                            <th className={`${styles.stickyCol} ${styles.colWaku}`}>枠</th>
                            <th className={`${styles.stickyCol} ${styles.colSha}`}>車</th>
                            <th className={`${styles.stickyCol} ${styles.colPlayer}`}>選手名<br /><span className={styles.subHead}>府県 年齢 期別 級班</span></th>
                            <th className={styles.colNum}>得点</th>
                            <th className={styles.colNarrow}>脚質</th>
                            <th className={styles.colNarrow}>S</th>
                            <th className={styles.colNarrow}>B</th>
                            <th className={styles.colNarrow}>逃</th>
                            <th className={styles.colNarrow}>捲</th>
                            <th className={styles.colNarrow}>差</th>
                            <th className={styles.colNarrow}>マ</th>
                            <th className={styles.colNarrow}>1着</th>
                            <th className={styles.colNarrow}>2着</th>
                            <th className={styles.colNarrow}>3着</th>
                            <th className={styles.colNarrow}>着外</th>
                            <th className={styles.colRate}>勝率</th>
                            <th className={styles.colRate}>2連対率</th>
                            <th className={styles.colRate}>3連対率</th>
                            <th className={styles.colNum}>ギヤ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {entries.map((e) => (
                            <tr key={e.sha_no}>
                                <td className={`${styles.stickyCol} ${styles.colWaku} ${styles.wakuCell}`}>
                                    <span className={`${styles.wakuBadge} ${styles.shaBadge}`}>
                                        {e.waku_no}
                                    </span>
                                </td>
                                <td className={`${styles.stickyCol} ${styles.colSha} ${styles.wakuCell}`}>
                                    <span className={`${styles.wakuBadge} ${getWakuClass(e.sha_no)}`}>
                                        {e.sha_no}
                                    </span>
                                </td>
                                <td className={`${styles.stickyCol} ${styles.colPlayer}`}>
                                    <div className={styles.playerName}>{e.player_name}</div>
                                    <div className={styles.playerMeta}>
                                        {e.prefecture} {e.age}歳 {e.kinen} {e.class_rank}
                                    </div>
                                </td>
                                <td className={styles.colNum}><strong>{formatScore(e.score)}</strong></td>
                                <td className={styles.colNarrow}>{e.leg_type}</td>
                                <td className={styles.colNarrow}>{e.sprint_count}</td>
                                <td className={styles.colNarrow}>{e.back_count}</td>
                                <td className={styles.colNarrow}>{e.nige}</td>
                                <td className={styles.colNarrow}>{e.makuri}</td>
                                <td className={styles.colNarrow}>{e.sashi}</td>
                                <td className={styles.colNarrow}>{e.mark}</td>
                                <td className={`${styles.colNarrow} rank-1`}>{e.rank1}</td>
                                <td className={`${styles.colNarrow} rank-2`}>{e.rank2}</td>
                                <td className={`${styles.colNarrow} rank-3`}>{e.rank3}</td>
                                <td className={styles.colNarrow}>{e.out_of_rank}</td>
                                <td className={styles.colRate}>{formatRate(e.win_rate)}</td>
                                <td className={styles.colRate}>{formatRate(e.second_rate)}</td>
                                <td className={styles.colRate}>{formatRate(e.third_rate)}</td>
                                <td className={styles.colNum}>{formatGear(e.gear_ratio)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* コメント一覧 */}
            {entries.some((e) => e.comment) && (
                <div className={styles.commentSection}>
                    <h3 className={styles.commentTitle}>選手コメント</h3>
                    {entries
                        .filter((e) => e.comment)
                        .map((e) => (
                            <div key={e.sha_no} className={styles.commentRow}>
                                <span className={`${styles.commentWaku} ${getWakuClass(e.sha_no)}`}>
                                    {e.sha_no}
                                </span>
                                <span className={styles.commentName}>{e.player_name}</span>
                                <span className={styles.commentText}>「{e.comment}」</span>
                            </div>
                        ))}
                </div>
            )}
        </div>
    );
}
