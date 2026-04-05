// MANDARA Insight - Controller Module
//
// Insight機能の起動フロー・エラーハンドリング・GARAGE連携をまとめたモジュール。
// mandara.js から呼び出され、context オブジェクト経由で状態参照と副作用を受け取る。

import {
  checkAnalysisReady,
  runFullAnalysis,
  runCrossAnalysis,
} from "./mandara-insight.js";
import {
  openInsightPanel,
  closeInsightPanel,
  isInsightPanelOpen,
  switchTab,
  showLoading,
  showError,
  renderStructuralAnalysis,
  renderIssueExtraction,
  renderActionPlan,
  renderCrossAnalysis,
  renderLocalAnalysis,
  removeLocalBanner,
} from "./mandara-insight-ui.js";
import { analyzeLocally } from "./mandara-local-analyzer.js";
import { renderApiSettings } from "./mandara-insight-api-tab.js";
import { AIError, ApiErrorCode } from "./ai-errors.js";
import {
  buildMarkdownReport,
  copyToClipboard,
  downloadAsFile,
} from "./mandara-insight-export.js";

/**
 * HTMLエスケープ (イントロ画面の値挿入用)
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
 * context: {
 *   getCurrentMandara: () => Mandara | null,
 *   getAllMandaras: () => Mandara[],
 *   getCurrentUserId: () => string | null,
 *   saveCurrentMandara: () => Promise<void>,
 *   addTodo: (text) => void,
 *   showToast: (msg) => void,
 *   storage: Storage,  // Storage オブジェクト
 * }
 */
