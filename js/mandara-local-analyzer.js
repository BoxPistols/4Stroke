// MANDARA Local Analyzer
// AI未使用でMANDARAコンテンツをヒューリスティックで整理する
// API利用不可時のフォールバック

import { countFilledCells } from "./mandara-insight-prompts.js";

const CELL_POSITIONS = {
  1: "左上", 2: "上", 3: "右上",
  4: "左", 5: "中心", 6: "右",
  7: "左下", 8: "下", 9: "右下",
};

/**
 * 文字数カウント（日本語対応）
 */
function charCount(text) {
  return (text || "").trim().length;
}

/**
 * ローカル分析を実行
 * @param {object} mandara - MANDARAデータ
 * @returns {object} ローカル分析結果
 */
export function analyzeLocally(mandara) {
  const cells = mandara.cells || {};
  const centerText = (cells[5] || "").trim();
  const surroundingCells = [1, 2, 3, 4, 6, 7, 8, 9];
  const filledCount = countFilledCells(mandara);
  const emptyCount = 9 - filledCount;

  // セル概要
  const cellsOverview = [];
  for (let i = 1; i <= 9; i++) {
    const text = (cells[i] || "").trim();
    cellsOverview.push({
      cellNumber: i,
      position: CELL_POSITIONS[i],
      isCenter: i === 5,
      content: text,
      isEmpty: text === "",
      charCount: charCount(text),
    });
  }

  // 簡易課題検出（ヒューリスティック）
  const issues = [];
  let issueId = 1;

  // 中心セルが空
  if (!centerText) {
    issues.push({
      id: issueId++,
      title: "中心テーマが未設定",
      description: "中心セル(5)が空です。マンダラの核となるテーマを設定することで、周辺セルの方向性が明確になります。",
      type: "gap",
      severity: "high",
      relatedCells: [5],
      suggestion: "中心セルにこのマンダラの主題を入力してください",
    });
  }

  // 周辺セルの空欄
  const emptySurroundingCells = surroundingCells.filter((i) => !(cells[i] || "").trim());
  if (emptySurroundingCells.length >= 4) {
    issues.push({
      id: issueId++,
      title: `周辺セルの${emptySurroundingCells.length}箇所が未記入`,
      description: `セル${emptySurroundingCells.join(", ")}が空です。マンダラのカバレッジが不十分です。`,
      type: "gap",
      severity: emptySurroundingCells.length >= 6 ? "high" : "medium",
      relatedCells: emptySurroundingCells,
      suggestion: "中心テーマに関連する観点を追加して埋めてください",
    });
  } else if (emptySurroundingCells.length > 0) {
    issues.push({
      id: issueId++,
      title: `${emptySurroundingCells.length}セル未記入`,
      description: `セル${emptySurroundingCells.join(", ")}が空です。`,
      type: "gap",
      severity: "low",
      relatedCells: emptySurroundingCells,
      suggestion: "残りのセルを埋めて完成度を高めてください",
    });
  }

  // 記述が短すぎるセル
  const shortCells = [];
  for (let i = 1; i <= 9; i++) {
    const len = charCount(cells[i]);
    if (len > 0 && len < 5) {
      shortCells.push(i);
    }
  }
  if (shortCells.length > 0) {
    issues.push({
      id: issueId++,
      title: "短すぎる記述がある",
      description: `セル${shortCells.join(", ")}の記述が5文字未満です。具体性に欠ける可能性があります。`,
      type: "ambiguity",
      severity: "low",
      relatedCells: shortCells,
      suggestion: "より具体的な内容を追記すると明確になります",
    });
  }

  // タグなし
  if (!mandara.tags || mandara.tags.length === 0) {
    if (filledCount >= 3) {
      issues.push({
        id: issueId++,
        title: "タグが未設定",
        description: "このマンダラにはタグが付いていません。カテゴリ分類があると後で探しやすくなります。",
        type: "gap",
        severity: "low",
        relatedCells: [],
        suggestion: "内容に関連するタグを2〜3個追加してください",
      });
    }
  }

  // TODOが完了のみ
  const todos = mandara.todos || [];
  if (todos.length > 0) {
    const activeCount = todos.filter((t) => !t.completed).length;
    const completedCount = todos.filter((t) => t.completed).length;
    if (activeCount === 0 && completedCount > 0) {
      issues.push({
        id: issueId++,
        title: "未完了TODOなし",
        description: "全てのTODOが完了しています。次のアクションを追加するタイミングかもしれません。",
        type: "gap",
        severity: "low",
        relatedCells: [],
        suggestion: "次のステップをTODOとして追加してください",
      });
    }
  }

  // アクション提案（空セルを埋めるTODO）
  const suggestedTodos = [];
  if (!centerText) {
    suggestedTodos.push({
      text: "中心セル(5)に主題・キーワードを設定する",
      priority: "urgent",
      relatedIssueId: 1,
    });
  }
  emptySurroundingCells.slice(0, 3).forEach((cellNum) => {
    suggestedTodos.push({
      text: `セル${cellNum}(${CELL_POSITIONS[cellNum]})に${centerText || "主題"}に関連する観点を追加する`,
      priority: "planned",
      relatedIssueId: null,
    });
  });
  shortCells.slice(0, 2).forEach((cellNum) => {
    suggestedTodos.push({
      text: `セル${cellNum}の記述をより具体的に追記する`,
      priority: "planned",
      relatedIssueId: null,
    });
  });

  // サマリー生成
  const completeness = Math.round((filledCount / 9) * 100);
  const summary = buildSummary(mandara, filledCount, emptyCount, completeness, issues.length);

  // マークダウン形式の整理
  const markdown = buildMarkdown(mandara, cellsOverview);

  return {
    summary,
    completeness,
    filledCount,
    emptyCount,
    cellsOverview,
    markdown,
    issues,
    suggestedTodos,
    stats: {
      totalChars: cellsOverview.reduce((sum, c) => sum + c.charCount, 0),
      avgCharsPerCell: filledCount > 0
        ? Math.round(cellsOverview.reduce((sum, c) => sum + c.charCount, 0) / filledCount)
        : 0,
      tagCount: (mandara.tags || []).length,
      todoCount: todos.length,
      activeTodoCount: todos.filter((t) => !t.completed).length,
    },
  };
}

