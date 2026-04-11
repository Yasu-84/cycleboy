'use client';

import type { RacePrediction } from '@/types/racePrediction';
import styles from './entry.module.css';

interface BettingTabProps {
    prediction: RacePrediction | null;
}

export default function BettingTab({ prediction }: BettingTabProps) {
    if (!prediction) {
        return <div className="empty-message">買い目データがありません</div>;
    }

    return (
        <div className={styles.predictionWrapper}>
            <div className={styles.predictionSection}>
                <h3 className={styles.predictionTitle}>狙い目の一言</h3>
                <div className={styles.predictionBox}>
                    <p className={`${styles.predictionText} ${styles.preWrap}`}>
                        {prediction.section7_aim_word || 'データなし'}
                    </p>
                </div>
            </div>

            <div className={styles.predictionSection}>
                <h3 className={styles.predictionTitle}>推奨買い目</h3>
                <div className={styles.predictionBox}>
                    <p className={`${styles.predictionText} ${styles.preWrap}`}>
                        {prediction.section6_recommended_bets || 'データなし'}
                    </p>
                </div>
            </div>
        </div>
    );
}
