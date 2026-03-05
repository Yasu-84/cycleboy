## 1. 機能

### 1.1 機能概要

- 出走補表のスクレイピング完了後、AI予想を実行して予想情報を自動生成
- 管理画面からAI予想の手動起動を可能にする
- racesに対象日のデータがない場合は処理をスキップする（非開催日に実行した場合、データがない）
- 予想ボイン定義ファイルに記載されている内容をプロンプトとして、AIに指示する
- AI予想に使用するLLMは、"gemini-3.1-pro-preview"を使用する

## 1.2 予想ポイント定義ファイル

- ファイル名: `prediction-prompt.txt`
- 形式: Markdown形式のテキスト
- 文字コード: UTF-8

## 1.3 データ
**予想情報の要素**

| 項目名                             | データ設定例          |
| ---------------------------------- |-----------------------|
| レースID                       | RRRRRRRR                    |
|  section1_confidence          | セクション1（自信度）の内容     |
|  section2_development         | セクション2（展開予想）の内容  |
|  section3_line_evaluation.    | セクション3（ライン別評価）の内容 |
|  section4_favorite_scenario.  | セクション4（本命シナリオ）の内容 |
|  section5_medium_hole_scenario | セクション5（中穴シナリオ）の内容 |
|  section6_recommended_bets.    | セクション6（推奨買い目）の内容 |
|  section7_aim_word.           | セクション7（寅次郎の一言）の内容 |
| 登録日時                           | yyyy-mm-dd hh:mm:ss   |
