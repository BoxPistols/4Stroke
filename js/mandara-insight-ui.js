// MANDARA Insight - UI Rendering Module

/**
 * HTML エスケープ (AI レスポンス由来の文字列挿入時に必須)
 */
function escapeHtml(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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
      const cellNum = Number(cell.cellNumber) || "?";
      return `
        <div class="cell-analysis-item relevance-${relevanceClass}">
          <span class="cell-number">セル${cellNum}</span>
          <span class="cell-relevance">${escapeHtml(relevanceLabel(cell.relevance))}</span>
          <span class="cell-comment">${escapeHtml(cell.comment)}</span>
        </div>`;
    })
    .join("");

  const coverageHtml = renderCoverage(result.coverage);
  const relationsHtml = renderRelationships(result.relationships);
  const suggestionsHtml = renderSuggestions(result.suggestions);

  const scoreNum = Number(result.coherenceScore) || 0;

  container.innerHTML = `
    <div class="insight-score-card">
      <div class="score-circle ${scoreClass}">
        <span class="score-value">${scoreNum}</span>
        <span class="score-label">/10</span>
      </div>
      <div class="score-summary">${escapeHtml(result.summary)}</div>
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

  // AIが返す未知のseverity/typeも事前にサニタイズしてクラスに使う
  const safeSeverity = (s) => (/^(high|medium|low)$/.test(s) ? s : "low");
  const safeRisk = (r) => (/^(high|medium|low)$/.test(r) ? r : "low");

  const issuesHtml = issues
    .map((issue) => {
      const severityLabel = { high: "高", medium: "中", low: "低" }[issue.severity] || "低";
      const typeLabel = {
        contradiction: "矛盾",
        risk: "リスク",
        dependency: "依存",
        ambiguity: "曖昧",
        gap: "欠落",
      }[issue.type] || escapeHtml(issue.type || "");
      const sev = safeSeverity(issue.severity);
      const relatedCells = Array.isArray(issue.relatedCells)
        ? issue.relatedCells.map((c) => `セル${Number(c) || "?"}`).join(", ")
        : "";

      return `
        <div class="issue-card severity-${sev}">
          <div class="issue-header">
            <span class="issue-severity">${severityLabel}</span>
            <span class="issue-type">${typeLabel}</span>
            <span class="issue-title">${escapeHtml(issue.title)}</span>
          </div>
          <div class="issue-description">${escapeHtml(issue.description)}</div>
          ${relatedCells ? `<div class="issue-cells">関連: ${relatedCells}</div>` : ""}
          ${issue.suggestion ? `<div class="issue-suggestion">${escapeHtml(issue.suggestion)}</div>` : ""}
        </div>`;
    })
    .join("");

  container.innerHTML = `
    <div class="insight-risk-badge risk-${safeRisk(riskClass)}">
      全体リスク: ${{ high: "高", medium: "中", low: "低" }[safeRisk(riskClass)]}
    </div>
    <div class="insight-summary">${escapeHtml(result.summary)}</div>
    <div class="insight-section">
      <h4 class="insight-section-title">抽出された課題 (${issues.length}件)</h4>
      <div class="issues-list">${issuesHtml || '<div class="insight-placeholder">課題は見つかりませんでした</div>'}</div>
    </div>
  `;
}

/**
 * 却下済みTODO管理
 */
const REJECTED_KEY = (mandaraId) => `insight_rejected_${mandaraId}`;

function getRejectedTodos(mandaraId) {
  if (!mandaraId) return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(REJECTED_KEY(mandaraId)) || "[]"));
  } catch {
    return new Set();
  }
}

function saveRejectedTodos(mandaraId, set) {
  if (!mandaraId) return;
  try {
    localStorage.setItem(REJECTED_KEY(mandaraId), JSON.stringify(Array.from(set)));
  } catch {}
}

/**
 * TODOフィルター状態 (localStorage 永続化)
 * priorities: 表示する優先度の Set
 * showRejected: 却下済みを表示するか
 */
const FILTER_KEY = "insight_todo_filter";
const DEFAULT_FILTER = { priorities: ["urgent", "planned", "delegate", "hold"], showRejected: false };

function getTodoFilter() {
  try {
    const raw = localStorage.getItem(FILTER_KEY);
    if (!raw) return { ...DEFAULT_FILTER };
    const parsed = JSON.parse(raw);
    return {
      priorities: Array.isArray(parsed.priorities) && parsed.priorities.length > 0
        ? parsed.priorities
        : DEFAULT_FILTER.priorities,
      showRejected: !!parsed.showRejected,
    };
  } catch {
    return { ...DEFAULT_FILTER };
  }
}

function saveTodoFilter(filter) {
  try {
    localStorage.setItem(FILTER_KEY, JSON.stringify(filter));
  } catch {}
}

// 優先度ソート順 (urgent が最上位)
const PRIORITY_ORDER = { urgent: 0, planned: 1, delegate: 2, hold: 3 };

/**
 * アクションプラン結果をレンダリング
 * @param {object} result - アクションプラン結果
 * @param {function} onAddTodo - TODO追加コールバック (text) => void
 * @param {function} onCreateGarage - GARAGE作成コールバック (garageData) => void
 * @param {string} [mandaraId] - 却下状態の永続化用
 */
export function renderActionPlan(result, onAddTodo, onCreateGarage, mandaraId = null) {
  const container = document.getElementById("action-result");
  if (!container || !result) return;

  const rejected = getRejectedTodos(mandaraId);
  const filter = getTodoFilter();

  // 事前サニタイズ: 未知の priority もCSSクラスに使う
  const safePriority = (p) =>
    /^(urgent|planned|delegate|hold)$/.test(p) ? p : "hold";

  const priorityLabels = {
    urgent: "すぐやる",
    planned: "計画する",
    delegate: "委任する",
    hold: "保留",
  };

  // 全TODOに元のindexを保持 (フィルタ/ソート後も正しく参照できるように)
  const allTodos = (result.todos || []).map((t, originalIndex) => ({
    ...t,
    originalIndex,
    safePriority: safePriority(t.priority),
    isRejected: rejected.has(t.text),
  }));

  // 優先度別のカウント
  const counts = { urgent: 0, planned: 0, delegate: 0, hold: 0 };
  allTodos.forEach((t) => {
    counts[t.safePriority] = (counts[t.safePriority] || 0) + 1;
  });
  const rejectedCount = allTodos.filter((t) => t.isRejected).length;

  // フィルター適用
  const prioritySet = new Set(filter.priorities);
  const filteredTodos = allTodos
    .filter((t) => prioritySet.has(t.safePriority))
    .filter((t) => filter.showRejected || !t.isRejected);

  // 優先度順にソート
  filteredTodos.sort((a, b) =>
    (PRIORITY_ORDER[a.safePriority] ?? 99) - (PRIORITY_ORDER[b.safePriority] ?? 99)
  );

  // フィルターチップHTML
  const chipsHtml = ["urgent", "planned", "delegate", "hold"]
    .map((p) => {
      const active = prioritySet.has(p);
      const count = counts[p];
      return `<button type="button" class="todo-filter-chip priority-${p} ${active ? "active" : ""}" data-priority="${p}" title="${active ? "非表示" : "表示"}にする">
        ${priorityLabels[p]} <span class="chip-count">${count}</span>
      </button>`;
    })
    .join("");

  const rejectChipHtml = rejectedCount > 0
    ? `<button type="button" class="todo-filter-chip rejected-chip ${filter.showRejected ? "active" : ""}" data-toggle="rejected" title="却下済みを${filter.showRejected ? "隠す" : "表示"}">
        却下 <span class="chip-count">${rejectedCount}</span>
      </button>`
    : "";

  // TODO項目HTML
  const todosHtml = filteredTodos.length > 0
    ? filteredTodos.map((todo) => {
        const rejectedClass = todo.isRejected ? " is-rejected" : "";
        return `
          <div class="action-todo-item priority-${todo.safePriority}${rejectedClass}">
            <span class="action-todo-priority">${priorityLabels[todo.safePriority]}</span>
            <span class="action-todo-text">${escapeHtml(todo.text)}</span>
            <div class="action-todo-buttons">
              <button class="action-add-todo-btn" data-index="${todo.originalIndex}" title="TODOに追加"${todo.isRejected ? " disabled" : ""}>+TODO</button>
              <button class="action-reject-btn" data-index="${todo.originalIndex}" title="${todo.isRejected ? "却下を解除" : "却下（やらない）"}">${todo.isRejected ? "↩戻す" : "却下"}</button>
            </div>
          </div>`;
      }).join("")
    : `<div class="insight-placeholder">表示対象がありません (フィルタを変更してください)</div>`;

  const filterBarHtml = `
    <div class="todo-filter-bar">
      ${chipsHtml}
      ${rejectChipHtml}
    </div>`;

  // GARAGE proposal
  const garage = result.garageProposal;
  const garageHtml = garage
    ? `
    <div class="action-garage-proposal">
      <h5>${escapeHtml(garage.title || "GARAGE提案")}</h5>
      <div class="garage-strokes">
        <div class="garage-stroke"><span class="stroke-label">Key</span><span class="stroke-text">${escapeHtml(garage.stroke1_key)}</span></div>
        <div class="garage-stroke"><span class="stroke-label">Issue</span><span class="stroke-text">${escapeHtml(garage.stroke2_issue)}</span></div>
        <div class="garage-stroke"><span class="stroke-label">Action</span><span class="stroke-text">${escapeHtml(garage.stroke3_action)}</span></div>
        <div class="garage-stroke"><span class="stroke-label">Publish</span><span class="stroke-text">${escapeHtml(garage.stroke4_publish)}</span></div>
      </div>
      <button class="btn btn-secondary action-create-garage-btn">GARAGEに反映</button>
    </div>`
    : "";

  // Priority matrix
  const matrixHtml = renderPriorityMatrix(result.priorityMatrix);

  // First three steps
  const stepsHtml = (result.firstThreeSteps || [])
    .map((step, i) => `<div class="first-step"><span class="step-number">${i + 1}</span><span>${escapeHtml(step)}</span></div>`)
    .join("");

  container.innerHTML = `
    <div class="insight-summary">${escapeHtml(result.summary)}</div>

    <div class="insight-section">
      <h4 class="insight-section-title">まず取り組む3ステップ</h4>
      <div class="first-steps">${stepsHtml}</div>
    </div>

    <div class="insight-section">
      <h4 class="insight-section-title">TODO提案</h4>
      ${filterBarHtml}
      <div class="action-todos-list">${todosHtml}</div>
    </div>

    ${matrixHtml}

    ${garageHtml ? `<div class="insight-section"><h4 class="insight-section-title">GARAGE連携提案</h4>${garageHtml}</div>` : ""}
  `;

  // Event: filter chip toggle
  container.querySelectorAll(".todo-filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const currentFilter = getTodoFilter();
      if (chip.dataset.toggle === "rejected") {
        currentFilter.showRejected = !currentFilter.showRejected;
      } else {
        const p = chip.dataset.priority;
        const set = new Set(currentFilter.priorities);
        if (set.has(p)) set.delete(p);
        else set.add(p);
        // 全て外すと使いづらいので、最後の1つは削除できないように保護
        if (set.size === 0) return;
        currentFilter.priorities = Array.from(set);
      }
      saveTodoFilter(currentFilter);
      renderActionPlan(result, onAddTodo, onCreateGarage, mandaraId);
    });
  });

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

  // Event: reject/却下
  container.querySelectorAll(".action-reject-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const index = parseInt(e.target.dataset.index);
      const todo = result.todos[index];
      if (!todo) return;

      const currentRejected = getRejectedTodos(mandaraId);
      if (currentRejected.has(todo.text)) {
        currentRejected.delete(todo.text);
      } else {
        currentRejected.add(todo.text);
      }
      saveRejectedTodos(mandaraId, currentRejected);
      // 再描画
      renderActionPlan(result, onAddTodo, onCreateGarage, mandaraId);
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
        <div class="cross-theme-name">${escapeHtml(theme.theme)}</div>
        <div class="cross-theme-appears">${escapeHtml((theme.appearsIn || []).join(", "))}</div>
        <div class="cross-theme-significance">${escapeHtml(theme.significance)}</div>
      </div>`
    )
    .join("");

  const depsHtml = (result.dependencies || [])
    .map(
      (dep) => `
      <div class="cross-dep-item">
        <span class="cross-dep-from">${escapeHtml(dep.from)}</span>
        <span class="cross-dep-arrow">&rarr;</span>
        <span class="cross-dep-to">${escapeHtml(dep.to)}</span>
        <span class="cross-dep-desc">${escapeHtml(dep.description)}</span>
      </div>`
    )
    .join("");

  const overlapsHtml = (result.overlaps || [])
    .map(
      (overlap) => `
      <div class="cross-overlap-item">
        <div class="cross-overlap-desc">${escapeHtml(overlap.description)}</div>
        <div class="cross-overlap-rec">${escapeHtml(overlap.recommendation)}</div>
      </div>`
    )
    .join("");

  const insightsHtml = (result.strategicInsights || [])
    .map((insight) => `<li>${escapeHtml(insight)}</li>`)
    .join("");

  container.innerHTML = `
    <div class="insight-summary">${escapeHtml(result.summary)}</div>

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
      const stateClass = cell.isEmpty ? "relevance-empty" : "relevance-high";
      const centerClass = cell.isCenter ? " is-center" : "";
      const preview = cell.isEmpty
        ? '<span class="cell-preview empty">—</span>'
        : `<span class="cell-preview">${escapeHtml(cell.content).slice(0, 40)}${cell.content.length > 40 ? "…" : ""}</span>`;
      const charInfo = cell.isEmpty
        ? ""
        : `<span class="cell-charcount">${cell.charCount}字</span>`;
      return `
        <div class="cell-analysis-item ${stateClass}${centerClass}">
          <span class="cell-number">セル${cell.cellNumber}</span>
          <span class="cell-position">${cell.position}</span>
          ${preview}
          ${charInfo}
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
      <div class="cell-analysis-list local-cell-list">${cellsHtml}</div>
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

// --- Helper renderers ---

function relevanceLabel(relevance) {
  return { high: "高", medium: "中", low: "低", empty: "空" }[relevance] || relevance;
}

function renderCoverage(coverage) {
  if (!coverage) return "";

  const coveredHtml = (coverage.covered || [])
    .map((item) => `<span class="coverage-tag covered">${escapeHtml(item)}</span>`)
    .join("");
  const missingHtml = (coverage.missing || [])
    .map((item) => `<span class="coverage-tag missing">${escapeHtml(item)}</span>`)
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

  // 既知のタイプのみCSSクラスに使う
  const safeType = (t) => (/^(支持|補完|対立|因果|独立)$/.test(t) ? t : "独立");

  const html = relationships
    .map(
      (rel) => `
      <div class="relation-item">
        <span class="relation-cells">セル${Number(rel.from) || "?"} &harr; セル${Number(rel.to) || "?"}</span>
        <span class="relation-type type-${safeType(rel.type)}">${escapeHtml(rel.type)}</span>
        <span class="relation-desc">${escapeHtml(rel.description)}</span>
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
    .map((s) => `<li class="suggestion-item">${escapeHtml(s)}</li>`)
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
      const itemsHtml = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
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
