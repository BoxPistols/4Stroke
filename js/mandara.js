// Mandara Page - Main Logic
import {
  getStorageMode,
  isLocalMode,
  isOnlineMode,
  Storage,
  downgradeToLocalIfNeeded,
} from "./storage-service.js";
import { waitForFirebaseCheck } from "./firebase-available.js";
import { TIMINGS } from "./constants.js";
import {
  createBoard,
  migrateMandaraToBoard,
  projectRootCells,
  getGridDisplayCells,
  getGrid,
  getBreadcrumb,
  expandCell,
  createParentGrid,
  setCellText,
  isGridEmpty,
} from "./board-logic.js";
import {
  exportMandarasToJson,
  parseMandarasJson,
  mergeMandaras,
  buildBackupFilename,
} from "./board-io.js";
import { boardToMarkdown } from "./board-md.js";
import { initImportUI } from "./mandara-import-ui.js";
import {
  renderMandaraList as renderMandaraListView,
  showListView as showListViewModule,
  closeListView as closeListViewModule,
} from "./mandara-list-view.js";
import { clearCache as clearInsightCache } from "./mandara-insight.js";
import { ensureSharedKeysLoaded } from "./ai-config.js";
import { createInsightController } from "./mandara-insight-controller.js";
import { renderApiSettings } from "./mandara-insight-api-tab.js";
import { createTagsTodosUI } from "./mandara-tags-todos-ui.js";
import { initSidebarSize } from "./sidebar-size.js";
import { initMandaraViewPrefs } from "./mandara-view-prefs.js";
import { isImeComposing } from "./utils/keyboard.js";

// Controllers (初期化時に生成される)
let insightController = null;
let tagsTodosUI = null;

// タグ/TODO 操作のラッパー (初期化前でも安全に呼べる)
const renderTags = () => tagsTodosUI?.renderTags();
const addTag = (tag) => tagsTodosUI?.addTag(tag);
const editTag = (index) => tagsTodosUI?.editTag(index);
const removeTag = (tag) => tagsTodosUI?.removeTag(tag);
const renderTodos = () => tagsTodosUI?.renderTodos();
const addTodo = (text) => tagsTodosUI?.addTodo(text);
const editTodo = (id) => tagsTodosUI?.editTodo(id);
const toggleTodo = (id) => tagsTodosUI?.toggleTodo(id);
const removeTodo = (id) => tagsTodosUI?.removeTodo(id);

// Current state
let currentUserId = null;
let currentMandara = null; // v2 Board (with a live cells{1..9} shadow of the root grid)
let focusGridId = null; // どのGridをエディタに表示しているか (フラクタルナビ)
let allMandaras = [];
let mandaraOrder = []; // Custom order of mandara IDs
let saveTimer = null;

// Debug helpers - accessible from browser console
window.mandaraDebug = {
  getCurrentMandara: () => currentMandara,
  getAllMandaras: () => allMandaras,
  getLocalStorage: () => {
    const mandarasJson = localStorage.getItem("mandaras");
    return mandarasJson ? JSON.parse(mandarasJson) : [];
  },
  logCurrentState: () => {
    console.log("=== Mandara Debug State ===");
    console.log("Current User ID:", currentUserId);
    console.log("Storage Mode:", getStorageMode());
    console.log("Current Mandara:", currentMandara);
    console.log("All Mandaras Count:", allMandaras.length);
    console.log(
      "LocalStorage Mandaras:",
      window.mandaraDebug.getLocalStorage()
    );
  },
  forceSave: async () => {
    console.log("[DEBUG] Force saving current mandara...");
    await saveCurrentMandara();
  },
  clearAll: () => {
    if (confirm("Clear all mandaras from localStorage?")) {
      localStorage.removeItem("mandaras");
      console.log("[DEBUG] Cleared all mandaras from localStorage");
      window.location.reload();
    }
  },
};

// Format date for display
function formatDate(date) {
  if (!date) return "-";

  let d;
  // Handle Firestore Timestamp (has toDate method)
  if (date && typeof date.toDate === "function") {
    d = date.toDate();
  } else if (date instanceof Date) {
    d = date;
  } else {
    d = new Date(date);
  }

  // Check for invalid date
  if (isNaN(d.getTime())) {
    return "-";
  }

  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Show auto-save message
function showAutoSaveMessage() {
  const message = document.getElementById("message");
  if (message) {
    message.classList.remove("is-hidden");
    setTimeout(() => {
      message.classList.add("is-hidden");
    }, TIMINGS.AUTO_SAVE_MESSAGE_DURATION);
  }
}

// Show toast notification
function showToast(msg) {
  const toast = document.getElementById("success-toast");
  const toastMessage = document.getElementById("success-toast-message");
  if (toast && toastMessage) {
    toastMessage.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, TIMINGS.TOAST_DURATION);
  }
}

// Create new mandara (v2 Board with a legacy cells shadow)
function createNewMandara() {
  const board = createBoard("");
  refreshCellsShadow(board);
  return board;
}

// レガシー読み取り互換のため、ルートGridの内容を cells{1..9} に射影して
// Board 自身に載せておく (list-view / insight / export はこれを読む)
function refreshCellsShadow(board) {
  if (board) board.cells = projectRootCells(board);
}

