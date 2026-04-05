// MANDARA Insight - UI Rendering Module

/**
 * Insightパネルを開く
 */
export function openInsightPanel() {
  const panel = document.getElementById("insight-panel");
  if (panel) {
    panel.classList.remove("is-hidden");
    panel.classList.add("is-visible");
  }
}

/**
 * Insightパネルを閉じる
 */
export function closeInsightPanel() {
  const panel = document.getElementById("insight-panel");
  if (panel) {
    panel.classList.remove("is-visible");
    panel.classList.add("is-hidden");
  }
}

/**
 * Insightパネルが開いているか
 */
export function isInsightPanelOpen() {
  const panel = document.getElementById("insight-panel");
  return panel && panel.classList.contains("is-visible");
}

/**
 * タブを切り替え
 */
export function switchTab(tabName) {
  document.querySelectorAll(".insight-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === tabName);
  });
  document.querySelectorAll(".insight-tab-content").forEach((content) => {
    content.classList.toggle("active", content.id === `insight-tab-${tabName}`);
  });
}

/**
 * ローディング状態を表示
 */
export function showLoading(containerId, message = "分析中...") {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="insight-loading">
      <div class="insight-spinner"></div>
      <span>${message}</span>
    </div>
  `;
}

/**
 * エラー状態を表示
 */
export function showError(containerId, message) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="insight-error">
      <span class="insight-error-icon">!</span>
      <span>${message}</span>
    </div>
  `;
}

/**
 * 構造分析結果をレンダリング
 */
export function renderStructuralAnalysis(result) {
  const container = document.getElementById("structural-result");
  if (!container || !result) return;

  const scoreClass =
    result.coherenceScore >= 7 ? "high" : result.coherenceScore >= 4 ? "medium" : "low";

  const cellAnalysisHtml = (result.cellAnalysis || [])
    .map((cell) => {
      const relevanceClass = cell.relevance || "empty";
      return `
        <div class="cell-analysis-item relevance-${relevanceClass}">
          <span class="cell-number">セル${cell.cellNumber}</span>
          <span class="cell-relevance">${relevanceLabel(cell.relevance)}</span>
          <span class="cell-comment">${cell.comment || ""}</span>
        </div>`;
    })
    .join("");

  const coverageHtml = renderCoverage(result.coverage);
  const relationsHtml = renderRelationships(result.relationships);
  const suggestionsHtml = renderSuggestions(result.suggestions);

  container.innerHTML = `
    <div class="insight-score-card">
      <div class="score-circle ${scoreClass}">
        <span class="score-value">${result.coherenceScore}</span>
        <span class="score-label">/10</span>
      </div>
      <div class="score-summary">${result.summary || ""}</div>
    </div>

    <div class="insight-section">
      <h4 class="insight-section-title">セル分析</h4>
      <div class="cell-analysis-list">${cellAnalysisHtml}</div>
    </div>

    ${coverageHtml}
    ${relationsHtml}
    ${suggestionsHtml}
  `;
}

/**
 * 課題抽出結果をレンダリング
 */
export function renderIssueExtraction(result) {
  const container = document.getElementById("issues-result");
  if (!container || !result) return;

  const issues = result.issues || [];
  const riskClass = result.overallRisk || "low";

  const issuesHtml = issues
    .map((issue) => {
      const severityLabel = { high: "高", medium: "中", low: "低" }[issue.severity] || issue.severity;
      const typeLabel = {
        contradiction: "矛盾",
        risk: "リスク",
        dependency: "依存",
        ambiguity: "曖昧",
        gap: "欠落",
      }[issue.type] || issue.type;

      return `
        <div class="issue-card severity-${issue.severity}">
          <div class="issue-header">
            <span class="issue-severity">${severityLabel}</span>
            <span class="issue-type">${typeLabel}</span>
            <span class="issue-title">${issue.title}</span>
          </div>
          <div class="issue-description">${issue.description}</div>
          ${issue.relatedCells ? `<div class="issue-cells">関連: ${issue.relatedCells.map((c) => `セル${c}`).join(", ")}</div>` : ""}
          ${issue.suggestion ? `<div class="issue-suggestion">${issue.suggestion}</div>` : ""}
        </div>`;
    })
    .join("");

  container.innerHTML = `
    <div class="insight-risk-badge risk-${riskClass}">
      全体リスク: ${{ high: "高", medium: "中", low: "低" }[riskClass] || riskClass}
    </div>
    <div class="insight-summary">${result.summary || ""}</div>
    <div class="insight-section">
      <h4 class="insight-section-title">抽出された課題 (${issues.length}件)</h4>
      <div class="issues-list">${issuesHtml || '<div class="insight-placeholder">課題は見つかりませんでした</div>'}</div>
    </div>
  `;
}

