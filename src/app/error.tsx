'use client';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="page-body">
            <div className="container" style={{ textAlign: 'center', paddingTop: '3rem' }}>
                <h2 style={{ color: 'var(--color-accent)', marginBottom: '1rem' }}>
                    エラーが発生しました
                </h2>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
                    {error.message || '予期しないエラーが発生しました。'}
                </p>
                <button
                    onClick={reset}
                    style={{
                        padding: '0.5rem 1.5rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'var(--color-accent)',
                        color: '#FFF',
                        fontWeight: 600,
                        cursor: 'pointer',
                    }}
                >
                    再試行
                </button>
            </div>
        </div>
    );
}
