// MANDARA Insight - AI Prompt Templates

/**
 * MANDARAデータからプロンプト用コンテキスト文字列を生成
 */
export function buildMandaraContext(mandara) {
  const cellGrid = [
    [mandara.cells[1] || "(空)", mandara.cells[2] || "(空)", mandara.cells[3] || "(空)"],
    [mandara.cells[4] || "(空)", mandara.cells[5] || "(空)", mandara.cells[6] || "(空)"],
    [mandara.cells[7] || "(空)", mandara.cells[8] || "(空)", mandara.cells[9] || "(空)"],
  ];

  const gridStr = cellGrid
    .map((row, i) => {
      const labels = i === 1
        ? ["セル4(左)", "セル5(中心)", "セル6(右)"]
        : i === 0
        ? ["セル1(左上)", "セル2(上)", "セル3(右上)"]
        : ["セル7(左下)", "セル8(下)", "セル9(右下)"];
      return row.map((cell, j) => `${labels[j]}: ${cell}`).join("\n");
    })
    .join("\n");

  const tags = (mandara.tags || []).length > 0
    ? mandara.tags.join(", ")
    : "(なし)";

  const todos = (mandara.todos || []).length > 0
    ? mandara.todos.map((t) => `- [${t.completed ? "x" : " "}] ${t.text}`).join("\n")
    : "(なし)";

  return `【タイトル】${mandara.title || "(無題)"}

【9セルマンダラチャート】
${gridStr}

【備考メモ】
${mandara.memo || "(なし)"}

【タグ】${tags}

【既存TODO】
${todos}`;
}

/**
 * 入力されたセルの数をカウント（分析可能かの判定用）
 */
export function countFilledCells(mandara) {
  let count = 0;
  for (let i = 1; i <= 9; i++) {
    if (mandara.cells[i] && mandara.cells[i].trim()) count++;
  }
  return count;
}

/**
 * 構造分析プロンプト
 */
export function buildStructuralAnalysisPrompt(mandara) {
  const context = buildMandaraContext(mandara);

  return `あなたはマンダラチャート（マンダラート）の分析エキスパートです。
以下の9セルマンダラチャートを構造的に分析してください。

${context}

以下の観点で分析し、JSON形式で出力してください:

1. **中心テーマとの整合性**: セル5（中心）と周囲8セルそれぞれの関連度を評価
2. **セル間の関係**: 隣接・対角セル間の論理的つながり
3. **カバレッジ**: テーマに対して網羅されている観点と欠落している観点
4. **全体の完成度**: 総合スコアと改善提案

出力JSON形式:
{
  "coherenceScore": <1-10の整数>,
  "summary": "<全体の分析サマリー（2-3文）>",
  "cellAnalysis": [
    {
      "cellNumber": <1-9>,
      "relevance": "<high|medium|low|empty>",
      "comment": "<そのセルについてのコメント（1文）>"
    }
  ],
  "coverage": {
    "covered": ["<網羅されている観点1>", "..."],
    "missing": ["<欠落している観点1>", "..."]
  },
  "relationships": [
    {
      "from": <セル番号>,
      "to": <セル番号>,
      "type": "<支持|補完|対立|因果|独立>",
      "description": "<関係の説明（1文）>"
    }
  ],
  "suggestions": [
    "<具体的な改善提案1>",
    "<具体的な改善提案2>"
  ]
}`;
}

/**
 * 課題抽出プロンプト
 */
export function buildIssueExtractionPrompt(mandara) {
  const context = buildMandaraContext(mandara);

  return `あなたはビジネス・プロジェクト分析のエキスパートです。
以下のマンダラチャートの内容から、潜在的な課題・リスク・矛盾を抽出してください。

${context}

以下の観点で分析し、JSON形式で出力してください:

1. **矛盾検出**: セル間またはセルとメモ間の矛盾する記述
2. **リスク識別**: 内容から読み取れるリスクや懸念事項
3. **暗黙の依存関係**: 明示されていないが存在する依存関係
4. **不明確な点**: 曖昧な記述や定義が不足している部分

出力JSON形式:
{
  "issues": [
    {
      "id": <連番>,
      "title": "<課題タイトル>",
      "description": "<詳細説明（2-3文）>",
      "type": "<contradiction|risk|dependency|ambiguity|gap>",
      "severity": "<high|medium|low>",
      "relatedCells": [<関連セル番号>],
      "suggestion": "<対処の方向性（1文）>"
    }
  ],
  "summary": "<全体の課題概要（2-3文）>",
  "overallRisk": "<high|medium|low>"
}`;
}

