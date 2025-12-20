/**
 * Mandara List Drag and Drop Module
 * Handles drag and drop functionality for mandara cards in list view
 */

/**
 * Setup drag and drop for mandara cards
 * @param {HTMLElement} container - The mandara list container element
 * @param {Object} callbacks - Callback functions
 * @param {Function} callbacks.onReorder - Called with (fromIndex, toIndex) when reorder occurs
 */
export function setupMandaraListDragAndDrop(container, callbacks) {
  let draggedCard = null;
  let draggedIndex = -1;
  let currentDragOverCard = null;

  const { onReorder } = callbacks;

  // Helper: Reset drag state
  function resetDragState() {
    if (draggedCard) {
      draggedCard.classList.remove("dragging");
    }
    if (currentDragOverCard) {
      currentDragOverCard.classList.remove("drag-over");
    }
    draggedCard = null;
    draggedIndex = -1;
    currentDragOverCard = null;
  }

  // Helper: Set drag-over on target (removes from previous)
  function setDragOver(targetCard) {
    if (currentDragOverCard === targetCard) return;
    if (currentDragOverCard) {
      currentDragOverCard.classList.remove("drag-over");
    }
    currentDragOverCard = targetCard;
    if (targetCard) {
      targetCard.classList.add("drag-over");
    }
  }

  // Helper: Handle reorder when drop occurs
  function handleDrop(targetCard) {
    setDragOver(null);
    if (draggedCard && targetCard && targetCard !== draggedCard) {
      const fromIndex = draggedIndex;
      const toIndex = parseInt(targetCard.dataset.index);
      onReorder(fromIndex, toIndex);
    }
    resetDragState();
  }

  // Add index to each card
  const cards = container.querySelectorAll(".mandara-card");
  cards.forEach((card, index) => {
    card.dataset.index = index;
    card.draggable = true;

    // Mouse drag events (desktop)
    card.addEventListener("dragstart", (e) => {
      // Don't drag if clicking on interactive elements
      if (
        e.target.classList.contains("card-checkbox") ||
        e.target.classList.contains("card-delete-btn") ||
        e.target.closest(".card-checkbox") ||
        e.target.closest(".card-delete-btn")
      ) {
        e.preventDefault();
        return;
      }

      draggedCard = card;
      draggedIndex = parseInt(card.dataset.index);
      card.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", card.dataset.index);
    });

    card.addEventListener("dragend", resetDragState);

    card.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (draggedCard && draggedCard !== card) {
        setDragOver(card);
      }
    });

    card.addEventListener("dragleave", () => {
      if (currentDragOverCard === card) {
        setDragOver(null);
      }
    });

    card.addEventListener("drop", (e) => {
      e.preventDefault();
      handleDrop(card);
    });

    // Touch events (mobile)
    card.addEventListener(
      "touchstart",
      (e) => {
        // Don't drag if touching interactive elements
        if (
          e.target.classList.contains("card-checkbox") ||
          e.target.classList.contains("card-delete-btn") ||
          e.target.closest(".card-checkbox") ||
          e.target.closest(".card-delete-btn")
        ) {
          return;
        }

        // Only start drag from drag handle if present, otherwise from card
        const handle = e.target.closest(".card-drag-handle");
        if (!handle && card.querySelector(".card-drag-handle")) {
          return; // Drag handle exists but wasn't touched
        }

        draggedCard = card;
        draggedIndex = parseInt(card.dataset.index);
        card.classList.add("dragging");
      },
      { passive: true }
    );

    card.addEventListener(
      "touchmove",
      (e) => {
        if (!draggedCard) return;

        const touch = e.touches[0];
        const elementAtPoint = document.elementFromPoint(
          touch.clientX,
          touch.clientY
        );
        const targetCard = elementAtPoint?.closest(".mandara-card");

        if (targetCard && targetCard !== draggedCard) {
          setDragOver(targetCard);
        } else {
          setDragOver(null);
        }

        e.preventDefault();
      },
      { passive: false }
    );

    card.addEventListener("touchend", (e) => {
      if (!draggedCard) return;

      const touch = e.changedTouches[0];
      const elementAtPoint = document.elementFromPoint(
        touch.clientX,
        touch.clientY
      );
      const targetCard = elementAtPoint?.closest(".mandara-card");
      handleDrop(targetCard);
    });
  });
}

/**
 * Disable drag and drop for mandara cards
 * @param {HTMLElement} container - The mandara list container element
 */
export function disableMandaraListDragAndDrop(container) {
  const cards = container.querySelectorAll(".mandara-card");
  cards.forEach((card) => {
    card.draggable = false;
    card.classList.remove("dragging", "drag-over");
  });
}
