'use client';

import type { RaceEntry } from '@/types/raceEntry';
import styles from './entry.module.css';

interface FormationTabProps {
    entries: RaceEntry[];
}

function getWakuClass(wakuNo: number): string {
    return `waku-${wakuNo}`;
}

/** 車番 → 枠番の変換 (car_count に依存するが、ここでは entries から引き当て) */
function getWakuBySha(entries: RaceEntry[], shaNo: number): number {
    const entry = entries.find((e) => e.sha_no === shaNo);
    return entry?.waku_no ?? shaNo;
}

/** ライン内のポジション名を推定 */
function getPositionLabel(index: number): string {
    if (index === 0) return '自力';
    if (index === 1) return '番手';
    return `${index + 1}番手`;
}

export default function FormationTab({ entries }: FormationTabProps) {
    // formation_prediction は全選手共通なので1件目から取得
    const formation = entries[0]?.formation_prediction;

    if (!formation || !formation.lines || formation.lines.length === 0) {
        return <div className="empty-message">並び予想データがありません</div>;
    }

    return (
        <div className={styles.formationWrapper}>
            <h3 className={styles.formationTitle}>← 並び予想</h3>

            {formation.lines.map((line, lineIdx) => (
                <div key={lineIdx} className={styles.lineCard}>
                    <div className={styles.lineLabel}>ライン {lineIdx + 1}</div>
                    <div className={styles.lineChips}>
                        {line.sha_nos.map((shaNo, chipIdx) => {
                            const entry = entries.find((e) => e.sha_no === shaNo);
                            const wakuNo = getWakuBySha(entries, shaNo);
                            return (
                                <div key={shaNo} className={styles.chipGroup}>
                                    {chipIdx > 0 && <span className={styles.arrow}>→</span>}
                                    <div className={styles.playerChip}>
                                        <span className={`${styles.chipWaku} ${getWakuClass(shaNo)}`}>
                                            {shaNo}
                                        </span>
                                        <span className={styles.chipName}>
                                            {entry?.player_name ?? `${shaNo}番`}
                                        </span>
                                        <span className={styles.chipPosition}>
                                            {getPositionLabel(chipIdx)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