/**
 * アクションプランプロンプト
 */
export function buildActionPlanPrompt(mandara, issues) {
  const context = buildMandaraContext(mandara);

  const issuesSummary = issues && issues.length > 0
    ? issues
        .map((issue) => `- [${issue.severity}] ${issue.title}: ${issue.description}`)
        .join("\n")
    : "(課題抽出なし)";

  return `あなたはプロジェクト計画のエキスパートです。
以下のマンダラチャートと抽出された課題に基づいて、具体的なアクションプランを策定してください。

${context}

【抽出された課題】
${issuesSummary}

以下を生成し、JSON形式で出力してください:

1. **具体的なTODO**: すぐに実行できるアクションアイテム
2. **4ストローク変換**: 重要な課題をKey→Issue→Action→Publishフレームワークに変換
3. **優先順位マトリクス**: アクションを4象限（重要×緊急）に分類
4. **最初の3ステップ**: まず着手すべきアクション

出力JSON形式:
{
  "todos": [
    {
      "text": "<TODOテキスト>",
      "priority": "<urgent|planned|delegate|hold>",
      "relatedIssueId": <関連課題ID or null>
    }
  ],
  "garageProposal": {
    "title": "<GARAGEタイトル>",
    "stroke1_key": "<Key: 核心的なテーマ・問題>",
    "stroke2_issue": "<Issue: 問題の分析・明確化>",
    "stroke3_action": "<Action: 解決策・対応>",
    "stroke4_publish": "<Publish: 成果・アウトプット>"
  },
  "priorityMatrix": {
    "urgent_important": ["<アクション>"],
    "planned_important": ["<アクション>"],
    "urgent_notImportant": ["<アクション>"],
    "hold": ["<アクション>"]
  },
  "firstThreeSteps": [
    "<最優先で取り組むべきステップ1>",
    "<ステップ2>",
    "<ステップ3>"
  ],
  "summary": "<アクションプランの全体サマリー（2-3文）>"
}`;
}

/**
 * 横断分析プロンプト
 */
export function buildCrossAnalysisPrompt(mandaras) {
  const contexts = mandaras
    .map((m, i) => {
      const ctx = buildMandaraContext(m);
      return `--- マンダラ ${i + 1}: 「${m.title || "(無題)"}」 ---\n${ctx}`;
    })
    .join("\n\n");

  return `あなたは戦略分析のエキスパートです。
以下の複数のマンダラチャートを横断的に分析してください。

${contexts}

以下の観点で分析し、JSON形式で出力してください:

1. **共通テーマ**: 複数のマンダラで繰り返し出現するテーマやキーワード
2. **依存関係**: マンダラ間の暗黙の依存・関連
3. **重複・冗長**: 異なるマンダラに重複する内容
4. **統合的な洞察**: 全体を俯瞰した戦略的洞察

出力JSON形式:
{
  "commonThemes": [
    {
      "theme": "<テーマ>",
      "appearsIn": ["<マンダラタイトル>"],
      "significance": "<その重要性の説明>"
    }
  ],
  "dependencies": [
    {
      "from": "<マンダラタイトル>",
      "to": "<マンダラタイトル>",
      "description": "<依存関係の説明>"
    }
  ],
  "overlaps": [
    {
      "description": "<重複の説明>",
      "mandaras": ["<マンダラタイトル>"],
      "recommendation": "<統合・整理の提案>"
    }
  ],
  "strategicInsights": [
    "<戦略的な洞察1>",
    "<戦略的な洞察2>"
  ],
  "summary": "<横断分析のサマリー（3-4文）>"
}`;
}
