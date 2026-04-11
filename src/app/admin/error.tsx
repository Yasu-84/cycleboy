'use client';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
            <h2 style={{ color: '#ff7b72', marginBottom: '1rem' }}>エラーが発生しました</h2>
            <p style={{ color: '#888', marginBottom: '1.5rem' }}>
                {error.message || '予期しないエラーが発生しました。'}
            </p>
            <button
                onClick={reset}
                style={{
                    padding: '0.5rem 1.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#f5c542',
                    color: '#0f1117',
                    fontWeight: 600,
                    cursor: 'pointer',
                }}
            >
                再試行
            </button>
        </div>
    );
}
