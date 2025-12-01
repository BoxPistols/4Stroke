/**
 * Todo Drag and Drop Module
 * Handles drag and drop functionality for todo items
 */

/**
 * Setup drag and drop for todo items
 * @param {HTMLElement} container - The todos container element
 * @param {Object} callbacks - Callback functions
 * @param {Function} callbacks.onReorder - Called with (fromIndex, toIndex) when reorder occurs
 */
export function setupTodoDragAndDrop(container, callbacks) {
  let draggedItem = null;
  let draggedIndex = -1;

  const { onReorder } = callbacks;

  container.querySelectorAll(".todo-item").forEach((item) => {
    // Mouse drag events (desktop)
    item.addEventListener("dragstart", (e) => {
      draggedItem = item;
      draggedIndex = parseInt(item.dataset.index);
      item.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", item.dataset.index);
    });

    item.addEventListener("dragend", () => {
      item.classList.remove("dragging");
      draggedItem = null;
      draggedIndex = -1;
    });

    item.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (draggedItem && draggedItem !== item) {
        item.classList.add("drag-over");
      }
    });

    item.addEventListener("dragleave", () => {
      item.classList.remove("drag-over");
    });

    item.addEventListener("drop", (e) => {
      e.preventDefault();
      item.classList.remove("drag-over");

      if (draggedItem && draggedItem !== item) {
        const fromIndex = draggedIndex;
        const toIndex = parseInt(item.dataset.index);
        onReorder(fromIndex, toIndex);
      }
      draggedItem = null;
      draggedIndex = -1;
    });

    // Touch events (mobile)
    item.addEventListener("touchstart", (e) => {
      draggedItem = item;
      draggedIndex = parseInt(item.dataset.index);
      item.classList.add("dragging");
    });

    item.addEventListener("touchmove", (e) => {
      if (!draggedItem) return;

      const touch = e.touches[0];
      const elementAtPoint = document.elementFromPoint(
        touch.clientX,
        touch.clientY
      );
      const targetItem = elementAtPoint?.closest(".todo-item");

      container.querySelectorAll(".todo-item").forEach((i) => {
        i.classList.remove("drag-over");
      });

      if (targetItem && targetItem !== draggedItem) {
        targetItem.classList.add("drag-over");
      }

      e.preventDefault();
    });

    item.addEventListener("touchend", (e) => {
      if (!draggedItem) return;

      const touch = e.changedTouches[0];
      const elementAtPoint = document.elementFromPoint(
        touch.clientX,
        touch.clientY
      );
      const targetItem = elementAtPoint?.closest(".todo-item");

      container.querySelectorAll(".todo-item").forEach((i) => {
        i.classList.remove("drag-over");
      });

      if (targetItem && targetItem !== draggedItem) {
        const fromIndex = draggedIndex;
        const toIndex = parseInt(targetItem.dataset.index);
        onReorder(fromIndex, toIndex);
      }

      draggedItem.classList.remove("dragging");
      draggedItem = null;
      draggedIndex = -1;
    });
  });
}