// Load mandara into UI
function loadMandaraIntoUI(mandara) {
  // v1 マンダラなら Board へ移行 (冪等・非破壊)。以降 Board を真実として扱う。
  const board = migrateMandaraToBoard(mandara);
  refreshCellsShadow(board);
  currentMandara = board;
  focusGridId = board.rootGridId;

  // 一覧の参照も移行後の Board に差し替える (最初の保存前でも list-view /
  // insight 横断分析が編集中と同じオブジェクトを読むようにする)。
  const listIdx = allMandaras.findIndex((m) => m.id === board.id);
  if (listIdx >= 0) allMandaras[listIdx] = board;

  // Title (Board レベル)
  document.getElementById("mandara-title").value = board.title || "";

  // フォーカス中の Grid を描画 + パンくず
  renderFocusedGrid();
  renderBreadcrumb();

  // Memo
  document.getElementById("mandara-memo").value = board.memo || "";

  // Dates
  document.getElementById("created-date").textContent = `作成: ${formatDate(
    board.createdAt
  )}`;
  document.getElementById("updated-date").textContent = `更新: ${formatDate(
    board.updatedAt
  )}`;

  // Tags
  renderTags();

  // TODOs
  renderTodos();

  // Update URL with current mandara ID
  const newUrl = new URL(window.location);
  newUrl.searchParams.set("id", board.id);
  window.history.replaceState({}, "", newUrl);
}

// フォーカス中の Grid の9マスを #mandara-grid に描画する。
// 既存の #cell-1..9 / .mandara-cell / .mandara-center を踏襲しつつ、
// マスごとに「展開」ボタン(中心以外)と子マンダラ有無の表示を付与する。
function renderFocusedGrid() {
  const container = document.getElementById("mandara-grid");
  if (!container || !currentMandara) return;

  const cells = getGridDisplayCells(currentMandara, focusGridId);
  container.textContent = "";

  cells.forEach(({ position, cellId, text, isCenter, hasChild }) => {
    const wrap = document.createElement("div");
    wrap.className = "mandara-cell-wrap" + (isCenter ? " is-center" : "");
    wrap.dataset.position = String(position);

    const ta = document.createElement("textarea");
    ta.id = `cell-${position}`;
    ta.className = "mandara-cell" + (isCenter ? " mandara-center" : "");
    ta.dataset.cell = String(position);
    ta.dataset.cellId = cellId;
    ta.placeholder = isCenter ? "中心キーワード" : String(position);
    ta.value = text;
    wrap.appendChild(ta);

    // 中心マスはそのGridのテーマなので展開不可
    if (!isCenter) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cell-expand-btn" + (hasChild ? " has-child" : "");
      btn.dataset.cellId = cellId;
      btn.title = hasChild ? "子マンダラを開く" : "このマスを中心に展開する";
      btn.setAttribute(
        "aria-label",
        hasChild ? "子マンダラを開く" : "このマスを中心に展開する"
      );
      btn.textContent = hasChild ? "◉" : "⤢";
      wrap.appendChild(btn);
    }

    container.appendChild(wrap);
  });
}

// パンくず(ルート → フォーカス中Grid)を描画
function renderBreadcrumb() {
  const nav = document.getElementById("mandara-breadcrumb");
  if (!nav || !currentMandara) return;

  const crumbs = getBreadcrumb(currentMandara, focusGridId);
  nav.textContent = "";

  crumbs.forEach((crumb, index) => {
    if (index > 0) {
      const sep = document.createElement("span");
      sep.className = "breadcrumb-sep";
      sep.setAttribute("aria-hidden", "true");
      sep.textContent = "›";
      nav.appendChild(sep);
    }
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "breadcrumb-item";
    btn.dataset.gridId = crumb.gridId;
    const isCurrent = crumb.gridId === focusGridId;
    btn.textContent = crumb.label || (index === 0 ? "ルート" : "(無題)");
    if (isCurrent) {
      btn.classList.add("is-current");
      btn.setAttribute("aria-current", "true");
    }
    nav.appendChild(btn);
  });

  // ルート以外を表示中のときだけ "親構造を作る" を活性化するのではなく、
  // 常に有効(どの階層からでも上位構造を作れる)。ボタンはHTML側に常設。
}

// フォーカス中の Grid へ移動して再描画。移動前に現在のUIを同期取り込みし、
// その後に永続化する (取り込みと再描画の間に await を挟まない = 取りこぼし防止)。
async function navigateToGrid(gridId) {
  if (!currentMandara || !getGrid(currentMandara, gridId)) return;
  if (gridId === focusGridId) return; // 現在地は再描画不要 (フォーカスも保つ)
  clearTimeout(saveTimer);
  captureUiIntoBoard();
  focusGridId = gridId;
  renderFocusedGrid();
  renderBreadcrumb();
  await persistBoard();
}

