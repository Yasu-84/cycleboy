export function deduplicateByKey<T>(records: T[], keyFn: (r: T) => string): T[] {
    const map = new Map<string, T>();
    for (const r of records) {
        map.set(keyFn(r), r);
    }
    return Array.from(map.values());
}

export function chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}
