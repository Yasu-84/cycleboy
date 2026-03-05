'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './Header.module.css';

export default function Header() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.inner}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoIcon}>🚴</span>
            <span className={styles.logoText}>競輪予想システム</span>
          </Link>
          <button
            className={styles.menuBtn}
            onClick={() => setDrawerOpen(true)}
            aria-label="メニューを開く"
          >
            <span className={styles.hamburger} />
            <span className={styles.hamburger} />
            <span className={styles.hamburger} />
          </button>
        </div>
      </header>

      {/* Overlay */}
      {drawerOpen && (
        <div
          className={styles.overlay}
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Drawer */}
      <nav className={`${styles.drawer} ${drawerOpen ? styles.drawerOpen : ''}`}>
        <div className={styles.drawerHeader}>
          <span className={styles.drawerTitle}>メニュー</span>
          <button
            className={styles.closeBtn}
            onClick={() => setDrawerOpen(false)}
            aria-label="メニューを閉じる"
          >
            ✕
          </button>
        </div>
        <ul className={styles.drawerList}>
          <li>
            <Link
              href="/"
              className={styles.drawerLink}
              onClick={() => setDrawerOpen(false)}
            >
              🏠 トップページ
            </Link>
          </li>
          <li>
            <Link
              href="/admin"
              className={styles.drawerLink}
              onClick={() => setDrawerOpen(false)}
            >
              ⚙️ 管理画面
            </Link>
          </li>
          <li>
            <span className={`${styles.drawerLink} ${styles.disabled}`}>
              🤖 AI予想（予定）
            </span>
          </li>
          <li>
            <span className={`${styles.drawerLink} ${styles.disabled}`}>
              📊 予想履歴（予定）
            </span>
          </li>
        </ul>
      </nav>
    </>
  );
}
