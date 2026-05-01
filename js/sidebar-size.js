// Sidebar Size - MANDARA エディタのサイドバー幅切替
//
// body に data-sidebar-size="narrow|medium|wide" 属性を付与して CSS で制御。
// 選択値は localStorage に永続化。

const STORAGE_KEY = "mandara_sidebar_size";
const SIZES = ["narrow", "medium", "wide"];
const DEFAULT_SIZE = "narrow";

function getSavedSize() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return SIZES.includes(v) ? v : DEFAULT_SIZE;
  } catch {
    return DEFAULT_SIZE;
  }
}

function saveSize(size) {
  try {
    localStorage.setItem(STORAGE_KEY, size);
  } catch {}
}

function applySize(size) {
  document.body.setAttribute("data-sidebar-size", size);
  // アクティブボタンの表示更新 (aria-pressed で a11y/CSS 双方を制御)
  document.querySelectorAll(".sidebar-size-btn").forEach((btn) => {
    btn.setAttribute("aria-pressed", btn.dataset.size === size ? "true" : "false");
  });
}

/**
 * 初期化: 保存された幅を復元し、ボタンにハンドラを紐付ける
 */
export function initSidebarSize() {
  const currentSize = getSavedSize();
  applySize(currentSize);

  document.querySelectorAll(".sidebar-size-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const size = btn.dataset.size;
      if (!SIZES.includes(size)) return;
      applySize(size);
      saveSize(size);
    });
  });
}
