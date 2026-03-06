'use client';

import Link from 'next/link';
import styles from './Header.module.css';

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>🚴</span>
          <span className={styles.logoText}>競輪予想システム</span>
        </Link>
      </div>
    </header>
  );
}