/**
 * アクションプラン結果をレンダリング
 * @param {function} onAddTodo - TODO追加コールバック (text) => void
 * @param {function} onCreateGarage - GARAGE作成コールバック (garageData) => void
 */
export function renderActionPlan(result, onAddTodo, onCreateGarage) {
  const container = document.getElementById("action-result");
  if (!container || !result) return;

  // TODOs
  const todosHtml = (result.todos || [])
    .map((todo, i) => {
      const priorityLabel = {
        urgent: "すぐやる",
        planned: "計画する",
        delegate: "委任する",
        hold: "保留",
      }[todo.priority] || todo.priority;

      return `
        <div class="action-todo-item priority-${todo.priority}">
          <span class="action-todo-priority">${priorityLabel}</span>
          <span class="action-todo-text">${todo.text}</span>
          <button class="action-add-todo-btn" data-index="${i}" title="TODOに追加">+TODO</button>
        </div>`;
    })
    .join("");

  // GARAGE proposal
  const garage = result.garageProposal;
  const garageHtml = garage
    ? `
    <div class="action-garage-proposal">
      <h5>${garage.title || "GARAGE提案"}</h5>
      <div class="garage-strokes">
        <div class="garage-stroke"><span class="stroke-label">Key</span><span class="stroke-text">${garage.stroke1_key || ""}</span></div>
        <div class="garage-stroke"><span class="stroke-label">Issue</span><span class="stroke-text">${garage.stroke2_issue || ""}</span></div>
        <div class="garage-stroke"><span class="stroke-label">Action</span><span class="stroke-text">${garage.stroke3_action || ""}</span></div>
        <div class="garage-stroke"><span class="stroke-label">Publish</span><span class="stroke-text">${garage.stroke4_publish || ""}</span></div>
      </div>
      <button class="btn btn-secondary action-create-garage-btn">GARAGEに反映</button>
    </div>`
    : "";

  // Priority matrix
  const matrixHtml = renderPriorityMatrix(result.priorityMatrix);

  // First three steps
  const stepsHtml = (result.firstThreeSteps || [])
    .map((step, i) => `<div class="first-step"><span class="step-number">${i + 1}</span><span>${step}</span></div>`)
    .join("");

  container.innerHTML = `
    <div class="insight-summary">${result.summary || ""}</div>

    <div class="insight-section">
      <h4 class="insight-section-title">まず取り組む3ステップ</h4>
      <div class="first-steps">${stepsHtml}</div>
    </div>

    <div class="insight-section">
      <h4 class="insight-section-title">TODO提案</h4>
      <div class="action-todos-list">${todosHtml}</div>
    </div>

    ${matrixHtml}

    ${garageHtml ? `<div class="insight-section"><h4 class="insight-section-title">GARAGE連携提案</h4>${garageHtml}</div>` : ""}
  `;

  // Event: add individual TODO
  container.querySelectorAll(".action-add-todo-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const index = parseInt(e.target.dataset.index);
      const todo = result.todos[index];
      if (todo && onAddTodo) {
        onAddTodo(todo.text);
        e.target.textContent = "追加済";
        e.target.disabled = true;
        e.target.classList.add("added");
      }
    });
  });

  // Event: create GARAGE
  const garageBtn = container.querySelector(".action-create-garage-btn");
  if (garageBtn && garage && onCreateGarage) {
    garageBtn.addEventListener("click", () => {
      onCreateGarage(garage);
      garageBtn.textContent = "反映済";
      garageBtn.disabled = true;
      garageBtn.classList.add("added");
    });
  }
}

/**
 * 横断分析結果をレンダリング
 */
