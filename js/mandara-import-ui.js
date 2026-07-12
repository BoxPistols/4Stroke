/**
 * Mandara Import UI Module
 * Markdown取り込みモーダルの制御。2つの分類経路を提供する:
 *   - 見出しで分類 (ローカル・決定的・キー不要)
 *   - AIで分類 (中枢判定+グルーピング、キーがある場合のみ)
 * どちらも「プレビュー → ユーザー確定」を経てから Board を生成する
 * (AIの出力を直接データに書かない — MANDARA_EVOLUTION_PLAN.md §4.2)。
 */

import { parseMarkdownToDraft, draftToBoard } from "./board-md.js";
import { classifyTextWithAI, isAIAvailable } from "./mandara-import-ai.js";

// 病的に巨大な貼り付け/ファイルでプレビューのDOM生成が固まるのを防ぐ上限。
// board-md.js 内部の防御的切り詰め(300,000文字)より小さく設定し、
// ここで先に分かりやすいエラーとして弾く。
const MAX_IMPORT_CHARS = 200_000;
const MAX_PREVIEW_GROUPS = 50;
const MAX_PREVIEW_CHILDREN = 20;

/**
 * @param {Object} deps
 * @param {(board: Object) => Promise<void>} deps.onImported - 確定時に生成済みBoardを受け取る
 */
