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
  let currentDragOverItem = null; // Track current drag-over element for performance

  const { onReorder } = callbacks;

  // Helper: Reset drag state
  function resetDragState() {
    if (draggedItem) {
      draggedItem.classList.remove("dragging");
    }
    if (currentDragOverItem) {
      currentDragOverItem.classList.remove("drag-over");
    }
    draggedItem = null;
    draggedIndex = -1;
    currentDragOverItem = null;
  }

  // Helper: Set drag-over on target (removes from previous)
  function setDragOver(targetItem) {
    if (currentDragOverItem === targetItem) return;
    if (currentDragOverItem) {
      currentDragOverItem.classList.remove("drag-over");
    }
    currentDragOverItem = targetItem;
    if (targetItem) {
      targetItem.classList.add("drag-over");
    }
  }

  // Helper: Handle reorder when drop occurs
  function handleDrop(targetItem) {
    setDragOver(null);
    if (draggedItem && targetItem && targetItem !== draggedItem) {
      const fromIndex = draggedIndex;
      const toIndex = parseInt(targetItem.dataset.index);
      onReorder(fromIndex, toIndex);
    }
    resetDragState();
  }

  container.querySelectorAll(".todo-item").forEach((item) => {
    // Mouse drag events (desktop)
    item.addEventListener("dragstart", (e) => {
      draggedItem = item;
      draggedIndex = parseInt(item.dataset.index);
      item.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", item.dataset.index);
    });

    item.addEventListener("dragend", resetDragState);

    item.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (draggedItem && draggedItem !== item) {
        setDragOver(item);
      }
    });

    item.addEventListener("dragleave", () => {
      if (currentDragOverItem === item) {
        setDragOver(null);
      }
    });

    item.addEventListener("drop", (e) => {
      e.preventDefault();
      handleDrop(item);
    });

    // Touch events (mobile)
    item.addEventListener(
      "touchstart",
      (e) => {
        // Only start drag from drag handle to avoid interfering with other interactions
        const handle = e.target.closest(".todo-drag-handle");
        if (!handle) return;

        draggedItem = item;
        draggedIndex = parseInt(item.dataset.index);
        item.classList.add("dragging");
      },
      { passive: true }
    );

    item.addEventListener(
      "touchmove",
      (e) => {
        if (!draggedItem) return;

        const touch = e.touches[0];
        const elementAtPoint = document.elementFromPoint(
          touch.clientX,
          touch.clientY
        );
        const targetItem = elementAtPoint?.closest(".todo-item");

        if (targetItem && targetItem !== draggedItem) {
          setDragOver(targetItem);
        } else {
          setDragOver(null);
        }

        e.preventDefault();
      },
      { passive: false } // Required for preventDefault on iOS Safari
    );

    item.addEventListener("touchend", (e) => {
      if (!draggedItem) return;

      const touch = e.changedTouches[0];
      const elementAtPoint = document.elementFromPoint(
        touch.clientX,
        touch.clientY
      );
      const targetItem = elementAtPoint?.closest(".todo-item");
      handleDrop(targetItem);
    });
  });
}
