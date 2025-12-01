// Mandara Page - Main Logic
import {
  getStorageMode,
  isLocalMode,
  isOnlineMode,
  Storage,
} from "./storage-service.js";
import { TIMINGS } from "./constants.js";
import {
  generateId,
  createNewMandara as createMandaraLogic,
  addTag as addTagLogic,
  editTag as editTagLogic,
  removeTag as removeTagLogic,
  addTodo as addTodoLogic,
  editTodo as editTodoLogic,
  toggleTodo as toggleTodoLogic,
  removeTodo as removeTodoLogic,
  reorderTodo as reorderTodoLogic,
} from "./mandara-logic.js";
import { setupTodoDragAndDrop } from "./todo-drag.js";

// Current state
let currentUserId = null;
let currentMandara = null;
let allMandaras = [];
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

// Create new mandara
function createNewMandara() {
  return createMandaraLogic();
}

// Load mandara into UI
function loadMandaraIntoUI(mandara) {
  currentMandara = mandara;

  // Title
  document.getElementById("mandara-title").value = mandara.title || "";

  // Cells
  for (let i = 1; i <= 9; i++) {
    const cell = document.getElementById(`cell-${i}`);
    if (cell) {
      cell.value = mandara.cells[i] || "";
    }
  }

  // Memo
  document.getElementById("mandara-memo").value = mandara.memo || "";

  // Dates
  document.getElementById("created-date").textContent = `作成: ${formatDate(
    mandara.createdAt
  )}`;
  document.getElementById("updated-date").textContent = `更新: ${formatDate(
    mandara.updatedAt
  )}`;

  // Tags
  renderTags();

  // TODOs
  renderTodos();

  // Update URL with current mandara ID
  const newUrl = new URL(window.location);
  newUrl.searchParams.set("id", mandara.id);
  window.history.replaceState({}, "", newUrl);
}

// Save current mandara
async function saveCurrentMandara() {
  if (!currentMandara) return;

  try {
    // Update mandara with current UI values
    currentMandara.title = document.getElementById("mandara-title").value;
    currentMandara.memo = document.getElementById("mandara-memo").value;

    for (let i = 1; i <= 9; i++) {
      const cell = document.getElementById(`cell-${i}`);
      if (cell) {
        currentMandara.cells[i] = cell.value;
      }
    }

    currentMandara.updatedAt = new Date().toISOString();

    // Save entire mandara object (includes tags, todos, cells, memo, etc.)
    await Storage.saveMandara(currentUserId, currentMandara);

    // Update updated date display
    document.getElementById("updated-date").textContent = `更新: ${formatDate(
      currentMandara.updatedAt
    )}`;

    console.log("[INFO] Saved mandara:", {
      id: currentMandara.id,
      title: currentMandara.title,
      tags: currentMandara.tags?.length || 0,
      todos: currentMandara.todos?.length || 0,
    });

    showAutoSaveMessage();
  } catch (error) {
    console.error("[ERROR] Failed to save mandara:", error);
    alert("保存に失敗しました");
  }
}

// Debounced save
function debouncedSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveCurrentMandara();
  }, TIMINGS.DEBOUNCE_DELAY);
}

// Render tags
function renderTags() {
  const container = document.getElementById("tags-container");
  if (!container || !currentMandara) return;

  container.innerHTML = "";
  (currentMandara.tags || []).forEach((tag, index) => {
    const tagEl = document.createElement("span");
    tagEl.className = "tag";

    const tagText = document.createElement("span");
    tagText.className = "tag-text";
    tagText.textContent = tag;
    tagText.dataset.index = index;
    tagText.title = "Click to edit";
    tagEl.appendChild(tagText);

    const removeBtn = document.createElement("button");
    removeBtn.className = "tag-remove";
    removeBtn.dataset.tag = tag;
    removeBtn.textContent = "×";
    removeBtn.setAttribute("type", "button");
    removeBtn.setAttribute("aria-label", `Remove tag ${tag}`);

    tagEl.appendChild(removeBtn);
    container.appendChild(tagEl);
  });

}

// Add tag
function addTag(tag) {
  if (addTagLogic(currentMandara, tag)) {
    renderTags();
    saveCurrentMandara();
  }
}

// Edit tag
function editTag(index) {
  if (!currentMandara || !currentMandara.tags) return;
  const oldTag = currentMandara.tags[index];
  const newTag = prompt("タグを編集:", oldTag);
  try {
    if (editTagLogic(currentMandara, index, newTag)) {
      renderTags();
      saveCurrentMandara();
    } else if (newTag !== null && newTag.trim() === "") {
      if (confirm("タグを削除しますか？")) removeTag(oldTag);
    }
  } catch (e) {
    if (e.message === "DUPLICATE_TAG") alert("そのタグは既に存在します");
    else console.error(e);
  }
}

