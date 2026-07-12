/**
 * Mandara Data Actions Module
 * 削除・JSONバックアップ入出力・Markdownエクスポート・インポート確定処理を担う。
 * 状態(currentMandara/allMandaras/mandaraOrder等)は持たず、必要な読み取り/
 * 更新はすべて deps 経由のコールバックで行う
 * (createTagsTodosUI / createInsightController と同じ依存性注入パターン)。
 *
 * js/mandara.js のファイルサイズ上限(CI: 1000行)対応として、削除系と
 * バックアップI/O系(関数定義+イベント配線)をここへ切り出した。
 */

import { Storage } from "./storage-service.js";
import {
  exportMandarasToJson,
  parseMandarasJson,
  mergeMandaras,
  buildBackupFilename,
} from "./board-io.js";
import { boardToMarkdown } from "./board-md.js";

const IMPORT_ERROR_MESSAGES = {
  INVALID_JSON: "JSONファイルを読み取れませんでした",
  INVALID_FORMAT: "4STROKESのバックアップ形式ではありません",
  UNSUPPORTED_VERSION:
    "このバックアップは新しいバージョンのアプリで作成されています",
};

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

/**
 * @param {Object} deps
 * @param {() => Object|null} deps.getCurrentMandara
 * @param {() => string|null} deps.getCurrentUserId
 * @param {() => Array} deps.getAllMandaras
 * @param {() => Array} deps.getMandaraOrder
 * @param {() => void} deps.clearPendingSave - デバウンス保存タイマーの取り消し
 * @param {() => void} deps.captureUiIntoBoard - 現在のUIをモデルへ同期取り込み
 * @param {() => Promise<void>} deps.persistBoard - モデルを永続化
 * @param {() => Promise<void>} deps.loadAllMandaras
 * @param {() => Promise<void>} deps.loadMandaraOrder
 * @param {() => Promise<void>} deps.loadFirstOrCreateNew
 * @param {(mandara: Object) => void} deps.loadMandaraIntoUI
 * @param {() => void} deps.rerenderList
 * @param {(msg: string) => void} deps.showToast
 */
