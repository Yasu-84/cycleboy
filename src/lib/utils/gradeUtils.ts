/**
 * グレードコード変換ユーティリティ
 * ネットケイリンの HTML クラス名 → グレード文字列への変換
 */

/**
 * Icon_GradeType* クラス → グレード文字列 変換マップ
 * HTMLの class 属性に含まれるクラス名でマッチング
 */
export const GRADE_CLASS_MAP: Record<string, string> = {
    Icon_GradeType1: 'GP',
    Icon_GradeType2: 'G1',
    Icon_GradeType3: 'G2',
    Icon_GradeType4: 'G3',
    Icon_GradeType5: 'F1',
    Icon_GradeType6: 'F2',
};

/**
 * class 属性文字列からグレードを判定する
 * @param classAttr - 要素の class 属性全体（例: "Icon_Grade Icon_GradeType3 some-other-class"）
 * @returns グレード文字列（例: "G2"）または null（判定不能な場合）
 */
export function parseGradeFromClass(classAttr: string): string | null {
    for (const [cls, grade] of Object.entries(GRADE_CLASS_MAP)) {
        if (classAttr.includes(cls)) return grade;
    }
    return null;
}

/**
 * グレードの表示優先順（高グレードほど小さい値）
 * UI ソートや設計上の参照用
 */
export const GRADE_ORDER: Record<string, number> = {
    GP: 1,
    G1: 2,
    G2: 3,
    G3: 4,
    F1: 5,
    F2: 6,
};