// Save current mandara
// 現在のUI(タイトル/メモ/フォーカス中Gridの9マス)を Board モデルへ
// **同期的に**取り込む。DOM読み取り→モデル反映→シャドウ更新まで await を
// 挟まないため、この後すぐ再描画してもキーストロークを取りこぼさない。
function captureUiIntoBoard() {
  if (!currentMandara) return;

  currentMandara.title = document.getElementById("mandara-title").value;
  currentMandara.memo = document.getElementById("mandara-memo").value;

  // フォーカス中の Grid の9マスを書き戻す。setCellText が親子(中心セル)の
  // 同期を担うので、子Gridで編集しても親セル/ルートまで矛盾なく反映される。
  document
    .getElementById("mandara-grid")
    ?.querySelectorAll("textarea.mandara-cell")
    .forEach((ta) => {
      const cellId = ta.dataset.cellId;
      if (cellId) {
        setCellText(currentMandara, focusGridId, cellId, ta.value);
      }
    });

  // レガシー読み取り互換のシャドウを最新化
  refreshCellsShadow(currentMandara);
  currentMandara.updatedAt = new Date().toISOString();

  // メモリ上の一覧も同一参照に揃える (list-view/insight が最新を読む)
  const idx = allMandaras.findIndex((m) => m.id === currentMandara.id);
  if (idx >= 0) allMandaras[idx] = currentMandara;
}

// Board を永続化する (取り込みは captureUiIntoBoard 側の責務)。
async function persistBoard() {
  if (!currentMandara) return;
  try {
    await Storage.saveMandara(currentUserId, currentMandara);
    document.getElementById("updated-date").textContent = `更新: ${formatDate(
      currentMandara.updatedAt
    )}`;
    console.log("[INFO] Saved mandara:", {
      id: currentMandara.id,
      title: currentMandara.title,
      grids: Object.keys(currentMandara.grids || {}).length,
      tags: currentMandara.tags?.length || 0,
      todos: currentMandara.todos?.length || 0,
    });
    showAutoSaveMessage();
  } catch (error) {
    console.error("[ERROR] Failed to save mandara:", error);
    alert("保存に失敗しました");
  }
}

// 取り込み + 永続化。tagsTodosUI / insight コントローラーのコールバック互換。
async function saveCurrentMandara() {
  if (!currentMandara) return;
  captureUiIntoBoard();
  await persistBoard();
}

// Debounced save
function debouncedSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveCurrentMandara();
  }, TIMINGS.DEBOUNCE_DELAY);
}

// ズームイン: マスを中心として子Gridを展開し、その子へ移動する
async function expandCellAndFocus(cellId) {
  if (!currentMandara) return;
  clearTimeout(saveTimer);
  captureUiIntoBoard(); // 展開元セルの最新テキストを確定してから展開
  const child = expandCell(currentMandara, focusGridId, cellId);
  if (!child) return; // 中心マスなどは展開不可
  refreshCellsShadow(currentMandara);
  focusGridId = child.id;
  renderFocusedGrid();
  renderBreadcrumb();
  await persistBoard();
  showToast("マスを展開しました");
}

// ズームアウト: いまの全体を1マスに含む親Gridを新設し、新ルートへ移動する
async function createParentAndFocus() {
  if (!currentMandara) return;
  clearTimeout(saveTimer);
  captureUiIntoBoard();
  // 空(全マス空+子なし)のルートに親を積み増しても意味がないので防ぐ
  if (isGridEmpty(getGrid(currentMandara, currentMandara.rootGridId))) {
    showToast("先に内容を入力してください");
    return;
  }
  const parent = createParentGrid(currentMandara);
  if (!parent) return;
  refreshCellsShadow(currentMandara);
  focusGridId = currentMandara.rootGridId;
  renderFocusedGrid();
  renderBreadcrumb();
  await persistBoard();
  showToast("親構造を作成しました");
}


// Delete current mandara
async function deleteCurrentMandara() {
  if (!currentMandara) {
    console.warn("[WARN] No current mandara to delete");
    return;
  }

  console.log("[INFO] Attempting to delete mandara:", currentMandara.id);

  if (!confirm(`「${currentMandara.title || "無題"}」を削除しますか？`)) {
    console.log("[INFO] Delete cancelled by user");
    return;
  }

  try {
    await Storage.deleteMandara(currentUserId, currentMandara.id);
    console.log("[SUCCESS] Deleted mandara:", currentMandara.id);
    showToast("削除しました");

    // Load all mandaras and mandara order, then show first one or create new
    await loadAllMandaras();
    await loadMandaraOrder();
    await loadFirstOrCreateNew();
  } catch (error) {
    console.error("[ERROR] Failed to delete mandara:", error);
    alert("削除に失敗しました");
  }
}

// Helper: Get first mandara based on custom order
function getFirstMandaraByOrder() {
  if (mandaraOrder.length > 0) {
    const firstId = mandaraOrder[0];
    const mandara = allMandaras.find((m) => m.id === firstId);
    if (mandara) return mandara;
  }
  return allMandaras[0];
}

// Helper: Load first mandara or create new one
async function loadFirstOrCreateNew() {
  if (allMandaras.length > 0) {
    loadMandaraIntoUI(getFirstMandaraByOrder());
  } else {
    const newMandara = createNewMandara();
    await Storage.saveMandara(currentUserId, newMandara);
    allMandaras = [newMandara];
    mandaraOrder = [newMandara.id];
    await saveMandaraOrder();
    loadMandaraIntoUI(newMandara);
  }
}

// Helper: Re-render list with current sort/filter
function rerenderList() {
  const sortSelect = document.getElementById("sort-select");
  const filterInput = document.getElementById("filter-input");
  renderMandaraList(
    filterInput ? filterInput.value : "",
    sortSelect ? sortSelect.value : "custom"
  );
}