// Remove tag
function removeTag(tag) {
  if (removeTagLogic(currentMandara, tag)) {
    renderTags();
    saveCurrentMandara();
  }
}

// Render todos
function renderTodos() {
  const container = document.getElementById("todos-container");
  if (!container || !currentMandara) return;

  container.innerHTML = "";
  (currentMandara.todos || []).forEach((todo, index) => {
    const todoEl = document.createElement("div");
    todoEl.className = "todo-item";
    todoEl.draggable = true;
    todoEl.dataset.index = index;
    todoEl.dataset.id = todo.id;
    todoEl.innerHTML = `
      <span class="todo-drag-handle" title="ドラッグして並び替え">☰</span>
      <input type="checkbox" class="todo-checkbox" data-id="${todo.id}" ${
      todo.completed ? "checked" : ""
    }>
      <span class="todo-text ${todo.completed ? "completed" : ""}" data-id="${
      todo.id
    }" title="Click to edit">${todo.text}</span>
      <button type="button" class="todo-remove" data-id="${todo.id}">×</button>
    `;
    container.appendChild(todoEl);
  });

  // Setup drag and drop after rendering
  setupTodoDragAndDrop(container, {
    onReorder: (fromIndex, toIndex) => {
      if (reorderTodoLogic(currentMandara, fromIndex, toIndex)) {
        console.log("[INFO] Todo reordered:", fromIndex, "->", toIndex);
        renderTodos();
        saveCurrentMandara();
      }
    },
  });

  console.log("[INFO] Rendered todos:", currentMandara.todos?.length || 0);
}

// Add todo
function addTodo(text) {
  const todo = addTodoLogic(currentMandara, text);
  if (todo) {
    console.log("[INFO] Todo added:", todo);
    renderTodos();
    saveCurrentMandara();
  } else {
    console.log("[INFO] Todo not added (empty)");
  }
}

// Edit todo
function editTodo(id) {
  if (!currentMandara || !currentMandara.todos) return;

  const todo = currentMandara.todos.find((t) => t.id === id);
  if (todo) {
    const newText = prompt("TODOを編集:", todo.text);

    if (editTodoLogic(currentMandara, id, newText)) {
      console.log("[INFO] Todo edited:", id);
      renderTodos();
      saveCurrentMandara();
    } else if (newText !== null && newText.trim() === "") {
      // Logic module returns false for empty, handle delete confirmation here
      if (confirm("TODOを削除しますか？")) {
        removeTodo(id);
      }
    }
  }
}

// Toggle todo
function toggleTodo(id) {
  if (toggleTodoLogic(currentMandara, id)) {
    console.log("[INFO] Todo toggled:", id);
    renderTodos();
    saveCurrentMandara();
  } else {
    console.warn("[WARN] Todo not found:", id);
  }
}

// Remove todo
function removeTodo(id) {
  if (removeTodoLogic(currentMandara, id)) {
    console.log("[INFO] Todo removed:", id);
    renderTodos();
    saveCurrentMandara();
  } else {
    console.log("[WARN] Cannot remove todo");
  }
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

    // Load all mandaras and show first one or create new
    await loadAllMandaras();
    if (allMandaras.length > 0) {
      loadMandaraIntoUI(allMandaras[0]);
    } else {
      const newMandara = createNewMandara();
      await Storage.saveMandara(currentUserId, newMandara);
      allMandaras = [newMandara];
      loadMandaraIntoUI(newMandara);
    }
  } catch (error) {
    console.error("[ERROR] Failed to delete mandara:", error);
    alert("削除に失敗しました");
  }
}

// Delete mandara by ID (for list view)
async function deleteMandara(mandaraId) {
  const mandara = allMandaras.find((m) => m.id === mandaraId);
  if (!mandara) {
    console.warn("[WARN] Mandara not found:", mandaraId);
    return;
  }

  if (!confirm(`「${mandara.title || "無題"}」を削除しますか？`)) {
    console.log("[INFO] Delete cancelled by user");
    return;
  }

  try {
    await Storage.deleteMandara(currentUserId, mandaraId);
    console.log("[SUCCESS] Deleted mandara:", mandaraId);
    showToast("削除しました");

    // Reload list
    await loadAllMandaras();
    renderMandaraList();

    // If deleted mandara was current one, load another or create new
    if (currentMandara && currentMandara.id === mandaraId) {
      if (allMandaras.length > 0) {
        loadMandaraIntoUI(allMandaras[0]);
      } else {
        const newMandara = createNewMandara();
        await Storage.saveMandara(currentUserId, newMandara);
        allMandaras = [newMandara];
        loadMandaraIntoUI(newMandara);
      }
    }
  } catch (error) {
    console.error("[ERROR] Failed to delete mandara:", error);
    alert("削除に失敗しました");
  }
}

