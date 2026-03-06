'use client';

import type { RacePrediction } from '@/types/racePrediction';
import styles from './entry.module.css';

interface AIPredictionTabProps {
    prediction: RacePrediction | null;
}

export default function AIPredictionTab({ prediction }: AIPredictionTabProps) {
    if (!prediction) {
        return <div className="empty-message">AI予想データがありません</div>;
    }

    return (
        <div className={styles.predictionWrapper}>
            <div className={styles.predictionSection}>
                <h3 className={styles.predictionTitle}>自信度（Ｓ/Ａ/Ｂ/Ｃの４段階）</h3>
                <div className={styles.predictionBox}>
                    <p className={styles.predictionText}>
                        {prediction.section1_confidence || 'データなし'}
                    </p>
                </div>
            </div>

            <div className={styles.predictionSection}>
                <h3 className={styles.predictionTitle}>展開予想</h3>
                <div className={styles.predictionBox}>
                    <p className={styles.predictionText} style={{ whiteSpace: 'pre-wrap' }}>
                        {prediction.section2_development || 'データなし'}
                    </p>
                </div>
            </div>

            <div className={styles.predictionSection}>
                <h3 className={styles.predictionTitle}>【本命シナリオ】 【中穴シナリオ】</h3>
                <div className={styles.predictionBox}>
                    <p className={styles.predictionText} style={{ whiteSpace: 'pre-wrap' }}>
                        {prediction.section4_favorite_scenario || 'データなし'}
                    </p>
                </div>
                <div className={styles.predictionBox}>
                    <p className={styles.predictionText} style={{ whiteSpace: 'pre-wrap' }}>
                        {prediction.section5_medium_hole_scenario || 'データなし'}
                    </p>
                </div>
            </div>
        </div>
    );
}