export function renderCrossAnalysis(result) {
  const container = document.getElementById("cross-result");
  if (!container || !result) return;

  const themesHtml = (result.commonThemes || [])
    .map(
      (theme) => `
      <div class="cross-theme-card">
        <div class="cross-theme-name">${theme.theme}</div>
        <div class="cross-theme-appears">${(theme.appearsIn || []).join(", ")}</div>
        <div class="cross-theme-significance">${theme.significance || ""}</div>
      </div>`
    )
    .join("");

  const depsHtml = (result.dependencies || [])
    .map(
      (dep) => `
      <div class="cross-dep-item">
        <span class="cross-dep-from">${dep.from}</span>
        <span class="cross-dep-arrow">&rarr;</span>
        <span class="cross-dep-to">${dep.to}</span>
        <span class="cross-dep-desc">${dep.description}</span>
      </div>`
    )
    .join("");

  const overlapsHtml = (result.overlaps || [])
    .map(
      (overlap) => `
      <div class="cross-overlap-item">
        <div class="cross-overlap-desc">${overlap.description}</div>
        <div class="cross-overlap-rec">${overlap.recommendation || ""}</div>
      </div>`
    )
    .join("");

  const insightsHtml = (result.strategicInsights || [])
    .map((insight) => `<li>${insight}</li>`)
    .join("");

  container.innerHTML = `
    <div class="insight-summary">${result.summary || ""}</div>

    ${themesHtml ? `<div class="insight-section"><h4 class="insight-section-title">共通テーマ</h4><div class="cross-themes">${themesHtml}</div></div>` : ""}

    ${depsHtml ? `<div class="insight-section"><h4 class="insight-section-title">依存関係</h4><div class="cross-deps">${depsHtml}</div></div>` : ""}

    ${overlapsHtml ? `<div class="insight-section"><h4 class="insight-section-title">重複・冗長</h4><div class="cross-overlaps">${overlapsHtml}</div></div>` : ""}

    ${insightsHtml ? `<div class="insight-section"><h4 class="insight-section-title">戦略的洞察</h4><ul class="cross-insights">${insightsHtml}</ul></div>` : ""}
  `;
}

/**
 * ローカル分析結果を全タブに一括レンダリング
 * @param {object} result - ローカル分析結果
 * @param {function} onAddTodo - TODO追加コールバック
 * @param {function} onRequestAI - AI分析を使うコールバック
 */
export function renderLocalAnalysis(result, onAddTodo, onRequestAI) {
  // バナーをパネル上部に表示
  renderLocalBanner(onRequestAI);

  // 構造分析タブ
  renderLocalStructural(result);
  // 課題抽出タブ
  renderLocalIssues(result);
  // アクションプランタブ
  renderLocalAction(result, onAddTodo);
}

/**
 * ローカルモードのバナー
 */
function renderLocalBanner(onRequestAI) {
  const existing = document.getElementById("local-mode-banner");
  if (existing) existing.remove();

  const banner = document.createElement("div");
  banner.id = "local-mode-banner";
  banner.className = "local-mode-banner";
  banner.innerHTML = `
    <div class="local-banner-info">
      <span class="local-banner-icon">ローカル</span>
      <span class="local-banner-text">AI未使用の簡易分析です。より深い洞察にはAI分析をご利用ください。</span>
    </div>
    <button type="button" class="local-banner-action" id="local-enable-ai-btn">AI分析を使う</button>
  `;

  const content = document.querySelector(".insight-content");
  if (content) {
    content.insertBefore(banner, content.firstChild);
  }

  const btn = document.getElementById("local-enable-ai-btn");
  if (btn && onRequestAI) {
    btn.addEventListener("click", onRequestAI);
  }
}

/**
 * ローカルバナーを削除（AI分析に切り替わった時用）
 */
export function removeLocalBanner() {
  const banner = document.getElementById("local-mode-banner");
  if (banner) banner.remove();
}

