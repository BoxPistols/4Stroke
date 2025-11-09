// Minimap View Controller
// Displays all 16 notes (4 garages x 4 strokes) in a grid view
// with drag & drop functionality to swap note contents

import { Storage } from './storage-service.js';

// Note metadata
const GARAGE_NAMES = ['GARAGE-A', 'GARAGE-B', 'GARAGE-C', 'GARAGE-D'];
const NOTE_TITLES = ['Key', 'Issue', 'Action', 'Publish'];

let draggedNote = null;
let currentUserId = null;

/**
 * Open minimap view
 */
export function openMinimapView() {
  const minimapView = document.getElementById('minimap-view');
  const toggleBtn = document.getElementById('minimap-toggle-btn');

  if (minimapView) {
    minimapView.classList.add('active');
    if (toggleBtn) toggleBtn.classList.add('active');
    populateMinimapGrid();
    console.log('[INFO] Minimap view opened');
  }
}

/**
 * Close minimap view
 */
export function closeMinimapView() {
  const minimapView = document.getElementById('minimap-view');
  const toggleBtn = document.getElementById('minimap-toggle-btn');

  if (minimapView) {
    minimapView.classList.remove('active');
    if (toggleBtn) toggleBtn.classList.remove('active');
    console.log('[INFO] Minimap view closed');
  }
}

/**
 * Toggle minimap view
 */
export function toggleMinimapView() {
  const minimapView = document.getElementById('minimap-view');
  if (minimapView && minimapView.classList.contains('active')) {
    closeMinimapView();
  } else {
    openMinimapView();
  }
}

/**
 * Set current user ID for data operations
 */
export function setMinimapUserId(userId) {
  currentUserId = userId;
}

/**
 * Populate minimap grid with all 16 notes
 */
function populateMinimapGrid() {
  const grid = document.getElementById('minimap-grid');
  if (!grid) return;

  grid.innerHTML = '';

  // Create 16 note cards (4 garages x 4 strokes)
  for (let garageIndex = 0; garageIndex < 4; garageIndex++) {
    for (let strokeIndex = 0; strokeIndex < 4; strokeIndex++) {
      const noteIndex = garageIndex * 4 + strokeIndex + 1;
      const noteCard = createNoteCard(garageIndex, strokeIndex, noteIndex);
      grid.appendChild(noteCard);
    }
  }

  // Setup drag and drop
  setupDragAndDrop();

  console.log('[INFO] Minimap grid populated');
}

/**
 * Create a single note card element
 */
function createNoteCard(garageIndex, strokeIndex, noteIndex) {
  const card = document.createElement('div');
  card.className = `minimap-note stroke-${strokeIndex + 1}`;
  card.draggable = true;
  card.dataset.garageIndex = garageIndex;
  card.dataset.strokeIndex = strokeIndex;
  card.dataset.noteIndex = noteIndex;

  // Get current value from main textarea
  const mainTextarea = document.getElementById(`stroke${noteIndex}`);
  const currentValue = mainTextarea ? mainTextarea.value : '';

  card.innerHTML = `
    <div class="minimap-note-header">
      <div class="note-label">
        <span class="garage-name">${GARAGE_NAMES[garageIndex]}</span>
        <span class="note-title">${NOTE_TITLES[strokeIndex]}</span>
      </div>
      <span class="drag-handle">⋮⋮</span>
    </div>
    <div class="minimap-note-content">
      <textarea
        id="minimap-textarea-${noteIndex}"
        data-note-index="${noteIndex}"
        placeholder="Enter note..."
      >${currentValue}</textarea>
    </div>
  `;

  // Add textarea input event listener
  const textarea = card.querySelector('textarea');
  if (textarea) {
    textarea.addEventListener('input', debounce((e) => {
      syncToMainView(noteIndex, e.target.value);
    }, 500));
  }

  return card;
}

/**
 * Setup drag and drop functionality
 */
function setupDragAndDrop() {
  const notes = document.querySelectorAll('.minimap-note');

  notes.forEach(note => {
    note.addEventListener('dragstart', handleDragStart);
    note.addEventListener('dragend', handleDragEnd);
    note.addEventListener('dragover', handleDragOver);
    note.addEventListener('drop', handleDrop);
    note.addEventListener('dragleave', handleDragLeave);
  });
}

