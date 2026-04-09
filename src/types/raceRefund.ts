/** race_refunds テーブルの型定義 */
export interface RaceRefund {
    id: string;
    netkeiba_race_id: string;
    /** 券種（枠複/枠単/２車複/２車単/ワイド/３連複/３連単） */
    bet_type: string;
    /** 組番（例: "3-5", "5>3>9"） */
    combination: string;
    /** 払戻金（円） */
    payout: number;
    /** 人気 */
    popularity: number | null;
    created_at: string;
}

/** race_refunds INSERT/UPSERT 用の型 */
export type RaceRefundInput = Omit<RaceRefund, 'id' | 'created_at'>;