export function initImportUI({ onImported }) {
  const modal = document.getElementById("import-modal");
  const openBtn = document.getElementById("import-md-btn");
  const closeBtn = document.getElementById("import-modal-close");
  const cancelBtn = document.getElementById("import-cancel-btn");
  const textInput = document.getElementById("import-md-text");
  const fileInput = document.getElementById("import-md-file");
  const fileBtn = document.getElementById("import-md-file-btn");
  const parseBtn = document.getElementById("import-parse-btn");
  const aiBtn = document.getElementById("import-ai-btn");
  const preview = document.getElementById("import-preview");
  const statusEl = document.getElementById("import-status");
  const confirmBtn = document.getElementById("import-confirm-btn");

  if (!modal || !openBtn) return null;

  let pendingDraft = null;

  function setStatus(message, isError = false) {
    if (!statusEl) return;
    statusEl.textContent = message || "";
    statusEl.classList.toggle("is-error", isError);
  }

  function resetPreview() {
    pendingDraft = null;
    if (preview) preview.textContent = "";
    if (confirmBtn) confirmBtn.disabled = true;
  }

  function open() {
    resetPreview();
    setStatus("");
    if (textInput) textInput.value = "";
    // AI経路はキーがある場合のみ提示 (初回体験にキー入力の壁を作らない)
    if (aiBtn) aiBtn.hidden = !isAIAvailable();
    modal.classList.add("active");
    textInput?.focus();
  }

  function close() {
    modal.classList.remove("active");
    resetPreview();
  }

  // プレビュー描画: 中枢 + グループ + 子要素 + 溢れ分を確認できる形で表示
  function renderPreview(draft) {
    pendingDraft = draft;
    preview.textContent = "";

    const center = document.createElement("div");
    center.className = "import-preview-center";
    center.textContent = `中心: ${draft.center || "(未判定)"}`;
    preview.appendChild(center);

    if (draft.centerRationale) {
      const why = document.createElement("div");
      why.className = "import-preview-rationale";
      why.textContent = `根拠: ${draft.centerRationale}`;
      preview.appendChild(why);
    }

    const list = document.createElement("ul");
    list.className = "import-preview-groups";
    const groups = draft.groups || [];
    // DOM生成が固まらないよう表示件数に上限を設ける (実際の取り込みは
    // draftToBoard 側で別途 MAX_GROUPS=8 に収まるので機能上の影響はない)
    groups.slice(0, MAX_PREVIEW_GROUPS).forEach((group, i) => {
      const li = document.createElement("li");
      const label = document.createElement("strong");
      label.textContent = `${i + 1}. ${group.label || "(無題)"}`;
      li.appendChild(label);
      const children = group.children || [];
      if (children.length) {
        const sub = document.createElement("ul");
        children.slice(0, MAX_PREVIEW_CHILDREN).forEach((c) => {
          const cli = document.createElement("li");
          cli.textContent = c.label;
          sub.appendChild(cli);
        });
        if (children.length > MAX_PREVIEW_CHILDREN) {
          const more = document.createElement("li");
          more.textContent = `…ほか${children.length - MAX_PREVIEW_CHILDREN}件`;
          sub.appendChild(more);
        }
        li.appendChild(sub);
      }
      list.appendChild(li);
    });
    if (groups.length > MAX_PREVIEW_GROUPS) {
      const more = document.createElement("li");
      more.textContent = `…ほか${groups.length - MAX_PREVIEW_GROUPS}グループ`;
      list.appendChild(more);
    }
    preview.appendChild(list);

    if (draft.memo) {
      const memo = document.createElement("div");
      memo.className = "import-preview-memo";
      memo.textContent = `備考メモへ: ${draft.memo.split("\n").length}行`;
      preview.appendChild(memo);
    }

    const groupCount = (draft.groups || []).length;
    setStatus(
      groupCount === 0
        ? "グループが見つかりませんでした。中心と備考メモだけで取り込みます。"
        : `${groupCount}グループに分類しました。内容を確認して「取り込む」を押してください。` +
            (groupCount > 8 ? " (9件目以降は備考メモへ退避します)" : "")
    );
    confirmBtn.disabled = false;
  }

  function getSourceText() {
    const text = textInput?.value?.trim();
    if (!text) {
      setStatus("Markdownを貼り付けるか、ファイルを選択してください。", true);
      return null;
    }
    if (text.length > MAX_IMPORT_CHARS) {
      setStatus(
        `テキストが大きすぎます (${text.length.toLocaleString()}文字 / 上限${MAX_IMPORT_CHARS.toLocaleString()}文字)。分割して取り込んでください。`,
        true
      );
      return null;
    }
    return text;
  }

  // --- イベント配線 ---

  openBtn.addEventListener("click", open);
  closeBtn?.addEventListener("click", close);
  cancelBtn?.addEventListener("click", close);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });

  fileBtn?.addEventListener("click", () => fileInput?.click());
  fileInput?.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    if (!file) return;
    // textareaへ巨大な文字列を流し込むこと自体がハングの原因になるため、
    // 読み込む前にファイルサイズで弾く (文字数上限とほぼ等価な目安)
    if (file.size > MAX_IMPORT_CHARS * 2) {
      setStatus(
        `ファイルが大きすぎます (${Math.round(file.size / 1024).toLocaleString()}KB)。分割して取り込んでください。`,
        true
      );
      return;
    }
    textInput.value = await file.text();
    setStatus(`${file.name} を読み込みました。分類方法を選んでください。`);
  });

  parseBtn?.addEventListener("click", () => {
    const text = getSourceText();
    if (!text) return;
    renderPreview(parseMarkdownToDraft(text));
  });

  aiBtn?.addEventListener("click", async () => {
    const text = getSourceText();
    if (!text) return;
    aiBtn.disabled = true;
    setStatus("AIが中枢の判定とマス分類を行っています...");
    try {
      renderPreview(await classifyTextWithAI(text));
    } catch (error) {
      console.error("[ERROR] AI classification failed:", error);
      // 失敗時は直前の(見出し分類等による)確定可能な下書きを残さない。
      // エラーメッセージと一緒に「取り込む」が押せる状態のままだと、
      // ユーザーが意図せず古いプレビューを取り込んでしまう恐れがある。
      resetPreview();
      const message =
        error?.userMessage ||
        "AI分類に失敗しました。「見出しで分類」をお試しください。";
      setStatus(message, true);
    } finally {
      aiBtn.disabled = false;
    }
  });

  confirmBtn?.addEventListener("click", async () => {
    if (!pendingDraft) return;
    confirmBtn.disabled = true;
    try {
      const board = draftToBoard(pendingDraft);
      await onImported(board);
      close();
    } catch (error) {
      console.error("[ERROR] Import failed:", error);
      setStatus("取り込みに失敗しました。", true);
      confirmBtn.disabled = false;
    }
  });

  return { open, close };
}
