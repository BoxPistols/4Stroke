// MANDARA Insight - Markdown Export
//
// 分析結果を Markdown 形式に整形して、クリップボードコピー or ファイルダウンロード。

/**
 * 現在の日付を YYYY-MM-DD 形式で取得
 */
function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * ファイル名に使える形式にタイトルをサニタイズ
 */
function sanitizeFilename(str) {
  return String(str || "mandara-insight")
    .replace(/[/\\?%*:|"<>]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 60);
}

/**
 * 構造分析結果 (AI) を Markdown に変換
 */
function formatStructural(result) {
  if (!result) return "";
  const lines = [];
  lines.push("## 構造分析\n");
  if (result.coherenceScore != null) {
    lines.push(`**整合性スコア**: ${result.coherenceScore} / 10\n`);
  }
  if (result.summary) {
    lines.push(`${result.summary}\n`);
  }
  if (Array.isArray(result.cellAnalysis) && result.cellAnalysis.length > 0) {
    lines.push("### セル分析\n");
    result.cellAnalysis.forEach((c) => {
      const rel = { high: "高", medium: "中", low: "低", empty: "空" }[c.relevance] || c.relevance || "?";
      lines.push(`- **セル${c.cellNumber}** (関連度: ${rel}): ${c.comment || ""}`);
    });
    lines.push("");
  }
  if (result.coverage) {
    const covered = (result.coverage.covered || []).join("、");
    const missing = (result.coverage.missing || []).join("、");
    if (covered || missing) {
      lines.push("### カバレッジ\n");
      if (covered) lines.push(`- 網羅済み: ${covered}`);
      if (missing) lines.push(`- 欠落: ${missing}`);
      lines.push("");
    }
  }
  if (Array.isArray(result.relationships) && result.relationships.length > 0) {
    lines.push("### セル間の関係\n");
    result.relationships.forEach((r) => {
      lines.push(`- セル${r.from} → セル${r.to} (${r.type}): ${r.description || ""}`);
    });
    lines.push("");
  }
  if (Array.isArray(result.suggestions) && result.suggestions.length > 0) {
    lines.push("### 改善提案\n");
    result.suggestions.forEach((s) => lines.push(`- ${s}`));
    lines.push("");
  }
  return lines.join("\n");
}

/**
 * 課題抽出結果 (AI) を Markdown に変換
 */
function formatIssues(result) {
  if (!result) return "";
  const lines = [];
  lines.push("## 課題抽出\n");
  if (result.overallRisk) {
    const riskLabel = { high: "高", medium: "中", low: "低" }[result.overallRisk] || result.overallRisk;
    lines.push(`**全体リスク**: ${riskLabel}\n`);
  }
  if (result.summary) {
    lines.push(`${result.summary}\n`);
  }
  if (Array.isArray(result.issues) && result.issues.length > 0) {
    lines.push(`### 検出された課題 (${result.issues.length}件)\n`);
    result.issues.forEach((issue, i) => {
      const sev = { high: "高", medium: "中", low: "低" }[issue.severity] || issue.severity || "?";
      const type = { contradiction: "矛盾", risk: "リスク", dependency: "依存", ambiguity: "曖昧", gap: "欠落" }[issue.type] || issue.type || "";
      lines.push(`#### ${i + 1}. [${sev}/${type}] ${issue.title || ""}\n`);
      if (issue.description) lines.push(`${issue.description}\n`);
      if (Array.isArray(issue.relatedCells) && issue.relatedCells.length > 0) {
        lines.push(`- 関連セル: ${issue.relatedCells.map((c) => `セル${c}`).join("、")}`);
      }
      if (issue.suggestion) lines.push(`- 対応案: ${issue.suggestion}`);
      lines.push("");
    });
  }
  return lines.join("\n");
}

/**
 * アクションプラン結果 (AI) を Markdown に変換
 */
function formatAction(result) {
  if (!result) return "";
  const lines = [];
  lines.push("## アクションプラン\n");
  if (result.summary) {
    lines.push(`${result.summary}\n`);
  }
  if (Array.isArray(result.firstThreeSteps) && result.firstThreeSteps.length > 0) {
    lines.push("### まず取り組む3ステップ\n");
    result.firstThreeSteps.forEach((step, i) => {
      lines.push(`${i + 1}. ${step}`);
    });
    lines.push("");
  }
  if (Array.isArray(result.todos) && result.todos.length > 0) {
    const priorityLabels = { urgent: "すぐやる", planned: "計画する", delegate: "委任する", hold: "保留" };
    lines.push("### TODO提案\n");
    result.todos.forEach((todo) => {
      const p = priorityLabels[todo.priority] || todo.priority || "";
      lines.push(`- [${p}] ${todo.text}`);
    });
    lines.push("");
  }
  if (result.priorityMatrix) {
    lines.push("### 優先順位マトリクス\n");
    const pm = result.priorityMatrix;
    const q = [
      ["緊急×重要", pm.urgent_important],
      ["重要(計画)", pm.planned_important],
      ["緊急(委任)", pm.urgent_notImportant],
      ["保留", pm.hold],
    ];
    q.forEach(([label, items]) => {
      if (Array.isArray(items) && items.length > 0) {
        lines.push(`**${label}**`);
        items.forEach((item) => lines.push(`- ${item}`));
        lines.push("");
      }
    });
  }
  if (result.garageProposal) {
    const g = result.garageProposal;
    lines.push("### GARAGE連携提案\n");
    lines.push(`**${g.title || "(無題)"}**\n`);
    lines.push(`- **Key**: ${g.stroke1_key || ""}`);
    lines.push(`- **Issue**: ${g.stroke2_issue || ""}`);
    lines.push(`- **Action**: ${g.stroke3_action || ""}`);
    lines.push(`- **Publish**: ${g.stroke4_publish || ""}`);
    lines.push("");
  }
  return lines.join("\n");
}

/**
 * ローカル分析結果を Markdown に変換
 */
function formatLocal(result) {
  if (!result) return "";
  const lines = [];
  lines.push("## ローカル簡易分析\n");
  if (result.summary) {
    lines.push(`${result.summary}\n`);
  }
  lines.push(`- 記入セル: ${result.filledCount} / 9`);
  lines.push(`- 完成度: ${result.completeness}%`);
  lines.push(`- 総文字数: ${result.stats?.totalChars || 0}`);
  lines.push(`- タグ数: ${result.stats?.tagCount || 0}`);
  lines.push("");
  if (Array.isArray(result.issues) && result.issues.length > 0) {
    lines.push(`### 検出された改善ポイント (${result.issues.length}件)\n`);
    result.issues.forEach((issue, i) => {
      const sev = { high: "高", medium: "中", low: "低" }[issue.severity] || issue.severity;
      lines.push(`${i + 1}. [${sev}] ${issue.title}`);
      if (issue.description) lines.push(`   ${issue.description}`);
      if (issue.suggestion) lines.push(`   → ${issue.suggestion}`);
    });
    lines.push("");
  }
  if (Array.isArray(result.suggestedTodos) && result.suggestedTodos.length > 0) {
    lines.push("### 推奨アクション\n");
    const priorityLabels = { urgent: "すぐやる", planned: "計画する" };
    result.suggestedTodos.forEach((todo) => {
      const p = priorityLabels[todo.priority] || todo.priority;
      lines.push(`- [${p}] ${todo.text}`);
    });
    lines.push("");
  }
  return lines.join("\n");
}

/**
 * MANDARAデータ本体を Markdown に変換
 */
function formatMandaraBody(mandara) {
  if (!mandara) return "";
  const lines = [];
  lines.push("## マンダラ内容\n");
  const positions = { 1: "左上", 2: "上", 3: "右上", 4: "左", 5: "中心", 6: "右", 7: "左下", 8: "下", 9: "右下" };
  lines.push(`**中心 (セル5)**: ${mandara.cells?.[5] || "(空)"}\n`);
  lines.push("### 周辺セル\n");
  [1, 2, 3, 4, 6, 7, 8, 9].forEach((i) => {
    lines.push(`- セル${i} (${positions[i]}): ${mandara.cells?.[i] || "(空)"}`);
  });
  lines.push("");
  if (mandara.memo?.trim()) {
    lines.push("### 備考メモ\n");
    lines.push(mandara.memo.trim());
    lines.push("");
  }
  if ((mandara.tags || []).length > 0) {
    lines.push("### タグ\n");
    lines.push(mandara.tags.join("、"));
    lines.push("");
  }
  if ((mandara.todos || []).length > 0) {
    lines.push("### 既存TODO\n");
    mandara.todos.forEach((t) => {
      lines.push(`- [${t.completed ? "x" : " "}] ${t.text}`);
    });
    lines.push("");
  }
  return lines.join("\n");
}

/**
 * 全分析結果を Markdown レポートとしてビルド
 * @param {object} mandara - マンダラデータ
 * @param {object} results - { structural, issues, action } or { local }
 */
export function buildMarkdownReport(mandara, results) {
  const lines = [];
  const title = mandara?.title?.trim() || "(無題)";
  lines.push(`# MANDARA Insight: ${title}\n`);
  lines.push(`*生成日時: ${new Date().toLocaleString("ja-JP")}*\n`);
  lines.push("---\n");

  lines.push(formatMandaraBody(mandara));

  if (results?.local) {
    lines.push("---\n");
    lines.push(formatLocal(results.local));
  }
  if (results?.structural) {
    lines.push("---\n");
    lines.push(formatStructural(results.structural));
  }
  if (results?.issues) {
    lines.push("---\n");
    lines.push(formatIssues(results.issues));
  }
  if (results?.action) {
    lines.push("---\n");
    lines.push(formatAction(results.action));
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n");
}

/**
 * クリップボードにコピー
 * @returns {Promise<boolean>} 成功時 true
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    // fallback: textarea 経由
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * .md ファイルとしてダウンロード
 */
export function downloadAsFile(text, mandaraTitle) {
  const filename = `${todayStr()}_${sanitizeFilename(mandaraTitle || "mandara-insight")}.md`;
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