// Delete mandara by ID (for list view)
async function deleteMandara(mandaraId) {
  const mandara = allMandaras.find((m) => m.id === mandaraId);
  if (!mandara) return;

  if (!confirm(`「${mandara.title || "無題"}」を削除しますか？`)) return;

  try {
    await Storage.deleteMandara(currentUserId, mandaraId);
    showToast("削除しました");
    await loadAllMandaras();
    await loadMandaraOrder();
    rerenderList();
    if (currentMandara && currentMandara.id === mandaraId) {
      await loadFirstOrCreateNew();
    }
  } catch (error) {
    console.error("[ERROR] Failed to delete mandara:", error);
    alert("削除に失敗しました");
  }
}

// Delete multiple mandaras by IDs
async function deleteMandaras(mandaraIds) {
  if (mandaraIds.length === 0) return;

  if (!confirm(`${mandaraIds.length}件のマンダラを削除しますか？`)) return;

  try {
    await Storage.deleteMandaras(currentUserId, mandaraIds);
    showToast(`${mandaraIds.length}件削除しました`);
    await loadAllMandaras();
    await loadMandaraOrder();
    rerenderList();
    if (currentMandara && mandaraIds.includes(currentMandara.id)) {
      await loadFirstOrCreateNew();
    }
  } catch (error) {
    console.error("[ERROR] Failed to delete mandaras:", error);
    alert("削除に失敗しました");
  }
}

// Delete all mandaras
async function deleteAllMandaras() {
  if (allMandaras.length === 0) {
    alert("削除するマンダラがありません");
    return;
  }

  const count = allMandaras.length;
  if (
    !confirm(
      `全${count}件のマンダラを削除しますか？\n\nこの操作は取り消せません。`
    )
  ) {
    console.log("[INFO] Delete all cancelled by user");
    return;
  }

  // Double confirmation for safety
  if (!confirm("本当に全てのマンダラを削除しますか？")) {
    console.log("[INFO] Delete all cancelled by user (2nd confirm)");
    return;
  }

  try {
    const ids = allMandaras.map((m) => m.id);
    await deleteMandaras(ids);
  } catch (error) {
    console.error("[ERROR] Failed to delete all mandaras:", error);
    alert("削除に失敗しました");
  }
}

// テキストをファイルとしてダウンロードさせる
function downloadTextFile(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Export all mandaras as a JSON backup file
async function exportAllToJson() {
  try {
    await loadAllMandaras();
    await loadMandaraOrder();

    if (allMandaras.length === 0) {
      alert("エクスポートするマンダラがありません");
      return;
    }

    const json = exportMandarasToJson(allMandaras, mandaraOrder);
    downloadTextFile(
      buildBackupFilename(),
      json,
      "application/json;charset=utf-8"
    );

    showToast(`${allMandaras.length}件をエクスポートしました`);
  } catch (error) {
    console.error("[ERROR] Failed to export mandaras:", error);
    alert("エクスポートに失敗しました");
  }
}

// ファイル名として安全な文字列にする (Windows禁止文字/制御文字/前後空白/
// 長さを丸める。空文字化した場合はフォールバック名を返す)
function sanitizeFilenameBase(name, fallback) {
  const cleaned = String(name || "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f\\/:*?"<>|]/g, "_")
    .trim()
    .replace(/\.+$/, "") // 末尾のドット (Windowsで問題になりうる)
    .slice(0, 100);
  return cleaned || fallback;
}

// 現在のマンダラ(ツリー全体)をMarkdownとしてダウンロードする
function exportCurrentBoardAsMarkdown() {
  if (!currentMandara) return;
  captureUiIntoBoard(); // 未保存の編集も反映してから出力
  const md = boardToMarkdown(currentMandara);
  const safeTitle = sanitizeFilenameBase(currentMandara.title, "mandara");
  downloadTextFile(`${safeTitle}.md`, md, "text/markdown;charset=utf-8");
  showToast("Markdownを出力しました");
}

// Markdownインポート確定時: 編集中のマンダラを保存してから、取り込んだ
// BoardをStorageへ保存して開く。
// 先に flush しないと、インポート直前に入力していた未保存の文字が
// 「取り込み後に発火する保留中のデバウンス保存」で失われる恐れがある。
async function handleImportedBoard(board) {
  clearTimeout(saveTimer);
  if (currentMandara) {
    captureUiIntoBoard();
    await persistBoard();
  }
  await Storage.saveMandara(currentUserId, board);
  await loadAllMandaras();
  await loadMandaraOrder();
  loadMandaraIntoUI(board);
  const gridCount = Object.keys(board.grids || {}).length;
  showToast(
    gridCount > 1
      ? `取り込みました (子マンダラ ${gridCount - 1}枚を含む)`
      : "取り込みました"
  );
}

const IMPORT_ERROR_MESSAGES = {
  INVALID_JSON: "JSONファイルを読み取れませんでした",
  INVALID_FORMAT: "4STROKESのバックアップ形式ではありません",
  UNSUPPORTED_VERSION:
    "このバックアップは新しいバージョンのアプリで作成されています",
};