function renderLocalStructural(result) {
  const container = document.getElementById("structural-result");
  if (!container) return;

  const scoreClass =
    result.completeness >= 70 ? "high" : result.completeness >= 40 ? "medium" : "low";

  const cellsHtml = result.cellsOverview
    .map((cell) => {
      const stateLabel = cell.isEmpty ? "空" : `${cell.charCount}文字`;
      const stateClass = cell.isEmpty ? "relevance-empty" : "relevance-high";
      const centerBadge = cell.isCenter ? '<span class="cell-center-badge">中心</span>' : "";
      return `
        <div class="cell-analysis-item ${stateClass}">
          <span class="cell-number">セル${cell.cellNumber}</span>
          <span class="cell-position">${cell.position}</span>
          ${centerBadge}
          <span class="cell-relevance">${stateLabel}</span>
          <span class="cell-comment">${cell.isEmpty ? "" : escapeHtml(cell.content).slice(0, 40) + (cell.content.length > 40 ? "..." : "")}</span>
        </div>`;
    })
    .join("");

  const statsHtml = `
    <div class="local-stats">
      <div class="local-stat"><span class="local-stat-label">記入済み</span><span class="local-stat-value">${result.filledCount}/9</span></div>
      <div class="local-stat"><span class="local-stat-label">総文字数</span><span class="local-stat-value">${result.stats.totalChars}</span></div>
      <div class="local-stat"><span class="local-stat-label">平均</span><span class="local-stat-value">${result.stats.avgCharsPerCell}字/セル</span></div>
      <div class="local-stat"><span class="local-stat-label">タグ</span><span class="local-stat-value">${result.stats.tagCount}</span></div>
    </div>`;

  container.innerHTML = `
    <div class="insight-score-card">
      <div class="score-circle ${scoreClass}">
        <span class="score-value">${result.completeness}</span>
        <span class="score-label">%</span>
      </div>
      <div class="score-summary">${escapeHtml(result.summary)}</div>
    </div>

    ${statsHtml}

    <div class="insight-section">
      <h4 class="insight-section-title">セル一覧</h4>
      <div class="cell-analysis-list">${cellsHtml}</div>
    </div>

    <div class="insight-section">
      <h4 class="insight-section-title">コンテンツ一覧</h4>
      <pre class="local-markdown">${escapeHtml(result.markdown)}</pre>
    </div>
  `;
}

function renderLocalIssues(result) {
  const container = document.getElementById("issues-result");
  if (!container) return;

  const issues = result.issues || [];
  const overallRisk = issues.some((i) => i.severity === "high")
    ? "high"
    : issues.some((i) => i.severity === "medium")
    ? "medium"
    : "low";

  const issuesHtml = issues
    .map((issue) => {
      const severityLabel = { high: "高", medium: "中", low: "低" }[issue.severity];
      const typeLabel = { gap: "欠落", ambiguity: "曖昧" }[issue.type] || issue.type;
      return `
        <div class="issue-card severity-${issue.severity}">
          <div class="issue-header">
            <span class="issue-severity">${severityLabel}</span>
            <span class="issue-type">${typeLabel}</span>
            <span class="issue-title">${escapeHtml(issue.title)}</span>
          </div>
          <div class="issue-description">${escapeHtml(issue.description)}</div>
          ${issue.relatedCells.length > 0 ? `<div class="issue-cells">関連: ${issue.relatedCells.map((c) => `セル${c}`).join(", ")}</div>` : ""}
          ${issue.suggestion ? `<div class="issue-suggestion">${escapeHtml(issue.suggestion)}</div>` : ""}
        </div>`;
    })
    .join("");

  container.innerHTML = `
    <div class="insight-risk-badge risk-${overallRisk}">
      全体リスク: ${{ high: "高", medium: "中", low: "低" }[overallRisk]}
    </div>
    <div class="insight-summary">ヒューリスティック分析で検出した${issues.length}件のポイントです。</div>
    <div class="insight-section">
      <h4 class="insight-section-title">検出された課題 (${issues.length}件)</h4>
      <div class="issues-list">${issuesHtml || '<div class="insight-placeholder">特に問題は見つかりませんでした</div>'}</div>
    </div>
  `;
}

