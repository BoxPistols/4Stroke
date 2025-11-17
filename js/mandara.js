// Mandara Page - Main Logic
import { getStorageMode, isLocalMode, isOnlineMode, Storage } from './storage-service.js';
import { TIMINGS } from './constants.js';

// Current state
let currentUserId = null;
let currentMandara = null;
let allMandaras = [];
let saveTimer = null;

// Generate unique ID
function generateId() {
  return `mandara_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Format date for display
function formatDate(date) {
  if (!date) return '-';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Show auto-save message
function showAutoSaveMessage() {
  const message = document.getElementById('message');
  if (message) {
    message.classList.remove('is-hidden');
    setTimeout(() => {
      message.classList.add('is-hidden');
    }, TIMINGS.AUTO_SAVE_MESSAGE_DURATION);
  }
}

// Show toast notification
function showToast(msg) {
  const toast = document.getElementById('success-toast');
  const toastMessage = document.getElementById('success-toast-message');
  if (toast && toastMessage) {
    toastMessage.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, TIMINGS.TOAST_DURATION);
  }
}

// Create new mandara
function createNewMandara() {
  const mandara = {
    id: generateId(),
    title: '',
    cells: {
      1: '', 2: '', 3: '',
      4: '', 5: '', 6: '',
      7: '', 8: '', 9: ''
    },
    memo: '',
    tags: [],
    todos: [],
    linkedGarageId: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  return mandara;
}

// Load mandara into UI
function loadMandaraIntoUI(mandara) {
  currentMandara = mandara;

  // Title
  document.getElementById('mandara-title').value = mandara.title || '';

  // Cells
  for (let i = 1; i <= 9; i++) {
    const cell = document.getElementById(`cell-${i}`);
    if (cell) {
      cell.value = mandara.cells[i] || '';
    }
  }

  // Memo
  document.getElementById('mandara-memo').value = mandara.memo || '';

  // Dates
  document.getElementById('created-date').textContent = `作成: ${formatDate(mandara.createdAt)}`;
  document.getElementById('updated-date').textContent = `更新: ${formatDate(mandara.updatedAt)}`;

  // Tags
  renderTags();

  // TODOs
  renderTodos();
}

// Save current mandara
async function saveCurrentMandara() {
  if (!currentMandara) return;

  try {
    // Update mandara with current UI values
    currentMandara.title = document.getElementById('mandara-title').value;
    currentMandara.memo = document.getElementById('mandara-memo').value;

    for (let i = 1; i <= 9; i++) {
      const cell = document.getElementById(`cell-${i}`);
      if (cell) {
        currentMandara.cells[i] = cell.value;
      }
    }

    currentMandara.updatedAt = new Date();

    await Storage.saveMandara(currentUserId, currentMandara);

    // Update updated date display
    document.getElementById('updated-date').textContent = `更新: ${formatDate(currentMandara.updatedAt)}`;

    showAutoSaveMessage();
  } catch (error) {
    console.error('[ERROR] Failed to save mandara:', error);
    alert('保存に失敗しました');
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
  const container = document.getElementById('tags-container');
  if (!container || !currentMandara) return;

  container.innerHTML = '';
  (currentMandara.tags || []).forEach(tag => {
    const tagEl = document.createElement('span');
    tagEl.className = 'tag';
    tagEl.innerHTML = `${tag} <button class="tag-remove" data-tag="${tag}">×</button>`;
    container.appendChild(tagEl);
  });
}

// Add tag
function addTag(tag) {
  if (!currentMandara || !tag) return;

  const trimmedTag = tag.trim();
  if (!trimmedTag) return;

  if (!currentMandara.tags) {
    currentMandara.tags = [];
  }

  if (!currentMandara.tags.includes(trimmedTag)) {
    currentMandara.tags.push(trimmedTag);
    renderTags();
    saveCurrentMandara();
  }
}

// Remove tag
function removeTag(tag) {
  if (!currentMandara) return;

  currentMandara.tags = (currentMandara.tags || []).filter(t => t !== tag);
  renderTags();
  saveCurrentMandara();
}

// Render todos
function renderTodos() {
  const container = document.getElementById('todos-container');
  if (!container || !currentMandara) return;

  container.innerHTML = '';
  (currentMandara.todos || []).forEach(todo => {
    const todoEl = document.createElement('div');
    todoEl.className = 'todo-item';
    todoEl.innerHTML = `
      <input type="checkbox" class="todo-checkbox" data-id="${todo.id}" ${todo.completed ? 'checked' : ''}>
      <span class="todo-text ${todo.completed ? 'completed' : ''}">${todo.text}</span>
      <button class="todo-remove" data-id="${todo.id}">×</button>
    `;
    container.appendChild(todoEl);
  });
}

// Add todo
function addTodo(text) {
  if (!currentMandara || !text) return;

  const trimmedText = text.trim();
  if (!trimmedText) return;

  if (!currentMandara.todos) {
    currentMandara.todos = [];
  }

  const todo = {
    id: `todo_${Date.now()}`,
    text: trimmedText,
    completed: false
  };

  currentMandara.todos.push(todo);
  renderTodos();
  saveCurrentMandara();
}

// Toggle todo
function toggleTodo(id) {
  if (!currentMandara) return;

  const todo = (currentMandara.todos || []).find(t => t.id === id);
  if (todo) {
    todo.completed = !todo.completed;
    renderTodos();
    saveCurrentMandara();
  }
}

// Remove todo
function removeTodo(id) {
  if (!currentMandara) return;

  currentMandara.todos = (currentMandara.todos || []).filter(t => t.id !== id);
  renderTodos();
  saveCurrentMandara();
}

// Delete current mandara
async function deleteCurrentMandara() {
  if (!currentMandara) return;

  if (!confirm(`「${currentMandara.title || '無題'}」を削除しますか？`)) {
    return;
  }

  try {
    await Storage.deleteMandara(currentUserId, currentMandara.id);
    showToast('削除しました');

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
    console.error('[ERROR] Failed to delete mandara:', error);
    alert('削除に失敗しました');
  }
}

// Load all mandaras
async function loadAllMandaras() {
  try {
    allMandaras = await Storage.loadAllMandaras(currentUserId);
    console.log(`[INFO] Loaded ${allMandaras.length} mandaras`);
  } catch (error) {
    console.error('[ERROR] Failed to load mandaras:', error);
    allMandaras = [];
  }
}

// Render mandara list
function renderMandaraList(filter = '', sortBy = 'updated-desc') {
  const listContainer = document.getElementById('mandara-list');
  if (!listContainer) return;

  // Filter
  let filtered = allMandaras;
  if (filter) {
    const lowerFilter = filter.toLowerCase();
    filtered = allMandaras.filter(m => {
      const title = (m.title || '').toLowerCase();
      const memo = (m.memo || '').toLowerCase();
      const cells = Object.values(m.cells || {}).join(' ').toLowerCase();
      const tags = (m.tags || []).join(' ').toLowerCase();
      return title.includes(lowerFilter) ||
             memo.includes(lowerFilter) ||
             cells.includes(lowerFilter) ||
             tags.includes(lowerFilter);
    });
  }

  // Sort
  filtered.sort((a, b) => {
    switch (sortBy) {
      case 'updated-desc':
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      case 'updated-asc':
        return new Date(a.updatedAt) - new Date(b.updatedAt);
      case 'created-desc':
        return new Date(b.createdAt) - new Date(a.createdAt);
      case 'created-asc':
        return new Date(a.createdAt) - new Date(b.createdAt);
      case 'title-asc':
        return (a.title || '').localeCompare(b.title || '');
      case 'title-desc':
        return (b.title || '').localeCompare(a.title || '');
      default:
        return 0;
    }
  });

  // Render
  listContainer.innerHTML = '';
  if (filtered.length === 0) {
    listContainer.innerHTML = '<p class="empty-message">マンダラが見つかりません</p>';
    return;
  }

  filtered.forEach(mandara => {
    const card = document.createElement('div');
    card.className = 'mandara-card';
    card.dataset.id = mandara.id;

    const tagsHtml = (mandara.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('');
    const centerText = (mandara.cells && mandara.cells[5]) ? mandara.cells[5] : '中心未設定';

    card.innerHTML = `
      <h3 class="card-title">${mandara.title || '無題'}</h3>
      <p class="card-center">中心: ${centerText}</p>
      <div class="card-tags">${tagsHtml}</div>
      <div class="card-meta">
        <span>作成: ${formatDate(mandara.createdAt)}</span>
        <span>更新: ${formatDate(mandara.updatedAt)}</span>
      </div>
    `;

    card.addEventListener('click', () => {
      loadMandaraIntoUI(mandara);
      closeListView();
    });

    listContainer.appendChild(card);
  });
}

// Show list view
function showListView() {
  document.getElementById('list-view').classList.remove('is-hidden');
  document.getElementById('mandara-editor').style.display = 'none';
  renderMandaraList();
}

// Close list view
function closeListView() {
  document.getElementById('list-view').classList.add('is-hidden');
  document.getElementById('mandara-editor').style.display = 'block';
}

// Expand to 4Stroke
function expandTo4Stroke() {
  if (!currentMandara) return;

  const center = currentMandara.cells[5] || '';
  const data = {
    center,
    cells: currentMandara.cells,
    title: currentMandara.title,
    mandaraId: currentMandara.id
  };

  // Store in sessionStorage for 4Stroke to pick up
  sessionStorage.setItem('mandara_expand', JSON.stringify(data));

  // Navigate to main.html
  window.location.href = 'main.html?from=mandara';
}

// Setup event listeners
function setupEventListeners() {
  // Title input
  const titleInput = document.getElementById('mandara-title');
  if (titleInput) {
    titleInput.addEventListener('input', debouncedSave);
  }

  // Cell inputs
  for (let i = 1; i <= 9; i++) {
    const cell = document.getElementById(`cell-${i}`);
    if (cell) {
      cell.addEventListener('input', debouncedSave);
    }
  }

  // Memo input
  const memoInput = document.getElementById('mandara-memo');
  if (memoInput) {
    memoInput.addEventListener('input', debouncedSave);
  }

  // Tag input
  const tagInput = document.getElementById('tag-input');
  if (tagInput) {
    tagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addTag(tagInput.value);
        tagInput.value = '';
      }
    });
  }

  // Tag removal (delegated)
  const tagsContainer = document.getElementById('tags-container');
  if (tagsContainer) {
    tagsContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('tag-remove')) {
        const tag = e.target.dataset.tag;
        removeTag(tag);
      }
    });
  }

  // Todo input
  const todoInput = document.getElementById('todo-input');
  if (todoInput) {
    todoInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addTodo(todoInput.value);
        todoInput.value = '';
      }
    });
  }

  // Todo actions (delegated)
  const todosContainer = document.getElementById('todos-container');
  if (todosContainer) {
    todosContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('todo-checkbox')) {
        toggleTodo(e.target.dataset.id);
      } else if (e.target.classList.contains('todo-remove')) {
        removeTodo(e.target.dataset.id);
      }
    });
  }

  // New mandara button
  const newMandaraBtn = document.getElementById('new-mandara-btn');
  if (newMandaraBtn) {
    newMandaraBtn.addEventListener('click', async () => {
      const newMandara = createNewMandara();
      await Storage.saveMandara(currentUserId, newMandara);
      allMandaras.unshift(newMandara);
      loadMandaraIntoUI(newMandara);
      showToast('新しいマンダラを作成しました');
    });
  }

  // Delete mandara button
  const deleteBtn = document.getElementById('delete-mandara-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', deleteCurrentMandara);
  }

  // Expand to 4Stroke button
  const expandBtn = document.getElementById('expand-to-4stroke-btn');
  if (expandBtn) {
    expandBtn.addEventListener('click', expandTo4Stroke);
  }

  // List view button
  const listViewBtn = document.getElementById('list-view-btn');
  if (listViewBtn) {
    listViewBtn.addEventListener('click', showListView);
  }

  // Close list view button
  const listCloseBtn = document.getElementById('list-close-btn');
  if (listCloseBtn) {
    listCloseBtn.addEventListener('click', closeListView);
  }

  // Search button
  const searchBtn = document.getElementById('search-btn');
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      showListView();
      const filterInput = document.getElementById('filter-input');
      if (filterInput) {
        filterInput.focus();
      }
    });
  }

  // Filter input
  const filterInput = document.getElementById('filter-input');
  if (filterInput) {
    filterInput.addEventListener('input', () => {
      const sortSelect = document.getElementById('sort-select');
      renderMandaraList(filterInput.value, sortSelect ? sortSelect.value : 'updated-desc');
    });
  }

  // Sort select
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      renderMandaraList(filterInput ? filterInput.value : '', sortSelect.value);
    });
  }

  // Logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (isOnlineMode()) {
        if (confirm('ログアウトしますか？')) {
          const { logout } = await import('./auth.js');
          try {
            await logout();
            window.location.href = '/login.html';
          } catch (error) {
            console.error('[ERROR] Logout failed:', error);
            alert('ログアウトに失敗しました');
          }
        }
      } else {
        if (confirm('オンラインモードに切り替えますか？')) {
          window.location.href = '/login.html';
        }
      }
    });
  }
}

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[INFO] Mandara app starting...');

  if (isOnlineMode()) {
    // Online mode - require authentication
    const { onAuthChange } = await import('./auth.js');

    onAuthChange(async (user) => {
      if (!user) {
        window.location.href = '/login.html';
        return;
      }

      console.log('[SUCCESS] Logged in:', user.email);
      currentUserId = user.uid;

      // Update logout button
      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.title = `Logout (${user.email})`;
      }

      await initializeApp();
    });
  } else {
    // Local mode
    console.log('[INFO] Running in local storage mode');
    currentUserId = null;

    // Update logout button for local mode
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      const logoutText = logoutBtn.querySelector('.logout-text');
      if (logoutText) {
        logoutText.textContent = 'LOGIN';
      }
      logoutBtn.title = 'Switch to Online Mode';
    }

    await initializeApp();
  }
});

// Initialize app logic
async function initializeApp() {
  // Load all mandaras
  await loadAllMandaras();

  // Check if coming from 4Stroke
  const urlParams = new URLSearchParams(window.location.search);
  const from4Stroke = urlParams.get('from') === '4stroke';

  if (from4Stroke) {
    const strokeData = sessionStorage.getItem('4stroke_expand');
    if (strokeData) {
      // Create new mandara from 4Stroke data
      const data = JSON.parse(strokeData);
      const newMandara = createNewMandara();
      newMandara.title = data.title || '';
      newMandara.cells[5] = data.key || '';
      newMandara.linkedGarageId = data.garageId;

      await Storage.saveMandara(currentUserId, newMandara);
      allMandaras.unshift(newMandara);
      loadMandaraIntoUI(newMandara);

      sessionStorage.removeItem('4stroke_expand');
      showToast('4STROKEから展開しました');
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

  console.log('[INFO] Mandara app initialized');
}