/**
 * Handle drag start
 */
function handleDragStart(e) {
  draggedNote = e.currentTarget;
  draggedNote.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', draggedNote.innerHTML);
}

/**
 * Handle drag end
 */
function handleDragEnd(e) {
  if (draggedNote) {
    draggedNote.classList.remove('dragging');
    draggedNote = null;
  }

  // Remove all drag-over classes
  document.querySelectorAll('.minimap-note').forEach(note => {
    note.classList.remove('drag-over');
  });
}

/**
 * Handle drag over
 */
function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }

  e.dataTransfer.dropEffect = 'move';

  const target = e.currentTarget;
  if (draggedNote && draggedNote !== target) {
    target.classList.add('drag-over');
  }

  return false;
}

/**
 * Handle drag leave
 */
function handleDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

/**
 * Handle drop - swap note contents
 */
async function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }

  const targetNote = e.currentTarget;
  targetNote.classList.remove('drag-over');

  if (draggedNote && draggedNote !== targetNote) {
    // Get note indices
    const draggedIndex = parseInt(draggedNote.dataset.noteIndex);
    const targetIndex = parseInt(targetNote.dataset.noteIndex);

    // Get textarea contents
    const draggedTextarea = draggedNote.querySelector('textarea');
    const targetTextarea = targetNote.querySelector('textarea');

    const draggedContent = draggedTextarea.value;
    const targetContent = targetTextarea.value;

    // Swap contents in minimap
    draggedTextarea.value = targetContent;
    targetTextarea.value = draggedContent;

    // Swap contents in main view
    const mainDraggedTextarea = document.getElementById(`stroke${draggedIndex}`);
    const mainTargetTextarea = document.getElementById(`stroke${targetIndex}`);

    if (mainDraggedTextarea && mainTargetTextarea) {
      mainDraggedTextarea.value = targetContent;
      mainTargetTextarea.value = draggedContent;

      // Save both changes to storage
      await saveNoteToStorage(draggedIndex, targetContent);
      await saveNoteToStorage(targetIndex, draggedContent);

      // Show auto-save message
      showAutoSaveMessage();

      console.log(`[INFO] Swapped notes: ${draggedIndex} ↔ ${targetIndex}`);
    }
  }

  return false;
}

/**
 * Sync minimap textarea to main view
 */
async function syncToMainView(noteIndex, content) {
  const mainTextarea = document.getElementById(`stroke${noteIndex}`);
  if (mainTextarea) {
    mainTextarea.value = content;
    await saveNoteToStorage(noteIndex, content);
    showAutoSaveMessage();
  }
}

/**
 * Save note to storage
 */
async function saveNoteToStorage(noteIndex, content) {
  const garageNum = Math.floor((noteIndex - 1) / 4) + 1;
  const strokeNum = ((noteIndex - 1) % 4) + 1;
  const garageId = `garage${garageNum}`;
  const fieldKey = `stroke${strokeNum}`;

  try {
    await Storage.saveStroke(currentUserId, garageId, fieldKey, content);
  } catch (error) {
    console.error('[ERROR] Failed to save note:', error);
  }
}

/**
 * Show auto-save message
 */
function showAutoSaveMessage() {
  const message = document.querySelector('#message');
  if (message) {
    message.classList.remove('is-hidden');
    setTimeout(() => {
      message.classList.add('is-hidden');
    }, 1200);
  }
}

/**
 * Debounce utility
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Refresh minimap view (reload data from main view)
 */
export function refreshMinimapView() {
  const minimapView = document.getElementById('minimap-view');
  if (minimapView && minimapView.classList.contains('active')) {
    populateMinimapGrid();
  }
}

/**
 * Initialize minimap
 */
export function initializeMinimap(userId) {
  currentUserId = userId;

  const toggleBtn = document.getElementById('minimap-toggle-btn');
  const closeBtn = document.getElementById('minimap-close-btn');
  const minimapView = document.getElementById('minimap-view');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleMinimapView);
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', closeMinimapView);
  }

  // Close on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && minimapView?.classList.contains('active')) {
      closeMinimapView();
    }
  });

  console.log('[INFO] Minimap initialized');
}