function renderLocalAction(result, onAddTodo) {
  const container = document.getElementById("action-result");
  if (!container) return;

  const todos = result.suggestedTodos || [];

  const todosHtml = todos
    .map((todo, i) => {
      const priorityLabel = {
        urgent: "すぐやる",
        planned: "計画する",
      }[todo.priority] || todo.priority;

      return `
        <div class="action-todo-item priority-${todo.priority}">
          <span class="action-todo-priority">${priorityLabel}</span>
          <span class="action-todo-text">${escapeHtml(todo.text)}</span>
          <button class="action-add-todo-btn" data-index="${i}" title="TODOに追加">+TODO</button>
        </div>`;
    })
    .join("");

  container.innerHTML = `
    <div class="insight-summary">ローカル分析による基本的なアクション提案です。</div>

    <div class="insight-section">
      <h4 class="insight-section-title">推奨アクション (${todos.length}件)</h4>
      <div class="action-todos-list">${todosHtml || '<div class="insight-placeholder">現状で特に追加すべきアクションはありません</div>'}</div>
    </div>

    <div class="insight-section">
      <h4 class="insight-section-title">AI分析でさらに得られる洞察</h4>
      <ul class="suggestions-list">
        <li class="suggestion-item">セル間の論理的関係性の分析</li>
        <li class="suggestion-item">矛盾・リスク・依存関係の自動検出</li>
        <li class="suggestion-item">GARAGE 4ストロークへの自動変換</li>
        <li class="suggestion-item">優先度マトリクスの自動生成</li>
      </ul>
    </div>
  `;

  container.querySelectorAll(".action-add-todo-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const index = parseInt(e.target.dataset.index);
      const todo = todos[index];
      if (todo && onAddTodo) {
        onAddTodo(todo.text);
        e.target.textContent = "追加済";
        e.target.disabled = true;
        e.target.classList.add("added");
      }
    });
  });
}

function escapeHtml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// --- Helper renderers ---

function relevanceLabel(relevance) {
  return { high: "高", medium: "中", low: "低", empty: "空" }[relevance] || relevance;
}

function renderCoverage(coverage) {
  if (!coverage) return "";

  const coveredHtml = (coverage.covered || [])
    .map((item) => `<span class="coverage-tag covered">${item}</span>`)
    .join("");
  const missingHtml = (coverage.missing || [])
    .map((item) => `<span class="coverage-tag missing">${item}</span>`)
    .join("");

  return `
    <div class="insight-section">
      <h4 class="insight-section-title">カバレッジ</h4>
      ${coveredHtml ? `<div class="coverage-group"><span class="coverage-label">網羅済み:</span>${coveredHtml}</div>` : ""}
      ${missingHtml ? `<div class="coverage-group"><span class="coverage-label">欠落:</span>${missingHtml}</div>` : ""}
    </div>`;
}

function renderRelationships(relationships) {
  if (!relationships || relationships.length === 0) return "";

  const html = relationships
    .map(
      (rel) => `
      <div class="relation-item">
        <span class="relation-cells">セル${rel.from} &harr; セル${rel.to}</span>
        <span class="relation-type type-${rel.type}">${rel.type}</span>
        <span class="relation-desc">${rel.description || ""}</span>
      </div>`
    )
    .join("");

  return `
    <div class="insight-section">
      <h4 class="insight-section-title">セル間の関係</h4>
      <div class="relations-list">${html}</div>
    </div>`;
}

function renderSuggestions(suggestions) {
  if (!suggestions || suggestions.length === 0) return "";

  const html = suggestions
    .map((s) => `<li class="suggestion-item">${s}</li>`)
    .join("");

  return `
    <div class="insight-section">
      <h4 class="insight-section-title">改善提案</h4>
      <ul class="suggestions-list">${html}</ul>
    </div>`;
}

function renderPriorityMatrix(matrix) {
  if (!matrix) return "";

  const quadrants = [
    { key: "urgent_important", label: "緊急×重要", className: "urgent-important" },
    { key: "planned_important", label: "重要(計画)", className: "planned-important" },
    { key: "urgent_notImportant", label: "緊急(委任)", className: "urgent-not" },
    { key: "hold", label: "保留", className: "hold" },
  ];

  const html = quadrants
    .map((q) => {
      const items = matrix[q.key] || [];
      const itemsHtml = items.map((item) => `<li>${item}</li>`).join("");
      return `
        <div class="matrix-quadrant ${q.className}">
          <div class="matrix-label">${q.label}</div>
          <ul>${itemsHtml || "<li class='empty'>-</li>"}</ul>
        </div>`;
    })
    .join("");

  return `
    <div class="insight-section">
      <h4 class="insight-section-title">優先順位マトリクス</h4>
      <div class="priority-matrix">${html}</div>
    </div>`;
}
