import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import styles from './schedule.module.css';

// ------------------------------------------------------------------
// 型定義
// ------------------------------------------------------------------
interface ScheduleWithProgram {
  id: string;
  jyo_cd: string;
  jyo_name: string;
  grade: string;
  kaisai_name: string;
  start_date: string;
  end_date: string;
  program_type: string;
  kaisai_type: string[] | null;
  kaisai_date: string;
}

// ------------------------------------------------------------------
// グレード優先度
// ------------------------------------------------------------------
const GRADE_ORDER: Record<string, number> = {
  GP: 0, G1: 1, G2: 2, G3: 3, F1: 4, F2: 5,
};

// ------------------------------------------------------------------
// ヘルパー
// ------------------------------------------------------------------
function getGradeBadgeClass(grade: string): string {
  const map: Record<string, string> = {
    GP: 'grade-gp', G1: 'grade-g1', G2: 'grade-g2',
    G3: 'grade-g3', F1: 'grade-f1', F2: 'grade-f2',
  };
  return map[grade] ?? 'grade-f2';
}

function getGradeLabel(grade: string): string {
  const map: Record<string, string> = {
    GP: 'GP', G1: 'GI', G2: 'GII', G3: 'GIII', F1: 'FI', F2: 'FII',
  };
  return map[grade] ?? grade;
}

function getKaisaiTypeBadge(types: string[] | null): { label: string; className: string }[] {
  if (!types) return [];
  const map: Record<string, string> = {
    'モーニング': 'kaisai-morning',
    'ナイター': 'kaisai-nighter',
    'ミッドナイト': 'kaisai-midnight',
    'ガールズ': 'kaisai-girls',
  };
  return types
    .filter((t) => map[t])
    .map((t) => ({ label: t, className: map[t] }));
}

function formatDateJa(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00+09:00');
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`;
}

function formatPeriod(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00+09:00');
  const e = new Date(end + 'T00:00:00+09:00');
  return `${s.getMonth() + 1}/${s.getDate()}〜${e.getMonth() + 1}/${e.getDate()}`;
}

// ------------------------------------------------------------------
// JST 当日日付を取得
// ------------------------------------------------------------------
function getTodayJST(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

// ------------------------------------------------------------------
// データ取得
// ------------------------------------------------------------------
async function getSchedules(targetDate: string): Promise<ScheduleWithProgram[]> {
  const { data, error } = await supabase
    .from('race_schedules')
    .select(`
      id,
      jyo_cd,
      jyo_name,
      grade,
      kaisai_name,
      start_date,
      end_date,
      programs (
        kaisai_date,
        program_type,
        kaisai_type
      )
    `)
    .lte('start_date', targetDate)
    .gte('end_date', targetDate);

  if (error) throw new Error(`[getSchedules] ${error.message}`);
  if (!data) return [];

  const result: ScheduleWithProgram[] = data.map((s: any) => {
    // 該当する日付のプログラム情報を探す
    const prog = s.programs?.find((p: any) => p.kaisai_date === targetDate) || s.programs?.[0];

    // プログラム情報の推測（DBにない場合でも開催期間から表示）
    let programType = prog?.program_type || '';
    if (!programType) {
      if (s.start_date === targetDate) {
        programType = '初日';
      } else if (s.end_date === targetDate) {
        programType = '最終日';
      } else {
        programType = '開催中';
      }
    }

    return {
      id: s.id, // race_schedules.id
      jyo_cd: s.jyo_cd,
      jyo_name: s.jyo_name,
      grade: s.grade,
      kaisai_name: s.kaisai_name,
      start_date: s.start_date,
      end_date: s.end_date,
      program_type: programType,
      kaisai_type: prog?.kaisai_type || null,
      kaisai_date: targetDate, // リンク用にターゲット日付をセット
    };
  });

  result.sort((a, b) => (GRADE_ORDER[a.grade] ?? 99) - (GRADE_ORDER[b.grade] ?? 99));
  return result;
}

// ------------------------------------------------------------------
// Page Component
// ------------------------------------------------------------------
export const revalidate = 60; // ISR 60秒

export default async function SchedulePage() {
  const today = getTodayJST();
  const schedules = await getSchedules(today);

  return (
    <div className="container">
      <h1 className={styles.dateLabel}>📅 {formatDateJa(today)}</h1>

      {schedules.length === 0 ? (
        <div className="empty-message">本日の開催はありません</div>
      ) : (
        <div className={styles.grid}>
          {schedules.map((s) => (
            <Link
              key={s.id}
              href={`/race_list?date=${s.kaisai_date.replace(/-/g, '')}&jyo_cd=${s.jyo_cd}`}
              className={styles.card}
            >
              <div className={styles.cardTop}>
                <span
                  className={`grade-badge ${getGradeBadgeClass(s.grade)}`}
                  aria-label={`グレード ${getGradeLabel(s.grade)}`}
                >
                  {getGradeLabel(s.grade)}
                </span>
                <span className={styles.jyoName}>{s.jyo_name}</span>
              </div>
              <div className={styles.kaisaiName}>{s.kaisai_name}</div>
              <div className={styles.cardBottom}>
                <span className={styles.programInfo}>
                  {s.program_type}{'　'}{formatPeriod(s.start_date, s.end_date)}
                </span>
                <div className={styles.badges}>
                  {getKaisaiTypeBadge(s.kaisai_type).map((badge) => (
                    <span
                      key={badge.label}
                      className={`kaisai-badge ${badge.className}`}
                      aria-label={`開催区分 ${badge.label}`}
                    >
                      {badge.label}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