// Import mandaras from a JSON backup file (merge, non-destructive)
async function importFromJsonFile(file) {
  let imported;
  try {
    imported = parseMandarasJson(await file.text()).mandaras;
  } catch (error) {
    console.error("[ERROR] Failed to parse backup file:", error);
    alert(IMPORT_ERROR_MESSAGES[error.message] || "読み込みに失敗しました");
    return;
  }

  const { merged, added, updated, skipped } = mergeMandaras(
    allMandaras,
    imported
  );
  const changedIds = new Set([...added, ...updated]);

  if (changedIds.size === 0) {
    showToast("すべて取り込み済みです (追加・更新なし)");
    return;
  }

  if (
    !confirm(
      `${added.length}件を追加、${updated.length}件を更新します。` +
        (skipped.length > 0 ? `\n(${skipped.length}件は既存の方が新しいためスキップ)` : "")
    )
  ) {
    return;
  }

  try {
    for (const mandara of merged) {
      if (changedIds.has(mandara.id)) {
        await Storage.saveMandara(currentUserId, mandara);
      }
    }

    // 再読込 (loadMandaraOrder が新規IDを順序に取り込む)
    await loadAllMandaras();
    await loadMandaraOrder();
    rerenderList();
    if (!currentMandara || !allMandaras.some((m) => m.id === currentMandara.id)) {
      await loadFirstOrCreateNew();
    }

    showToast(`インポート完了: 追加${added.length}件 / 更新${updated.length}件`);
  } catch (error) {
    console.error("[ERROR] Failed to import mandaras:", error);
    alert("インポートに失敗しました");
  }
}

// Load all mandaras
async function loadAllMandaras() {
  try {
    allMandaras = await Storage.loadAllMandaras(currentUserId);
    console.log(`[INFO] Loaded ${allMandaras.length} mandaras`);
  } catch (error) {
    console.error("[ERROR] Failed to load mandaras:", error);
    allMandaras = [];
  }
}

// Load mandara order
async function loadMandaraOrder() {
  try {
    mandaraOrder = await Storage.loadMandaraOrder(currentUserId);
    console.log(`[INFO] Loaded mandara order: ${mandaraOrder.length} items`);

    // Validate order - remove IDs that don't exist in allMandaras
    const existingIds = new Set(allMandaras.map((m) => m.id));
    mandaraOrder = mandaraOrder.filter((id) => existingIds.has(id));

    // Add any new mandaras that are not in the order (at the beginning)
    const orderSet = new Set(mandaraOrder);
    const newMandaras = allMandaras
      .filter((m) => !orderSet.has(m.id))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .map((m) => m.id);

    if (newMandaras.length > 0) {
      mandaraOrder = [...newMandaras, ...mandaraOrder];
      // Save updated order
      await Storage.saveMandaraOrder(currentUserId, mandaraOrder);
    }
  } catch (error) {
    console.error("[ERROR] Failed to load mandara order:", error);
    mandaraOrder = [];
  }
}

// Save mandara order
async function saveMandaraOrder() {
  try {
    await Storage.saveMandaraOrder(currentUserId, mandaraOrder);
    console.log(`[INFO] Saved mandara order: ${mandaraOrder.length} items`);
  } catch (error) {
    console.error("[ERROR] Failed to save mandara order:", error);
  }
}

// Reorder mandara in the list
function reorderMandara(fromIndex, toIndex) {
  if (fromIndex === toIndex) return;

  const [movedId] = mandaraOrder.splice(fromIndex, 1);
  mandaraOrder.splice(toIndex, 0, movedId);

  console.log(`[INFO] Mandara reordered: ${fromIndex} -> ${toIndex}`);
  saveMandaraOrder();
}

// Get context for list view module
function getListViewContext() {
  return {
    allMandaras,
    mandaraOrder,
    formatDate,
    loadMandaraIntoUI,
    closeListView,
    deleteMandara,
    reorderMandara,
    showToast,
  };
}

// Render mandara list (wrapper for module)
function renderMandaraList(filter = "", sortBy = "custom") {
  renderMandaraListView(getListViewContext(), filter, sortBy);
}

// Show list view
function showListView() {
  showListViewModule(() => renderMandaraList());
}

// Close list view
function closeListView() {
  closeListViewModule();
}


// Setup Insight event listeners (uses insightController)
function setupInsightEventListeners() {
  if (!insightController) return;

  // API設定タブを初期描画 (ユーザーが初回クリックする前に準備)
  renderApiSettings();

  // Insight button → 確認画面表示 (即分析しない)
  const insightBtn = document.getElementById("insight-btn");
  if (insightBtn) {
    insightBtn.addEventListener("click", () => {
      if (insightController.isInsightPanelOpen()) {
        insightController.closeInsightPanel();
      } else {
        insightController.showInsightIntro();
      }
    });
  }

  // Close button
  const closeBtn = document.getElementById("insight-close-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", insightController.closeInsightPanel);
  }

  // Rerun button (キャッシュクリア後に再分析)
  const rerunBtn = document.getElementById("insight-rerun-btn");
  if (rerunBtn) {
    rerunBtn.addEventListener("click", () => {
      clearInsightCache();
      insightController.startInsightAnalysis();
    });
  }

  // Export menu (MD出力)
  const exportBtn = document.getElementById("insight-export-btn");
  const exportDropdown = document.getElementById("insight-export-dropdown");
  const copyBtn = document.getElementById("insight-export-copy");
  const downloadBtn = document.getElementById("insight-export-download");

  if (exportBtn && exportDropdown) {
    exportBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      exportDropdown.classList.toggle("is-hidden");
    });
    // ドロップダウン外クリックで閉じる
    document.addEventListener("click", (e) => {
      if (!exportBtn.contains(e.target) && !exportDropdown.contains(e.target)) {
        exportDropdown.classList.add("is-hidden");
      }
    });
  }
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      exportDropdown.classList.add("is-hidden");
      await insightController.copyMarkdown();
    });
  }
  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      exportDropdown.classList.add("is-hidden");
      insightController.downloadMarkdown();
    });
  }

  // Tab switching - API設定タブを開いたらローカルバナーを消去し再描画
  document.querySelectorAll(".insight-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabName = tab.dataset.tab;
      insightController.switchTab(tabName);
      if (tabName === "api") {
        // バナーを消してAPI設定を再描画 (最新状態を反映)
        const banner = document.getElementById("local-mode-banner");
        if (banner) banner.remove();
        renderApiSettings();
      }
    });
  });

  // Cross analysis button
  const crossBtn = document.getElementById("run-cross-analysis-btn");
  if (crossBtn) {
    crossBtn.addEventListener("click", insightController.startCrossAnalysis);
  }
}