export function createDataActions(deps) {
  const {
    getCurrentMandara,
    getCurrentUserId,
    getAllMandaras,
    getMandaraOrder,
    clearPendingSave,
    captureUiIntoBoard,
    persistBoard,
    loadAllMandaras,
    loadMandaraOrder,
    loadFirstOrCreateNew,
    loadMandaraIntoUI,
    rerenderList,
    showToast,
  } = deps;

  async function deleteCurrentMandara() {
    const currentMandara = getCurrentMandara();
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
      await Storage.deleteMandara(getCurrentUserId(), currentMandara.id);
      console.log("[SUCCESS] Deleted mandara:", currentMandara.id);
      showToast("削除しました");

      await loadAllMandaras();
      await loadMandaraOrder();
      await loadFirstOrCreateNew();
    } catch (error) {
      console.error("[ERROR] Failed to delete mandara:", error);
      alert("削除に失敗しました");
    }
  }

  // Delete mandara by ID (for list view)
  async function deleteMandara(mandaraId) {
    const mandara = getAllMandaras().find((m) => m.id === mandaraId);
    if (!mandara) return;

    if (!confirm(`「${mandara.title || "無題"}」を削除しますか？`)) return;

    try {
      await Storage.deleteMandara(getCurrentUserId(), mandaraId);
      showToast("削除しました");
      await loadAllMandaras();
      await loadMandaraOrder();
      rerenderList();
      const currentMandara = getCurrentMandara();
      if (currentMandara && currentMandara.id === mandaraId) {
        await loadFirstOrCreateNew();
      }
    } catch (error) {
      console.error("[ERROR] Failed to delete mandara:", error);
      alert("削除に失敗しました");
    }
  }

  async function deleteMandaras(mandaraIds) {
    if (mandaraIds.length === 0) return;

    if (!confirm(`${mandaraIds.length}件のマンダラを削除しますか？`)) return;

    try {
      await Storage.deleteMandaras(getCurrentUserId(), mandaraIds);
      showToast(`${mandaraIds.length}件削除しました`);
      await loadAllMandaras();
      await loadMandaraOrder();
      rerenderList();
      const currentMandara = getCurrentMandara();
      if (currentMandara && mandaraIds.includes(currentMandara.id)) {
        await loadFirstOrCreateNew();
      }
    } catch (error) {
      console.error("[ERROR] Failed to delete mandaras:", error);
      alert("削除に失敗しました");
    }
  }

  async function deleteAllMandaras() {
    const allMandaras = getAllMandaras();
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

  async function exportAllToJson() {
    try {
      await loadAllMandaras();
      await loadMandaraOrder();

      const allMandaras = getAllMandaras();
      if (allMandaras.length === 0) {
        alert("エクスポートするマンダラがありません");
        return;
      }

      const json = exportMandarasToJson(allMandaras, getMandaraOrder());
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

  // 現在のマンダラ(ツリー全体)をMarkdownとしてダウンロードする
  function exportCurrentBoardAsMarkdown() {
    const currentMandara = getCurrentMandara();
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
    clearPendingSave();
    if (getCurrentMandara()) {
      captureUiIntoBoard();
      await persistBoard();
    }
    await Storage.saveMandara(getCurrentUserId(), board);
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
      getAllMandaras(),
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
          (skipped.length > 0
            ? `\n(${skipped.length}件は既存の方が新しいためスキップ)`
            : "")
      )
    ) {
      return;
    }

    try {
      for (const mandara of merged) {
        if (changedIds.has(mandara.id)) {
          await Storage.saveMandara(getCurrentUserId(), mandara);
        }
      }

      // 再読込 (loadMandaraOrder が新規IDを順序に取り込む)
      await loadAllMandaras();
      await loadMandaraOrder();
      rerenderList();
      const currentMandara = getCurrentMandara();
      if (
        !currentMandara ||
        !getAllMandaras().some((m) => m.id === currentMandara.id)
      ) {
        await loadFirstOrCreateNew();
      }

      showToast(
        `インポート完了: 追加${added.length}件 / 更新${updated.length}件`
      );
    } catch (error) {
      console.error("[ERROR] Failed to import mandaras:", error);
      alert("インポートに失敗しました");
    }
  }

  return {
    deleteCurrentMandara,
    deleteMandara,
    deleteMandaras,
    deleteAllMandaras,
    exportAllToJson,
    exportCurrentBoardAsMarkdown,
    handleImportedBoard,
    importFromJsonFile,
  };
}

/**
 * 削除/バックアップ関連ボタンのイベント配線。
 * @param {ReturnType<typeof createDataActions>} actions
 */
export function wireDataActionButtons(actions) {
  // Delete mandara button
  const deleteBtn = document.getElementById("delete-mandara-btn");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", actions.deleteCurrentMandara);
    console.log("[INFO] Delete button listener attached");
  } else {
    console.warn("[WARN] Delete button not found");
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
      await actions.deleteMandaras(ids);
    });
  }

  // Delete all button
  const deleteAllBtn = document.getElementById("delete-all-btn");
  if (deleteAllBtn) {
    deleteAllBtn.addEventListener("click", actions.deleteAllMandaras);
  }

  // Export JSON button
  const exportJsonBtn = document.getElementById("export-json-btn");
  if (exportJsonBtn) {
    exportJsonBtn.addEventListener("click", actions.exportAllToJson);
  }

  // Export current board as Markdown
  const exportMdBtn = document.getElementById("export-md-btn");
  if (exportMdBtn) {
    exportMdBtn.addEventListener("click", actions.exportCurrentBoardAsMarkdown);
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
        await actions.importFromJsonFile(file);
      }
    });
  }
}