function buildSummary(mandara, filled, empty, completeness, issueCount) {
  const title = mandara.title || "(無題)";
  const center = mandara.cells[5]?.trim() || "(未設定)";

  let status = "";
  if (completeness >= 90) status = "ほぼ完成しています";
  else if (completeness >= 60) status = "概ね埋まっていますが、追加余地があります";
  else if (completeness >= 30) status = "まだ構築中です";
  else status = "初期段階です";

  return `「${title}」は中心テーマ「${center}」のマンダラです。9セル中${filled}セルが記入済み（完成度${completeness}%）で、${status}。簡易分析により${issueCount}件の改善ポイントが見つかりました。`;
}

function buildMarkdown(mandara, cellsOverview) {
  const lines = [];

  lines.push(`# ${mandara.title || "(無題)"}\n`);

  lines.push(`## 中心テーマ`);
  const center = cellsOverview.find((c) => c.cellNumber === 5);
  lines.push(center.content || "_(未設定)_");
  lines.push("");

  lines.push(`## 周辺セル`);
  [1, 2, 3, 4, 6, 7, 8, 9].forEach((i) => {
    const cell = cellsOverview.find((c) => c.cellNumber === i);
    const content = cell.content || "_(空)_";
    lines.push(`- **${i} (${cell.position})**: ${content}`);
  });
  lines.push("");

  if (mandara.memo?.trim()) {
    lines.push(`## 備考メモ`);
    lines.push(mandara.memo.trim());
    lines.push("");
  }

  if ((mandara.tags || []).length > 0) {
    lines.push(`## タグ`);
    lines.push(mandara.tags.map((t) => `\`${t}\``).join(" "));
    lines.push("");
  }

  const todos = mandara.todos || [];
  if (todos.length > 0) {
    lines.push(`## TODO`);
    todos.forEach((t) => {
      lines.push(`- [${t.completed ? "x" : " "}] ${t.text}`);
    });
    lines.push("");
  }

  return lines.join("\n");
}
