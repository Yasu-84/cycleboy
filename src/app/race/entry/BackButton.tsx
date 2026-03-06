'use client';

import { useRouter } from 'next/navigation';
import styles from './entry.module.css';

export default function BackButton({ className }: { className?: string } = {}) {
    const router = useRouter();
    return (
        <button
            className={`${styles.backLink} ${className ?? ''}`}
            onClick={() => router.back()}
            type="button"
        >
            ← 戻る
        </button>
    );
}
