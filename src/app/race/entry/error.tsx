'use client';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="error-page">
            <h2>エラーが発生しました</h2>
            <p>{error.message || '予期しないエラーが発生しました。'}</p>
            <button onClick={reset}>再試行</button>
        </div>
    );
}
