'use client';

import { useRouter } from 'next/navigation';
import styles from './entry.module.css';

export default function BackButton() {
    const router = useRouter();
    return (
        <button
            className={styles.backLink}
            onClick={() => router.back()}
            type="button"
        >
            ← 戻る
        </button>
    );
}