export function createInsightController(context) {
  // 最新の分析結果 (エクスポート用) — { structural, issues, action } or { local }
  let lastResults = null;

  /**
   * Insightパネルを開いて確認画面を表示 (分析は開始しない)
   */
  function showInsightIntro() {
    const currentMandara = context.getCurrentMandara();
    if (!currentMandara) return;

    const readiness = checkAnalysisReady(currentMandara);
    const filledCount = readiness.filledCount ?? 0;

    openInsightPanel();
    switchTab("structural");
    removeLocalBanner();

    // 事前チェック: 入力不足
    if (readiness.reason === "INSUFFICIENT_CONTENT") {
      const container = document.getElementById("structural-result");
      if (container) {
        container.innerHTML = `
          <div class="insight-intro">
            <div class="insight-intro-icon">!</div>
            <h3 class="insight-intro-title">入力が不足しています</h3>
            <p class="insight-intro-text">
              分析には最低${readiness.required}セル以上の入力が必要です。<br>
              現在 ${filledCount} / 9 セルが記入されています。
            </p>
            <p class="insight-intro-hint">
              マンダラのセルを埋めてから再度INSIGHTを開いてください。
            </p>
          </div>`;
      }
      return;
    }

    const aiAvailable = readiness.available;
    const modeLabel = aiAvailable ? "AI分析" : "ローカル簡易分析";
    const modeDesc = aiAvailable
      ? "Gemini/GPTが3段階でマンダラを分析します。分析ごとにAPIを消費します。"
      : "AI未使用のヒューリスティック分析を実行します (APIキー不要)。";

    const container = document.getElementById("structural-result");
    if (!container) return;

    container.innerHTML = `
      <div class="insight-intro">
        <h3 class="insight-intro-title">${modeLabel}を実行しますか？</h3>
        <div class="insight-intro-stats">
          <div class="insight-intro-stat">
            <span class="insight-intro-stat-label">記入セル</span>
            <span class="insight-intro-stat-value">${filledCount} / 9</span>
          </div>
          <div class="insight-intro-stat">
            <span class="insight-intro-stat-label">タイトル</span>
            <span class="insight-intro-stat-value">${escapeHtml(currentMandara.title) || "(無題)"}</span>
          </div>
        </div>
        <p class="insight-intro-text">${modeDesc}</p>
        ${aiAvailable
          ? `<p class="insight-intro-hint">構造分析 → 課題抽出 → アクションプラン の順に自動実行されます。</p>`
          : `<p class="insight-intro-hint">AI分析を使うには API設定 タブでキーを設定してください。</p>`}
        <div class="insight-intro-actions">
          <button type="button" id="insight-start-btn" class="insight-intro-btn primary">
            ${aiAvailable ? "AI分析を開始" : "ローカル分析を表示"}
          </button>
          ${aiAvailable
            ? `<button type="button" id="insight-local-btn" class="insight-intro-btn secondary">ローカル簡易分析のみ</button>`
            : `<button type="button" id="insight-api-btn" class="insight-intro-btn secondary">API設定を開く</button>`}
        </div>
      </div>`;

    const startBtn = document.getElementById("insight-start-btn");
    if (startBtn) {
      startBtn.addEventListener("click", () => {
        if (aiAvailable) {
          startInsightAnalysis();
        } else {
          runLocalFallback();
        }
      });
    }
    const localBtn = document.getElementById("insight-local-btn");
    if (localBtn) {
      localBtn.addEventListener("click", runLocalFallback);
    }
    const apiBtn = document.getElementById("insight-api-btn");
    if (apiBtn) {
      apiBtn.addEventListener("click", () => {
        switchTab("api");
        renderApiSettings();
      });
    }
  }

  /**
   * ローカル (AI未使用) 分析を実行
   */
  function runLocalFallback() {
    const currentMandara = context.getCurrentMandara();
    if (!currentMandara) return;

    console.log("[Insight] Running local fallback analysis");
    const result = analyzeLocally(currentMandara);
    lastResults = { local: result };
    openInsightPanel();
    switchTab("structural");
    renderLocalAnalysis(
      result,
      (text) => {
        context.addTodo(text);
        context.showToast("TODOに追加しました");
      },
      () => {
        openInsightPanel();
        switchTab("api");
        renderApiSettings();
      }
    );
  }

  /**
   * AI分析を起動 (3段階の非同期フロー)
   */
  async function startInsightAnalysis() {
    const currentMandara = context.getCurrentMandara();
    if (!currentMandara) return;

    await context.saveCurrentMandara();

    const readiness = checkAnalysisReady(currentMandara);
    if (!readiness.available) {
      if (readiness.reason === "INSUFFICIENT_CONTENT") {
        alert(`分析には最低${readiness.required}セル以上の入力が必要です（現在${readiness.filledCount}セル）`);
        return;
      }
      if (readiness.reason === "NO_MANDARA") {
        alert("マンダラが選択されていません");
        return;
      }
      runLocalFallback();
      return;
    }

    openInsightPanel();
    switchTab("structural");
    removeLocalBanner();

    try {
      lastResults = { structural: null, issues: null, action: null };
      await runFullAnalysis(currentMandara, (phase, result) => {
        if (!result) {
          const loadingMessages = {
            structural: "構造分析中...",
            issues: "課題抽出中...",
            action: "アクションプラン生成中...",
          };
          showLoading(`${phase === "action" ? "action" : phase}-result`, loadingMessages[phase]);
          switchTab(phase === "action" ? "action" : phase);
        } else {
          lastResults[phase] = result;
          if (phase === "structural") {
            renderStructuralAnalysis(result);
          } else if (phase === "issues") {
            renderIssueExtraction(result);
          } else if (phase === "action") {
            renderActionPlan(
              result,
              handleInsightAddTodo,
              handleInsightCreateGarage,
              currentMandara?.id
            );
          }
        }
      });

      console.log("[Insight] Full analysis complete");
    } catch (error) {
      console.error("[Insight] Analysis failed:", error);

      const code = error instanceof AIError ? error.code : null;

      if (code === ApiErrorCode.API_KEY_REQUIRED) {
        runLocalFallback();
        context.showToast("APIキー未設定のため、ローカル分析を表示しています");
        return;
      }

      if (code === ApiErrorCode.API_KEY_INVALID) {
        openInsightPanel();
        switchTab("api");
        renderApiSettings();
        context.showToast("APIキーが無効です。API設定タブで再入力してください");
        return;
      }

      if (code === ApiErrorCode.RATE_LIMITED) {
        runLocalFallback();
        context.showToast(error.userMessage);
        return;
      }

      const activeTab = document.querySelector(".insight-tab.active");
      const tabName = activeTab?.dataset.tab || "structural";
      const message = error instanceof AIError
        ? error.userMessage
        : `分析中にエラーが発生しました: ${error.message}`;
      showError(`${tabName}-result`, message);
    }
  }

  /**
   * 横断分析を実行
   */
  async function startCrossAnalysis() {
    const allMandaras = context.getAllMandaras();
    if (allMandaras.length < 2) {
      alert("横断分析には2つ以上のマンダラが必要です");
      return;
    }

    showLoading("cross-result", `${allMandaras.length}件のマンダラを横断分析中...`);

    try {
      const result = await runCrossAnalysis(allMandaras);
      renderCrossAnalysis(result);
      console.log("[Insight] Cross analysis complete");
    } catch (error) {
      console.error("[Insight] Cross analysis failed:", error);
      const code = error instanceof AIError ? error.code : null;
      if (code === ApiErrorCode.API_KEY_REQUIRED || code === ApiErrorCode.API_KEY_INVALID) {
        switchTab("api");
        renderApiSettings();
        return;
      }
      const message = error instanceof AIError
        ? error.userMessage
        : `横断分析中にエラーが発生しました: ${error.message}`;
      showError("cross-result", message);
    }
  }

  /**
   * TODO追加ハンドラ (Insight → Mandara)
   */
  function handleInsightAddTodo(text) {
    context.addTodo(text);
    context.showToast("TODOに追加しました");
  }

  /**
   * GARAGE作成ハンドラ - 空スロット優先、上書き時は確認ダイアログ
   */
  async function handleInsightCreateGarage(garageData) {
    try {
      const currentUserId = context.getCurrentUserId();
      const allGarages = await context.storage.loadAllGarages(currentUserId);
      const slots = ["garageA", "garageB", "garageC", "garageD"];

      const isEmptyGarage = (g) =>
        !g || (!g.title && !g.stroke1 && !g.stroke2 && !g.stroke3 && !g.stroke4);

      let targetSlot = slots.find((id) => isEmptyGarage(allGarages[id]));

      if (!targetSlot) {
        const options = slots.map((id) => {
          const g = allGarages[id];
          const title = g?.title?.trim() || "(無題)";
          return `${id.replace("garage", "GARAGE-")}: ${title}`;
        }).join("\n");

        const userChoice = prompt(
          `空のGARAGEがありません。上書きするGARAGEを選んでください:\n\n${options}\n\nA / B / C / D を入力 (キャンセルで中止):`,
          "A"
        );

        if (!userChoice) {
          context.showToast("GARAGE反映をキャンセルしました");
          return;
        }

        const letter = userChoice.trim().toUpperCase();
        if (!["A", "B", "C", "D"].includes(letter)) {
          alert("無効な入力です。A/B/C/Dのいずれかを入力してください");
          return;
        }
        targetSlot = `garage${letter}`;

        if (!confirm(`GARAGE-${letter} の既存内容を上書きします。よろしいですか？`)) {
          return;
        }
      }

      await context.storage.saveStroke(currentUserId, targetSlot, "title", garageData.title || "");
      await context.storage.saveStroke(currentUserId, targetSlot, "stroke1", garageData.stroke1_key || "");
      await context.storage.saveStroke(currentUserId, targetSlot, "stroke2", garageData.stroke2_issue || "");
      await context.storage.saveStroke(currentUserId, targetSlot, "stroke3", garageData.stroke3_action || "");
      await context.storage.saveStroke(currentUserId, targetSlot, "stroke4", garageData.stroke4_publish || "");

      const currentMandara = context.getCurrentMandara();
      if (currentMandara) {
        currentMandara.linkedGarageId = targetSlot;
        await context.saveCurrentMandara();
      }

      const letter = targetSlot.replace("garage", "");
      context.showToast(`GARAGE-${letter}に反映しました`);
      console.log("[Insight] GARAGE created:", targetSlot, garageData.title);
    } catch (error) {
      console.error("[Insight] Failed to create GARAGE:", error);
      alert("GARAGE作成に失敗しました");
    }
  }

  /**
   * API設定タブを開く
   */
  function showApiSettings() {
    openInsightPanel();
    switchTab("api");
    renderApiSettings();
  }

  /**
   * 現在の分析結果を Markdown 文字列として取得
   */
  function getMarkdown() {
    const mandara = context.getCurrentMandara();
    if (!lastResults) return null;
    return buildMarkdownReport(mandara, lastResults);
  }

  /**
   * Markdown をクリップボードにコピー
   */
  async function copyMarkdown() {
    const md = getMarkdown();
    if (!md) {
      context.showToast("エクスポートする分析結果がありません");
      return false;
    }
    const ok = await copyToClipboard(md);
    context.showToast(ok ? "Markdown をコピーしました" : "コピーに失敗しました");
    return ok;
  }

  /**
   * Markdown を .md ファイルとしてダウンロード
   */
  function downloadMarkdown() {
    const md = getMarkdown();
    if (!md) {
      context.showToast("エクスポートする分析結果がありません");
      return false;
    }
    const mandara = context.getCurrentMandara();
    downloadAsFile(md, mandara?.title);
    context.showToast("Markdown をダウンロードしました");
    return true;
  }

  /**
   * エクスポート可能か (分析結果があるか)
   */
  function hasResults() {
    return !!lastResults;
  }

  return {
    showInsightIntro,
    runLocalFallback,
    startInsightAnalysis,
    startCrossAnalysis,
    showApiSettings,
    // Export
    getMarkdown,
    copyMarkdown,
    downloadMarkdown,
    hasResults,
    // Panel controls re-exported for convenience
    openInsightPanel,
    closeInsightPanel,
    isInsightPanelOpen,
    switchTab,
  };
}
