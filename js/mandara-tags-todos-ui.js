// MANDARA Tags & Todos UI module
//
// タグ/TODO の描画 + 追加・編集・削除・並び替えロジックをまとめる。
// context オブジェクト経由で現在のマンダラ取得と保存を注入する。

import {
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
import { isImeComposing } from "./utils/keyboard.js";

/**
 * context: {
 *   getCurrentMandara: () => Mandara | null,
 *   saveCurrentMandara: () => Promise<void>,
 * }
 */
export function createTagsTodosUI(context) {
  // --- Tags ---

  function renderTags() {
    const container = document.getElementById("tags-container");
    const currentMandara = context.getCurrentMandara();
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

  function addTag(tag) {
    const currentMandara = context.getCurrentMandara();
    if (addTagLogic(currentMandara, tag)) {
      renderTags();
      context.saveCurrentMandara();
    }
  }

  function editTag(index) {
    const currentMandara = context.getCurrentMandara();
    if (!currentMandara || !currentMandara.tags) return;
    const oldTag = currentMandara.tags[index];
    const newTag = prompt("タグを編集:", oldTag);
    try {
      if (editTagLogic(currentMandara, index, newTag)) {
        renderTags();
        context.saveCurrentMandara();
      } else if (newTag !== null && newTag.trim() === "") {
        if (confirm("タグを削除しますか？")) removeTag(oldTag);
      }
    } catch (e) {
      if (e.message === "DUPLICATE_TAG") alert("そのタグは既に存在します");
      else console.error(e);
    }
  }

  function removeTag(tag) {
    const currentMandara = context.getCurrentMandara();
    if (removeTagLogic(currentMandara, tag)) {
      renderTags();
      context.saveCurrentMandara();
    }
  }

  // --- Todos ---

  function renderTodos() {
    const container = document.getElementById("todos-container");
    const currentMandara = context.getCurrentMandara();
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
        <input type="checkbox" class="todo-checkbox" data-id="${todo.id}" ${todo.completed ? "checked" : ""}>
        <span class="todo-text ${todo.completed ? "completed" : ""}" data-id="${todo.id}" title="Click to edit">${todo.text}</span>
        <button type="button" class="todo-remove" data-id="${todo.id}">×</button>
      `;
      container.appendChild(todoEl);
    });

    setupTodoDragAndDrop(container, {
      onReorder: (fromIndex, toIndex) => {
        if (reorderTodoLogic(context.getCurrentMandara(), fromIndex, toIndex)) {
          renderTodos();
          context.saveCurrentMandara();
        }
      },
    });
  }

  function addTodo(text) {
    const currentMandara = context.getCurrentMandara();
    const todo = addTodoLogic(currentMandara, text);
    if (todo) {
      renderTodos();
      context.saveCurrentMandara();
    }
  }

  function editTodo(id) {
    const currentMandara = context.getCurrentMandara();
    if (!currentMandara || !currentMandara.todos) return;
    const todo = currentMandara.todos.find((t) => t.id === id);
    if (!todo) return;
    const newText = prompt("TODOを編集:", todo.text);
    if (editTodoLogic(currentMandara, id, newText)) {
      renderTodos();
      context.saveCurrentMandara();
    } else if (newText !== null && newText.trim() === "") {
      if (confirm("TODOを削除しますか？")) removeTodo(id);
    }
  }

  function toggleTodo(id) {
    if (toggleTodoLogic(context.getCurrentMandara(), id)) {
      renderTodos();
      context.saveCurrentMandara();
    }
  }

  function removeTodo(id) {
    if (removeTodoLogic(context.getCurrentMandara(), id)) {
      renderTodos();
      context.saveCurrentMandara();
    }
  }

  // タグ/TODO入力欄・コンテナへのイベント配線 (IME対応込み)。
  // mandara.js のファイルサイズ上限(CI: 1000行)対応として、
  // setupEventListeners から移設した。
  function wireEvents() {
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

    const tagsContainer = document.getElementById("tags-container");
    if (tagsContainer) {
      tagsContainer.addEventListener("click", (e) => {
        if (e.target.classList.contains("tag-remove")) {
          console.log("[INFO] Tag remove button clicked:", e.target.dataset.tag);
          removeTag(e.target.dataset.tag);
        } else if (e.target.classList.contains("tag-text")) {
          console.log("[INFO] Tag text clicked for edit");
          editTag(parseInt(e.target.dataset.index));
        }
      });
      console.log("[INFO] Tags container listener attached");
    } else {
      console.warn("[WARN] Tags container not found");
    }

    const todoInput = document.getElementById("todo-input");
    if (todoInput) {
      todoInput.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        if (isImeComposing(e)) return;
        e.preventDefault();
        addTodo(todoInput.value);
        todoInput.value = "";
      });
    }

    const todosContainer = document.getElementById("todos-container");
    if (todosContainer) {
      todosContainer.addEventListener("click", (e) => {
        if (e.target.classList.contains("todo-remove")) {
          console.log("[INFO] Todo remove button clicked");
          removeTodo(e.target.dataset.id);
        } else if (e.target.classList.contains("todo-text")) {
          console.log("[INFO] Todo text clicked for edit");
          editTodo(e.target.dataset.id);
        }
      });

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
  }

  return {
    renderTags,
    addTag,
    editTag,
    removeTag,
    renderTodos,
    addTodo,
    editTodo,
    toggleTodo,
    removeTodo,
    wireEvents,
  };
}
