-- =====================================================================
-- CycleBoy テーブル作成マイグレーション
-- Supabase (PostgreSQL) で実行してください
-- =====================================================================

-- レース日程（グレードレース）
CREATE TABLE IF NOT EXISTS race_schedules (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jyo_cd      TEXT NOT NULL,
    jyo_name    TEXT NOT NULL,
    grade       TEXT NOT NULL,
    kaisai_name TEXT NOT NULL,
    start_date  DATE NOT NULL,
    end_date    DATE NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- プログラム（開催日ごと）
CREATE TABLE IF NOT EXISTS programs (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    race_schedule_id UUID NOT NULL REFERENCES race_schedules(id) ON DELETE CASCADE,
    kaisai_date      DATE NOT NULL,
    grade            TEXT NOT NULL,
    kaisai_type      JSONB,
    program_type     TEXT NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- レース
CREATE TABLE IF NOT EXISTS races (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id        UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    netkeiba_race_id  TEXT NOT NULL,
    race_no           INTEGER NOT NULL,
    race_title        TEXT NOT NULL,
    car_count         INTEGER NOT NULL,
    departure_time    TEXT,
    deadline_time     TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 出走表
CREATE TABLE IF NOT EXISTS race_entries (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    netkeiba_race_id       TEXT NOT NULL,
    waku_no                INTEGER NOT NULL,
    sha_no                 INTEGER NOT NULL,
    player_name            TEXT NOT NULL,
    prefecture             TEXT NOT NULL,
    age                    INTEGER NOT NULL,
    kinen                  TEXT NOT NULL,
    class_rank             TEXT NOT NULL,
    score                  NUMERIC(5,1) NOT NULL DEFAULT 0,
    leg_type               TEXT NOT NULL,
    sprint_count           INTEGER NOT NULL DEFAULT 0,
    back_count             INTEGER NOT NULL DEFAULT 0,
    nige                   INTEGER NOT NULL DEFAULT 0,
    makuri                 INTEGER NOT NULL DEFAULT 0,
    sashi                  INTEGER NOT NULL DEFAULT 0,
    mark                   INTEGER NOT NULL DEFAULT 0,
    rank1                  INTEGER NOT NULL DEFAULT 0,
    rank2                  INTEGER NOT NULL DEFAULT 0,
    rank3                  INTEGER NOT NULL DEFAULT 0,
    out_of_rank            INTEGER NOT NULL DEFAULT 0,
    win_rate               NUMERIC(5,1) NOT NULL DEFAULT 0,
    second_rate            NUMERIC(5,1) NOT NULL DEFAULT 0,
    third_rate             NUMERIC(5,1) NOT NULL DEFAULT 0,
    gear_ratio             NUMERIC(4,2) NOT NULL DEFAULT 0,
    comment                TEXT,
    formation_prediction   JSONB,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 直近成績
CREATE TABLE IF NOT EXISTS race_recent_results (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    netkeiba_race_id TEXT NOT NULL,
    waku_no          INTEGER NOT NULL,
    sha_no           INTEGER NOT NULL,
    player_name      TEXT NOT NULL,
    prefecture       TEXT NOT NULL,
    age              INTEGER NOT NULL,
    kinen            TEXT NOT NULL,
    class_rank       TEXT NOT NULL,
    current_session  JSONB,
    recent1          JSONB,
    recent2          JSONB,
    recent3          JSONB,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 対戦表
CREATE TABLE IF NOT EXISTS race_match_results (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    netkeiba_race_id TEXT NOT NULL,
    waku_no          INTEGER NOT NULL,
    sha_no           INTEGER NOT NULL,
    player_name      TEXT NOT NULL,
    total            TEXT,
    vs_records       JSONB NOT NULL DEFAULT '{}',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- レース結果（着順）
CREATE TABLE IF NOT EXISTS race_results (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    netkeiba_race_id TEXT NOT NULL,
    rank             INTEGER NOT NULL,
    waku_no          INTEGER NOT NULL,
    sha_no           INTEGER NOT NULL,
    player_name      TEXT NOT NULL,
    margin           TEXT,
    last_lap         NUMERIC(4,1),
    move_type        TEXT,
    sb_flag          TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 払戻金
CREATE TABLE IF NOT EXISTS race_refunds (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    netkeiba_race_id TEXT NOT NULL,
    bet_type         TEXT NOT NULL,
    combination      TEXT NOT NULL,
    payout           INTEGER NOT NULL,
    popularity       INTEGER,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI予想
CREATE TABLE IF NOT EXISTS race_predictions (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    netkeiba_race_id            TEXT NOT NULL UNIQUE,
    section1_confidence         TEXT NOT NULL,
    section2_development        TEXT NOT NULL,
    section3_line_evaluation    TEXT NOT NULL,
    section4_favorite_scenario  TEXT NOT NULL,
    section5_medium_hole_scenario TEXT NOT NULL,
    section6_recommended_bets   TEXT NOT NULL,
    section7_aim_word           TEXT NOT NULL,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ジョブ実行履歴
CREATE TABLE IF NOT EXISTS job_runs (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type       TEXT NOT NULL,
    step           TEXT,
    status         TEXT NOT NULL DEFAULT 'running',
    started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at    TIMESTAMPTZ,
    trigger_source TEXT NOT NULL,
    trigger_by     TEXT,
    summary        JSONB,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ジョブエラー
CREATE TABLE IF NOT EXISTS job_errors (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_run_id   UUID NOT NULL REFERENCES job_runs(id) ON DELETE CASCADE,
    step         TEXT NOT NULL,
    error_type   TEXT NOT NULL,
    message      TEXT NOT NULL,
    detail       JSONB,
    stack_trace  TEXT,
    retry_count  INTEGER,
    context      JSONB,
    occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- インデックス
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_programs_schedule       ON programs(race_schedule_id);
CREATE INDEX IF NOT EXISTS idx_programs_kaisai_date    ON programs(kaisai_date);
CREATE INDEX IF NOT EXISTS idx_races_program           ON races(program_id);
CREATE INDEX IF NOT EXISTS idx_races_netkeiba_id       ON races(netkeiba_race_id);
CREATE INDEX IF NOT EXISTS idx_entries_netkeiba_id     ON race_entries(netkeiba_race_id);
CREATE INDEX IF NOT EXISTS idx_recent_netkeiba_id      ON race_recent_results(netkeiba_race_id);
CREATE INDEX IF NOT EXISTS idx_match_netkeiba_id       ON race_match_results(netkeiba_race_id);
CREATE INDEX IF NOT EXISTS idx_results_netkeiba_id     ON race_results(netkeiba_race_id);
CREATE INDEX IF NOT EXISTS idx_refunds_netkeiba_id     ON race_refunds(netkeiba_race_id);
CREATE INDEX IF NOT EXISTS idx_predictions_netkeiba_id ON race_predictions(netkeiba_race_id);
CREATE INDEX IF NOT EXISTS idx_job_runs_type_status    ON job_runs(job_type, status);
CREATE INDEX IF NOT EXISTS idx_job_errors_run_id       ON job_errors(job_run_id);