// Delete multiple mandaras by IDs
async function deleteMandaras(mandaraIds) {
  if (mandaraIds.length === 0) return;

  const count = mandaraIds.length;
  if (!confirm(`${count}件のマンダラを削除しますか？`)) {
    console.log("[INFO] Batch delete cancelled by user");
    return;
  }

  try {
    // Use batch delete if available, otherwise delete sequentially
    await Storage.deleteMandaras(currentUserId, mandaraIds);

    console.log(`[SUCCESS] Deleted ${count} mandaras`);
    showToast(`${count}件削除しました`);

    // Reload list
    await loadAllMandaras();
    renderMandaraList();

    // If current mandara was deleted, load another or create new
    if (currentMandara && mandaraIds.includes(currentMandara.id)) {
      if (allMandaras.length > 0) {
        loadMandaraIntoUI(allMandaras[0]);
      } else {
        const newMandara = createNewMandara();
        await Storage.saveMandara(currentUserId, newMandara);
        allMandaras = [newMandara];
        loadMandaraIntoUI(newMandara);
      }
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

// Render mandara list
function renderMandaraList(filter = "", sortBy = "updated-desc") {
  const listContainer = document.getElementById("mandara-list");
  if (!listContainer) return;

  // Filter
  let filtered = allMandaras;
  if (filter) {
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
      default:
        return 0;
    }
  });

  // Render
  listContainer.innerHTML = "";
  if (filtered.length === 0) {
    listContainer.innerHTML =
      '<p class="empty-message">マンダラが見つかりません</p>';
    return;
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

    card.innerHTML = `
      <div class="card-header">
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

    // Click on card (but not checkbox or delete button) to open
    card.addEventListener("click", (e) => {
      if (
        !e.target.classList.contains("card-checkbox") &&
        !e.target.classList.contains("card-delete-btn")
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
}

// Show list view
function showListView() {
  document.getElementById("list-view").classList.remove("is-hidden");
  document.getElementById("mandara-editor").style.display = "none";
  renderMandaraList();
}

// Close list view
function closeListView() {
  document.getElementById("list-view").classList.add("is-hidden");
  document.getElementById("mandara-editor").style.display = "block";
}

// Setup event listeners
function setupEventListeners() {
  // Title input
  const titleInput = document.getElementById("mandara-title");
  if (titleInput) {
    titleInput.addEventListener("input", debouncedSave);
  }

  // Cell inputs
  for (let i = 1; i <= 9; i++) {
    const cell = document.getElementById(`cell-${i}`);
    if (cell) {
      cell.addEventListener("input", debouncedSave);
    }
  }

  // Memo input
  const memoInput = document.getElementById("mandara-memo");
  if (memoInput) {
    memoInput.addEventListener("input", debouncedSave);
  }

  // Tag input with IME support
  const tagInput = document.getElementById("tag-input");
  if (tagInput) {
    let isComposingTag = false;

    tagInput.addEventListener("compositionstart", () => {
      isComposingTag = true;
    });

    tagInput.addEventListener("compositionend", () => {
      isComposingTag = false;
    });

    tagInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !isComposingTag) {
        e.preventDefault();
        addTag(tagInput.value);
        tagInput.value = "";
      }
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
    let isComposingTodo = false;

    todoInput.addEventListener("compositionstart", () => {
      isComposingTodo = true;
    });

    todoInput.addEventListener("compositionend", () => {
      isComposingTodo = false;
    });

    todoInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !isComposingTodo) {
        e.preventDefault();
        addTodo(todoInput.value);
        todoInput.value = "";
      }
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
      loadMandaraIntoUI(newMandara); // This will update URL automatically
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

// Initialize app logic
async function initializeApp() {
  // Load all mandaras
  await loadAllMandaras();

  // Check URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const mandaraId = urlParams.get("id");

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
      }
    }

    if (mandara) {
      loadMandaraIntoUI(mandara);
      console.log("[INFO] Loaded mandara from URL:", mandaraId);
    } else {
      // Mandara not found, load most recent or create new
      if (allMandaras.length > 0) {
        loadMandaraIntoUI(allMandaras[0]);
      } else {
        const firstMandara = createNewMandara();
        await Storage.saveMandara(currentUserId, firstMandara);
        allMandaras = [firstMandara];
        loadMandaraIntoUI(firstMandara);
      }
    }
  } else if (allMandaras.length > 0) {
    // Load most recent mandara
    loadMandaraIntoUI(allMandaras[0]);
  } else {
    // Create first mandara
    const firstMandara = createNewMandara();
    await Storage.saveMandara(currentUserId, firstMandara);
    allMandaras = [firstMandara];
    loadMandaraIntoUI(firstMandara);
  }

  // Setup event listeners
  setupEventListeners();

  console.log("[INFO] Mandara app initialized");
}
