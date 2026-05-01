// Mandara View Preferences - 文字サイズ切替 / サイドバー折りたたみ
//
// MANDARA エディタの「1 マスが小さくて入りきらない」体験を改善するための
// ビュー設定。body 属性 + CSS 変数で表示を切り替え、設定は localStorage に
// 永続化する。サイドバー幅を司る sidebar-size.js とは独立したモジュール。

const FONT_SIZE_KEY = "mandara_cell_font_size";
const FONT_SIZES = ["small", "medium", "large"];
const DEFAULT_FONT_SIZE = "medium";

const COLLAPSED_KEY = "mandara_sidebar_collapsed";

function readFontSize() {
  try {
    const v = localStorage.getItem(FONT_SIZE_KEY);
    return FONT_SIZES.includes(v) ? v : DEFAULT_FONT_SIZE;
  } catch {
    return DEFAULT_FONT_SIZE;
  }
}

function writeFontSize(size) {
  try {
    localStorage.setItem(FONT_SIZE_KEY, size);
  } catch {}
}

function applyFontSize(size) {
  document.body.setAttribute("data-cell-font-size", size);
  document.querySelectorAll(".font-size-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.size === size);
  });
}

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

function writeCollapsed(collapsed) {
  try {
    localStorage.setItem(COLLAPSED_KEY, collapsed ? "true" : "false");
  } catch {}
}

function applyCollapsed(collapsed) {
  document.body.setAttribute("data-sidebar-collapsed", collapsed ? "true" : "false");
  const btn = document.getElementById("sidebar-collapse-btn");
  if (btn) {
    btn.setAttribute("aria-pressed", collapsed ? "true" : "false");
    btn.title = collapsed ? "サイドバーを表示" : "サイドバーを折りたたむ";
    // 折りたたみ中は逆向きのアイコン (展開を示す) に切替
    btn.textContent = collapsed ? "⇤" : "⇥";
  }
}

/**
 * 初期化: 保存値の復元 + ボタンへのハンドラ紐付け
 */
export function initMandaraViewPrefs() {
  // Font size
  applyFontSize(readFontSize());
  document.querySelectorAll(".font-size-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const size = btn.dataset.size;
      if (!FONT_SIZES.includes(size)) return;
      applyFontSize(size);
      writeFontSize(size);
    });
  });

  // Sidebar collapse
  applyCollapsed(readCollapsed());
  const collapseBtn = document.getElementById("sidebar-collapse-btn");
  if (collapseBtn) {
    collapseBtn.addEventListener("click", () => {
      const next = !readCollapsed();
      applyCollapsed(next);
      writeCollapsed(next);
    });
  }
}
