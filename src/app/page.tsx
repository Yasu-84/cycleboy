import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import styles from './schedule.module.css';

// ------------------------------------------------------------------
// 型定義
// ------------------------------------------------------------------
interface Program {
  kaisai_date: string;
  program_type: string;
  kaisai_type: string[] | null;
}

interface ScheduleWithProgram {
  id: string;
  jyo_cd: string;
  jyo_name: string;
  grade: string;
  kaisai_name: string;
  start_date: string;
  end_date: string;
  programs: Program[];
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

function getKaisaiTypeBadge(types: string[] | null): { label: string; className: string; icon: string }[] {
  if (!types) return [];
  const map: Record<string, { className: string; icon: string }> = {
    'モーニング': { className: 'kaisai-morning', icon: '🌅' },
    'ナイター': { className: 'kaisai-nighter', icon: '🌃' },
    'ミッドナイト': { className: 'kaisai-midnight', icon: '🌑' },
    'ガールズ': { className: 'kaisai-girls', icon: '👩' },
  };
  return types
    .filter((t) => map[t])
    .map((t) => ({ label: t, ...map[t] }));
}

function formatPeriod(start: string, end: string): string {
  const [sYear, sMonth, sDay] = start.split('-').map(Number);
  const [eYear, eMonth, eDay] = end.split('-').map(Number);
  const s = new Date(sYear, sMonth - 1, sDay);
  const e = new Date(eYear, eMonth - 1, eDay);
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
  // targetDate (YYYY-MM-DD) から当月の初日と末日を計算する
  const [yearStr, monthStr] = targetDate.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  // 初日
  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
  // 末日 (翌月0日)
  const lastDayDate = new Date(year, month, 0);
  const lastDay = `${year}-${String(month).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`;

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
    .lte('start_date', lastDay)
    .gte('end_date', firstDay);

  if (error) throw new Error(`[getSchedules] ${error.message}`);
  if (!data) return [];

  const result: ScheduleWithProgram[] = data.map((s: Record<string, unknown>) => {
    const programs = (s.programs as Program[]) || [];
    const sortedPrograms = programs.sort((a, b) =>
      a.kaisai_date.localeCompare(b.kaisai_date)
    );

    return {
      id: s.id as string,
      jyo_cd: s.jyo_cd as string,
      jyo_name: s.jyo_name as string,
      grade: s.grade as string,
      kaisai_name: s.kaisai_name as string,
      start_date: s.start_date as string,
      end_date: s.end_date as string,
      programs: sortedPrograms,
    };
  });

  // 開始日順、同日の場合はグレード順などでソート
  result.sort((a, b) => {
    if (a.start_date !== b.start_date) {
      return a.start_date < b.start_date ? -1 : 1;
    }
    return (GRADE_ORDER[a.grade] ?? 99) - (GRADE_ORDER[b.grade] ?? 99);
  });
  return result;
}

// ------------------------------------------------------------------
// Page Component
// ------------------------------------------------------------------
export const revalidate = 60; // ISR 60秒

export default async function SchedulePage() {
  const today = getTodayJST();
  const schedules = await getSchedules(today);
  const displayMonth = `${today.split('-')[0]}年${parseInt(today.split('-')[1], 10)}月`;

  return (
    <div className="container">
      <h1 className={styles.dateLabel}>📅 {displayMonth}の開催日程</h1>

      {schedules.length === 0 ? (
        <div className="empty-message">今月の開催はありません</div>
      ) : (
        <div className={styles.grid}>
          {schedules.map((s) => {
            // プログラムからユニークな開催区分（ナイター等）を抽出
            const typesSet = new Set<string>();
            s.programs.forEach((p) => {
              if (p.kaisai_type) p.kaisai_type.forEach((t) => typesSet.add(t));
            });
            const uniqueTypes = Array.from(typesSet);

            return (
              <div key={s.id} className={styles.card}>
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
                    開催　{formatPeriod(s.start_date, s.end_date)}
                  </span>
                  <div className={styles.badges}>
                    {getKaisaiTypeBadge(uniqueTypes).map((badge) => (
                      <span
                        key={badge.label}
                        className={`kaisai-badge ${badge.className}`}
                        aria-label={`開催区分 ${badge.label}`}
                      >
                        {badge.icon} {badge.label}
                      </span>
                    ))}
                  </div>
                </div>

                {s.programs.length > 0 && (
                  <div className={styles.dayLinks}>
                    {s.programs.map((p) => (
                      <Link
                        key={p.kaisai_date}
                        href={`/race_list?date=${p.kaisai_date.replace(/-/g, '')}&jyo_cd=${s.jyo_cd}`}
                        className={styles.dayLink}
                      >
                        {p.program_type}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