// Setup event listeners
function setupEventListeners() {
  // Title input
  const titleInput = document.getElementById("mandara-title");
  if (titleInput) {
    titleInput.addEventListener("input", debouncedSave);
  }

  // Cell inputs + expand buttons (delegated — the grid is re-rendered on navigation)
  const gridContainer = document.getElementById("mandara-grid");
  if (gridContainer) {
    gridContainer.addEventListener("input", (e) => {
      if (e.target.classList.contains("mandara-cell")) {
        debouncedSave();
      }
    });
    gridContainer.addEventListener("click", (e) => {
      const btn = e.target.closest(".cell-expand-btn");
      if (btn && btn.dataset.cellId) {
        expandCellAndFocus(btn.dataset.cellId);
      }
    });
  }

  // Breadcrumb navigation (delegated)
  const breadcrumbNav = document.getElementById("mandara-breadcrumb");
  if (breadcrumbNav) {
    breadcrumbNav.addEventListener("click", (e) => {
      const item = e.target.closest(".breadcrumb-item");
      if (item && item.dataset.gridId) {
        navigateToGrid(item.dataset.gridId);
      }
    });
  }

  // Zoom out: create a parent structure
  const zoomOutBtn = document.getElementById("zoom-out-btn");
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener("click", createParentAndFocus);
  }

  // Memo input
  const memoInput = document.getElementById("mandara-memo");
  if (memoInput) {
    memoInput.addEventListener("input", debouncedSave);
  }

  // Tag input with IME support
  const tagInput = document.getElementById("tag-input");
  if (tagInput) {
    tagInput.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      // IME 変換確定の Enter は submit せず、IME に処理を譲る
      if (isImeComposing(e)) return;
      e.preventDefault();
      addTag(tagInput.value);
      tagInput.value = "";
    });
  }

  // Tag actions (delegated)
  const tagsContainer = document.getElementById("tags-container");
  if (tagsContainer) {
    tagsContainer.addEventListener("click", (e) => {
      // Remove tag
      if (e.target.classList.contains("tag-remove")) {
        console.log("[INFO] Tag remove button clicked:", e.target.dataset.tag);
        const tag = e.target.dataset.tag;
        removeTag(tag);
      }
      // Edit tag
      else if (e.target.classList.contains("tag-text")) {
        console.log("[INFO] Tag text clicked for edit");
        const index = parseInt(e.target.dataset.index);
        editTag(index);
      }
    });
    console.log("[INFO] Tags container listener attached");
  } else {
    console.warn("[WARN] Tags container not found");
  }

  // Todo input with IME support
  const todoInput = document.getElementById("todo-input");
  if (todoInput) {
    todoInput.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      // IME 変換確定の Enter は submit せず、IME に処理を譲る
      if (isImeComposing(e)) return;
      e.preventDefault();
      addTodo(todoInput.value);
      todoInput.value = "";
    });
  }

  // Todo actions (delegated)
  const todosContainer = document.getElementById("todos-container");
  if (todosContainer) {
    // Click events for checkbox, remove button, and edit
    todosContainer.addEventListener("click", (e) => {
      // Remove
      if (e.target.classList.contains("todo-remove")) {
        console.log("[INFO] Todo remove button clicked");
        removeTodo(e.target.dataset.id);
      }
      // Edit
      else if (e.target.classList.contains("todo-text")) {
        console.log("[INFO] Todo text clicked for edit");
        editTodo(e.target.dataset.id);
      }
    });

    // Change event for checkbox
    todosContainer.addEventListener("change", (e) => {
      if (e.target.classList.contains("todo-checkbox")) {
        console.log("[INFO] Todo checkbox changed");
        toggleTodo(e.target.dataset.id);
      }
    });

    console.log("[INFO] Todo container listeners attached");
  } else {
    console.warn("[WARN] Todos container not found");
  }

  // New mandara button
  const newMandaraBtn = document.getElementById("new-mandara-btn");
  if (newMandaraBtn) {
    newMandaraBtn.addEventListener("click", async () => {
      // Save current mandara before creating new one
      if (currentMandara) {
        await saveCurrentMandara();
      }

      const newMandara = createNewMandara();
      await Storage.saveMandara(currentUserId, newMandara);
      allMandaras.unshift(newMandara);
      // Add to custom order at the beginning
      mandaraOrder.unshift(newMandara.id);
      await saveMandaraOrder();

      // 別パネル (LIST / INSIGHT) を開いていると新マンダラの編集画面が
      // 隠れてしまい、作成されたことに気付きにくい。明示的に閉じる。
      closeListView();
      if (insightController?.isInsightPanelOpen?.()) {
        insightController.closeInsightPanel();
      }

      loadMandaraIntoUI(newMandara); // This will update URL automatically

      // 編集画面の先頭にスクロールし、タイトル入力にフォーカスさせて
      // 「ここに新しいマンダラができた」ことを視覚的に伝える。
      window.scrollTo({ top: 0, behavior: "auto" });
      const titleInput = document.getElementById("mandara-title");
      if (titleInput) {
        titleInput.focus();
        titleInput.select();
      }

      showToast("新しいマンダラを作成しました");
    });
  }

  // Delete mandara button
  const deleteBtn = document.getElementById("delete-mandara-btn");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", deleteCurrentMandara);
    console.log("[INFO] Delete button listener attached");
  } else {
    console.warn("[WARN] Delete button not found");
  }

  // List view button
  const listViewBtn = document.getElementById("list-view-btn");
  if (listViewBtn) {
    listViewBtn.addEventListener("click", showListView);
    console.log("[INFO] List view button listener attached");
  } else {
    console.warn("[WARN] List view button not found");
  }

  // Close list view button
  const listCloseBtn = document.getElementById("list-close-btn");
  if (listCloseBtn) {
    listCloseBtn.addEventListener("click", closeListView);
    console.log("[INFO] List close button listener attached");
  } else {
    console.warn("[WARN] List close button not found");
  }

  // Search button
  const searchBtn = document.getElementById("search-btn");
  if (searchBtn) {
    searchBtn.addEventListener("click", () => {
      console.log("[INFO] Search button clicked");
      showListView();
      const filterInput = document.getElementById("filter-input");
      if (filterInput) {
        filterInput.focus();
      }
    });
    console.log("[INFO] Search button listener attached");
  } else {
    console.warn("[WARN] Search button not found");
  }

  // Filter input
  const filterInput = document.getElementById("filter-input");
  if (filterInput) {
    filterInput.addEventListener("input", () => {
      const sortSelect = document.getElementById("sort-select");
      renderMandaraList(
        filterInput.value,
        sortSelect ? sortSelect.value : "updated-desc"
      );
    });
  }

  // Sort select
  const sortSelect = document.getElementById("sort-select");
  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      renderMandaraList(filterInput ? filterInput.value : "", sortSelect.value);
    });
  }

  // Select all button
  const selectAllBtn = document.getElementById("select-all-btn");
  if (selectAllBtn) {
    selectAllBtn.addEventListener("click", () => {
      const checkboxes = document.querySelectorAll(".card-checkbox");
      checkboxes.forEach((cb) => (cb.checked = true));
    });
  }

  // Deselect all button
  const deselectAllBtn = document.getElementById("deselect-all-btn");
  if (deselectAllBtn) {
    deselectAllBtn.addEventListener("click", () => {
      const checkboxes = document.querySelectorAll(".card-checkbox");
      checkboxes.forEach((cb) => (cb.checked = false));
    });
  }

  // Delete selected button
  const deleteSelectedBtn = document.getElementById("delete-selected-btn");
  if (deleteSelectedBtn) {
    deleteSelectedBtn.addEventListener("click", async () => {
      const checkboxes = document.querySelectorAll(".card-checkbox:checked");
      const ids = Array.from(checkboxes).map((cb) => cb.dataset.id);
      if (ids.length === 0) {
        alert("削除するマンダラを選択してください");
        return;
      }
      await deleteMandaras(ids);
    });
  }

  // Delete all button
  const deleteAllBtn = document.getElementById("delete-all-btn");
  if (deleteAllBtn) {
    deleteAllBtn.addEventListener("click", deleteAllMandaras);
  }

  // Export JSON button
  const exportJsonBtn = document.getElementById("export-json-btn");
  if (exportJsonBtn) {
    exportJsonBtn.addEventListener("click", exportAllToJson);
  }

  // Export current board as Markdown
  const exportMdBtn = document.getElementById("export-md-btn");
  if (exportMdBtn) {
    exportMdBtn.addEventListener("click", exportCurrentBoardAsMarkdown);
  }

  // Import JSON button (delegates to hidden file input)
  const importJsonBtn = document.getElementById("import-json-btn");
  const importJsonInput = document.getElementById("import-json-input");
  if (importJsonBtn && importJsonInput) {
    importJsonBtn.addEventListener("click", () => importJsonInput.click());
    importJsonInput.addEventListener("change", async () => {
      const file = importJsonInput.files?.[0];
      importJsonInput.value = ""; // 同じファイルの再選択を可能にする
      if (file) {
        await importFromJsonFile(file);
      }
    });
  }

  // Logout button
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      if (isOnlineMode()) {
        if (confirm("ログアウトしますか？")) {
          const { logout } = await import("./auth.js");
          try {
            await logout();
            window.location.href = "/login.html";
          } catch (error) {
            console.error("[ERROR] Logout failed:", error);
            alert("ログアウトに失敗しました");
          }
        }
      } else {
        if (confirm("オンラインモードに切り替えますか？")) {
          window.location.href = "/login.html";
        }
      }
    });
  }
}

