/**
 * Mandara List View Module
 * Handles list view rendering and interactions
 */

import {
  setupMandaraListDragAndDrop,
  disableMandaraListDragAndDrop,
} from "./mandara-list-drag.js";

/**
 * Render mandara list with filtering and sorting
 * @param {Object} context - Context object with state and callbacks
 * @param {Array} context.allMandaras - All mandara items
 * @param {Array} context.mandaraOrder - Custom order array
 * @param {Function} context.formatDate - Date formatting function
 * @param {Function} context.loadMandaraIntoUI - Load mandara callback
 * @param {Function} context.closeListView - Close list view callback
 * @param {Function} context.deleteMandara - Delete mandara callback
 * @param {Function} context.reorderMandara - Reorder mandara callback
 * @param {Function} context.showToast - Show toast callback
 * @param {string} filter - Filter text
 * @param {string} sortBy - Sort mode
 */
export function renderMandaraList(context, filter = "", sortBy = "custom") {
  const {
    allMandaras,
    mandaraOrder,
    formatDate,
    loadMandaraIntoUI,
    closeListView,
    deleteMandara,
    reorderMandara,
    showToast,
  } = context;

  const listContainer = document.getElementById("mandara-list");
  if (!listContainer) return;

  const isCustomSort = sortBy === "custom";
  const hasFilter = filter && filter.trim().length > 0;

  // Filter
  let filtered = allMandaras;
  if (hasFilter) {
    const lowerFilter = filter.toLowerCase();
    filtered = allMandaras.filter((m) => {
      const title = (m.title || "").toLowerCase();
      const memo = (m.memo || "").toLowerCase();
      const cells = Object.values(m.cells || {})
        .join(" ")
        .toLowerCase();
      const tags = (m.tags || []).join(" ").toLowerCase();
      return (
        title.includes(lowerFilter) ||
        memo.includes(lowerFilter) ||
        cells.includes(lowerFilter) ||
        tags.includes(lowerFilter)
      );
    });
  }

  // Sort
  if (isCustomSort && !hasFilter) {
    // Use custom order
    const orderMap = new Map(mandaraOrder.map((id, index) => [id, index]));
    filtered.sort((a, b) => {
      const indexA = orderMap.has(a.id) ? orderMap.get(a.id) : Infinity;
      const indexB = orderMap.has(b.id) ? orderMap.get(b.id) : Infinity;
      return indexA - indexB;
    });
  } else {
    // Use standard sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "updated-desc":
          return new Date(b.updatedAt) - new Date(a.updatedAt);
        case "updated-asc":
          return new Date(a.updatedAt) - new Date(b.updatedAt);
        case "created-desc":
          return new Date(b.createdAt) - new Date(a.createdAt);
        case "created-asc":
          return new Date(a.createdAt) - new Date(b.createdAt);
        case "title-asc":
          return (a.title || "").localeCompare(b.title || "");
        case "title-desc":
          return (b.title || "").localeCompare(a.title || "");
        case "custom":
          // When filtering with custom sort, fall back to updated-desc
          return new Date(b.updatedAt) - new Date(a.updatedAt);
        default:
          return 0;
      }
    });
  }

  // Render
  listContainer.innerHTML = "";
  if (filtered.length === 0) {
    listContainer.innerHTML =
      '<p class="empty-message">マンダラが見つかりません</p>';
    return;
  }

  // Add/remove draggable class to list container
  if (isCustomSort && !hasFilter) {
    listContainer.classList.add("draggable-list");
  } else {
    listContainer.classList.remove("draggable-list");
  }

  filtered.forEach((mandara) => {
    const card = document.createElement("div");
    card.className = "mandara-card";
    card.dataset.id = mandara.id;

    const tagsHtml = (mandara.tags || [])
      .map((tag) => `<span class="tag">${tag}</span>`)
      .join("");
    const centerText =
      mandara.cells && mandara.cells[5] ? mandara.cells[5] : "中心未設定";

    // Add drag handle for custom sort mode
    const dragHandleHtml =
      isCustomSort && !hasFilter
        ? '<span class="card-drag-handle" title="ドラッグして並び替え">☰</span>'
        : "";

    card.innerHTML = `
      <div class="card-header">
        ${dragHandleHtml}
        <input type="checkbox" class="card-checkbox" data-id="${
          mandara.id
        }" aria-label="Select ${mandara.title || "無題"}">
        <h3 class="card-title">${mandara.title || "無題"}</h3>
        <button type="button" class="card-delete-btn" data-id="${
          mandara.id
        }" aria-label="Delete ${mandara.title || "無題"}">×</button>
      </div>
      <p class="card-center">中心: ${centerText}</p>
      <div class="card-tags">${tagsHtml}</div>
      <div class="card-meta">
        <span>作成: ${formatDate(mandara.createdAt)}</span>
        <span>更新: ${formatDate(mandara.updatedAt)}</span>
      </div>
    `;

    // Click on card (but not checkbox, delete button, or drag handle) to open
    card.addEventListener("click", (e) => {
      if (
        !e.target.classList.contains("card-checkbox") &&
        !e.target.classList.contains("card-delete-btn") &&
        !e.target.classList.contains("card-drag-handle")
      ) {
        loadMandaraIntoUI(mandara);
        closeListView();
      }
    });

    // Delete button handler
    const deleteBtn = card.querySelector(".card-delete-btn");
    deleteBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await deleteMandara(mandara.id);
    });

    listContainer.appendChild(card);
  });

  // Setup or disable drag and drop based on sort mode
  if (isCustomSort && !hasFilter) {
    setupMandaraListDragAndDrop(listContainer, {
      onReorder: (fromIndex, toIndex) => {
        reorderMandara(fromIndex, toIndex);
        // Re-render to update visual state
        const sortSelect = document.getElementById("sort-select");
        const filterInput = document.getElementById("filter-input");
        renderMandaraList(
          context,
          filterInput ? filterInput.value : "",
          sortSelect ? sortSelect.value : "custom"
        );
        showToast("並び順を保存しました");
      },
    });
  } else {
    disableMandaraListDragAndDrop(listContainer);
  }
}

/**
 * Show list view
 * @param {Function} renderCallback - Callback to render the list
 */
export function showListView(renderCallback) {
  document.getElementById("list-view").classList.remove("is-hidden");
  document.getElementById("mandara-editor").style.display = "none";
  renderCallback();
}

/**
 * Close list view
 */
export function closeListView() {
  document.getElementById("list-view").classList.add("is-hidden");
  document.getElementById("mandara-editor").style.display = "block";
}
