'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import styles from './admin.module.css';
import type { JobRun } from '@/types/jobRun';
import { fetchJobRunsAction, triggerWorkflowAction } from './actions';

// ----------------------------------------------------------------
// 定数
// ----------------------------------------------------------------

const POLL_INTERVAL_MS = 3_000;

type WorkflowType = 'scrape' | 'cleanup' | 'prediction';
type StepType = 'all' | 'schedule' | 'program' | 'entry' | 'prediction' | 'result';

interface TriggerOptions {
    workflow: WorkflowType;
    step?: StepType;
    targetDate?: string;
}

// ----------------------------------------------------------------
// ローカル状態
// ----------------------------------------------------------------

interface StatusMessage {
    type: 'ok' | 'err';
    text: string;
}

// ----------------------------------------------------------------
// 管理画面コンポーネント
// ----------------------------------------------------------------

export default function AdminPage() {
    const today = new Date().toLocaleDateString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).replace(/\//g, '-');

    const [targetDate, setTargetDate] = useState<string>(today);
    const [loading, setLoading] = useState<boolean>(false);
    const [statusMsg, setStatusMsg] = useState<StatusMessage | null>(null);
    const [jobRuns, setJobRuns] = useState<JobRun[]>([]);
    const [hasFailure, setHasFailure] = useState<boolean>(false);
    const [lastPolled, setLastPolled] = useState<Date | null>(null);
    const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

    // ----------------------------------------------------------------
    // ジョブ履歴ポーリング
    // ----------------------------------------------------------------

    const fetchJobRuns = useCallback(async () => {
        try {
            const result = await fetchJobRunsAction();
            setJobRuns(result.runs ?? []);
            setHasFailure(result.hasRecentFailure ?? false);
            setLastPolled(new Date());
        } catch {
            // ポーリングエラーは無視（次のタイミングで再試行）
        }
    }, []);

    useEffect(() => {
        void fetchJobRuns();
        pollTimer.current = setInterval(() => void fetchJobRuns(), POLL_INTERVAL_MS);

        const handleVisibility = () => {
            if (document.hidden) {
                if (pollTimer.current) {
                    clearInterval(pollTimer.current);
                    pollTimer.current = null;
                }
            } else {
                void fetchJobRuns();
                pollTimer.current = setInterval(() => void fetchJobRuns(), POLL_INTERVAL_MS);
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            if (pollTimer.current) clearInterval(pollTimer.current);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [fetchJobRuns]);

    // ----------------------------------------------------------------
    // workflow_dispatch 送信
    // ----------------------------------------------------------------

    const triggerWorkflow = async (opts: TriggerOptions) => {
        setLoading(true);
        setStatusMsg(null);

        try {
            const result = await triggerWorkflowAction({
                workflow: opts.workflow,
                step: opts.step,
                targetDate: opts.targetDate,
            });

            if (result.ok) {
                setStatusMsg({ type: 'ok', text: result.message });
                setTimeout(() => void fetchJobRuns(), 5_000);
            } else {
                setStatusMsg({ type: 'err', text: result.error });
            }
        } catch (err) {
            setStatusMsg({ type: 'err', text: err instanceof Error ? err.message : String(err) });
        } finally {
            setLoading(false);
        }
    };

    // ----------------------------------------------------------------
    // レンダリング
    // ----------------------------------------------------------------

    return (
        <main className={styles.adminWrap}>
            <div className={styles.adminContainer}>

                {/* ヘッダー */}
                <div className={styles.adminHeader}>
                    <div className={styles.adminHeaderIcon}>🚴</div>
                    <div>
                        <h1 className={styles.adminHeaderTitle}>競輪予想 管理画面</h1>
                        <p className={styles.adminHeaderSub}>スクレイピング & データ管理コンソール</p>
                    </div>
                </div>

                {/* 警告バナー */}
                {hasFailure && (
                    <div className={styles.alertBanner}>
                        ⚠️ &nbsp;直近 24 時間以内に <strong>failed</strong> のジョブがあります。下の履歴を確認してください。
                    </div>
                )}

                {/* === スクレイピング実行セクション === */}
                <div className={styles.section}>
                    <p className={styles.sectionTitle}>スクレイピング実行</p>

                    {/* 日付ピッカー */}
                    <div className={styles.dateRow}>
                        <span className={styles.dateLabel}>対象日付</span>
                        <input
                            id="target-date"
                            type="date"
                            className={styles.dateInput}
                            value={targetDate}
                            max={today}
                            onChange={(e) => setTargetDate(e.target.value)}
                        />
                    </div>

                    {/* ボタングリッド */}
                    <div className={styles.btnGrid}>
                        <button
                            id="btn-scrape-all"
                            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnFull}`}
                            disabled={loading}
                            onClick={() => triggerWorkflow({ workflow: 'scrape', step: 'all', targetDate })}
                        >
                            ▶ 全処理実行（日程 → プログラム → 出走表）
                        </button>

                        <button
                            id="btn-scrape-schedule"
                            className={`${styles.btn} ${styles.btnSecondary}`}
                            disabled={loading}
                            onClick={() => triggerWorkflow({ workflow: 'scrape', step: 'schedule', targetDate })}
                        >
                            📅 レース日程
                        </button>

                        <button
                            id="btn-scrape-program"
                            className={`${styles.btn} ${styles.btnSecondary}`}
                            disabled={loading}
                            onClick={() => triggerWorkflow({ workflow: 'scrape', step: 'program', targetDate })}
                        >
                            📋 レースプログラム
                        </button>

                        <button
                            id="btn-scrape-entry"
                            className={`${styles.btn} ${styles.btnSecondary}`}
                            disabled={loading}
                            onClick={() => triggerWorkflow({ workflow: 'scrape', step: 'entry', targetDate })}
                        >
                            🏆 出走表
                        </button>

                        <button
                            id="btn-cleanup"
                            className={`${styles.btn} ${styles.btnDanger}`}
                            disabled={loading}
                            onClick={() => {
                                if (window.confirm('31日以上前のデータを削除します。よろしいですか？')) {
                                    void triggerWorkflow({ workflow: 'cleanup' });
                                }
                            }}
                        >
                            🗑 削除処理（31日以上前のデータ）
                        </button>

                        <button
                            id="btn-scrape-result"
                            className={`${styles.btn} ${styles.btnSecondary}`}
                            disabled={loading}
                            onClick={() => triggerWorkflow({ workflow: 'scrape', step: 'result', targetDate })}
                        >
                            🏁 結果取得
                        </button>
                    </div>

                    {/* ステータスメッセージ */}
                    {statusMsg && (
                        <div
                            className={`${styles.statusMsg} ${statusMsg.type === 'ok' ? styles.statusMsgOk : styles.statusMsgErr
                                }`}
                        >
                            {statusMsg.type === 'ok' ? '✅' : '❌'} {statusMsg.text}
                        </div>
                    )}
                </div>

                {/* === AI予想実行セクション === */}
                <div className={styles.section}>
                    <p className={styles.sectionTitle}>AI予想実行</p>

                    {/* ボタングリッド */}
                    <div className={styles.btnGrid}>
                        <button
                            id="btn-prediction"
                            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnFull}`}
                            disabled={loading}
                            onClick={() => triggerWorkflow({ workflow: 'prediction', targetDate })}
                        >
                            🤖 AI予想実行（対象日付: {targetDate}）
                        </button>
                    </div>
                    <p className={styles.note}>
                        ※ AI予想は対象日付の出走表データが必要です。先にスクレイピングを実行してください。
                    </p>
                </div>

                {/* === ジョブ履歴セクション === */}
                <div className={styles.section}>
                    <div className={styles.pollRow}>
                        <p className={`${styles.sectionTitle} ${styles.pollSectionTitle}`}>ジョブ実行履歴</p>
                        <div className={styles.pollIndicator}>
                            <span className={styles.pollDot} />
                            <span>
                                {lastPolled
                                    ? `${lastPolled.toLocaleTimeString('ja-JP')} 更新`
                                    : 'ポーリング中...'}
                            </span>
                        </div>
                    </div>

                    {jobRuns.length === 0 ? (
                        <div className={styles.emptyState}>履歴がありません</div>
                    ) : (
                        <table className={styles.jobTable}>
                            <thead>
                                <tr>
                                    <th>ステップ</th>
                                    <th>ステータス</th>
                                    <th>起動元</th>
                                    <th>開始</th>
                                    <th>終了</th>
                                </tr>
                            </thead>
                            <tbody>
                                {jobRuns.map((run) => (
                                    <tr key={run.id}>
                                        <td>{run.step || '—'}</td>
                                        <td>
                                            <span className={`${styles.badge} ${getBadgeClass(run.status, styles)}`}>
                                                {run.status}
                                            </span>
                                        </td>
                                        <td>{run.trigger_source}</td>
                                        <td>{formatDate(run.started_at)}</td>
                                        <td>{run.finished_at ? formatDate(run.finished_at) : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

            </div>
        </main>
    );
}

// ----------------------------------------------------------------
// 表示ヘルパー
// ----------------------------------------------------------------

function formatDate(iso: string): string {
    return new Date(iso).toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}

function getBadgeClass(
    status: string,
    s: typeof styles
): string {
    const map: Record<string, string> = {
        running: s.badgeRunning,
        success: s.badgeSuccess,
        failed: s.badgeFailed,
        skipped: s.badgeSkipped,
    };
    return map[status] ?? '';
}