// Initialize app
document.addEventListener("DOMContentLoaded", async () => {
  console.log("[INFO] Mandara app starting...");

  // Firebase可用性チェックを待ち、利用不可ならローカルモードにダウングレード
  await waitForFirebaseCheck();
  downgradeToLocalIfNeeded();

  // ビュー設定 (サイドバー幅・文字サイズ・サイドバー折りたたみ) を即座に
  // 初期化。データ読込みを待たずに body 属性を反映できるようにする。
  initSidebarSize();
  initMandaraViewPrefs();

  if (isOnlineMode()) {
    // Online mode - require authentication
    const { onAuthChange } = await import("./auth.js");

    onAuthChange(async (user) => {
      if (!user) {
        window.location.href = "/login.html";
        return;
      }

      console.log("[SUCCESS] Logged in:", user.email);
      currentUserId = user.uid;

      // Update logout button
      const logoutBtn = document.getElementById("logout-btn");
      if (logoutBtn) {
        logoutBtn.title = `Logout (${user.email})`;
      }

      await initializeApp();
    });
  } else {
    // Local mode
    console.log("[INFO] Running in local storage mode");
    currentUserId = null;

    // Update logout button for local mode
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
      const logoutText = logoutBtn.querySelector(".logout-text");
      if (logoutText) {
        logoutText.textContent = "LOGIN";
      }
      logoutBtn.title = "Switch to Online Mode";
    }

    await initializeApp();
  }
});

// initializeApp の再入防止ガード。
// onAuthChange は Firebase の onAuthStateChanged をそのまま公開しており、
// 同一セッション中に複数回発火し得る (トークン更新・複数タブ間の
// セッション同期・アカウント連携フロー等)。ガードが無いと
// setupEventListeners/initImportUI 等がボタンへ二重にリスナーを
// 束ね、1クリックでインポート/新規作成/削除が二重実行される。
let appInitialized = false;

// Initialize app logic
async function initializeApp() {
  if (appInitialized) {
    console.log("[INFO] initializeApp already ran, skipping re-init");
    return;
  }
  appInitialized = true;

  // 共有APIキーを先にロード (存在すれば)
  await ensureSharedKeysLoaded();

  // タグ/TODO UIコントローラーを初期化
  tagsTodosUI = createTagsTodosUI({
    getCurrentMandara: () => currentMandara,
    saveCurrentMandara,
  });

  // Markdownインポートモーダルを初期化
  initImportUI({ onImported: handleImportedBoard });

  // Insight コントローラーを初期化 (状態参照とコールバックを注入)
  insightController = createInsightController({
    getCurrentMandara: () => currentMandara,
    getAllMandaras: () => allMandaras,
    getCurrentUserId: () => currentUserId,
    saveCurrentMandara,
    addTodo,
    showToast,
    storage: Storage,
  });

  // Load all mandaras
  await loadAllMandaras();

  // Load mandara order (must be after loadAllMandaras)
  await loadMandaraOrder();

  // Check URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const mandaraId = urlParams.get("id");

  // Helper: Get first mandara based on custom order
  function getFirstMandara() {
    if (mandaraOrder.length > 0) {
      // Use custom order - find the first mandara in the order
      const firstId = mandaraOrder[0];
      const mandara = allMandaras.find((m) => m.id === firstId);
      if (mandara) return mandara;
    }
    // Fall back to first in allMandaras (sorted by updatedAt)
    return allMandaras[0];
  }

  // If there's a specific mandara ID, load it
  if (mandaraId) {
    // Check if mandara is already in the list
    let mandara = allMandaras.find((m) => m.id === mandaraId);

    // If not in list, try to load from storage
    if (!mandara) {
      mandara = await Storage.loadMandara(currentUserId, mandaraId);
      if (mandara) {
        // Add to list if found
        allMandaras.unshift(mandara);
        // Also add to order at the beginning
        if (!mandaraOrder.includes(mandara.id)) {
          mandaraOrder.unshift(mandara.id);
          saveMandaraOrder();
        }
      }
    }

    if (mandara) {
      loadMandaraIntoUI(mandara);
      console.log("[INFO] Loaded mandara from URL:", mandaraId);
    } else {
      // Mandara not found, load first in custom order or create new
      if (allMandaras.length > 0) {
        loadMandaraIntoUI(getFirstMandara());
      } else {
        const firstMandara = createNewMandara();
        await Storage.saveMandara(currentUserId, firstMandara);
        allMandaras = [firstMandara];
        mandaraOrder = [firstMandara.id];
        await saveMandaraOrder();
        loadMandaraIntoUI(firstMandara);
      }
    }
  } else if (allMandaras.length > 0) {
    // Load first mandara based on custom order
    loadMandaraIntoUI(getFirstMandara());
  } else {
    // Create first mandara
    const firstMandara = createNewMandara();
    await Storage.saveMandara(currentUserId, firstMandara);
    allMandaras = [firstMandara];
    mandaraOrder = [firstMandara.id];
    await saveMandaraOrder();
    loadMandaraIntoUI(firstMandara);
  }

  // Setup event listeners
  setupEventListeners();
  setupInsightEventListeners();

  console.log("[INFO] Mandara app initialized");
}
