# Firestore API 実践ガイド

このドキュメントでは、4STROKEアプリケーションで使用するFirestore APIの実践的な使用例を紹介します。

---

## 目次

1. [基本的な使い方](#1-基本的な使い方)
2. [Garage CRUD操作](#2-garage-crud操作)
3. [Mandara CRUD操作](#3-mandara-crud操作)
4. [バッチ操作](#4-バッチ操作)
5. [エラーハンドリング](#5-エラーハンドリング)
6. [実装パターン](#6-実装パターン)
7. [よくある実装例](#7-よくある実装例)

---

## 1. 基本的な使い方

### ストレージモードの切り替え

```javascript
import { Storage, getStorageMode, setStorageMode, isOnlineMode } from './storage-service.js';

// 現在のモードを確認
console.log('現在のモード:', getStorageMode()); // 'local' or 'online'

// オンラインモードに切り替え
setStorageMode('online');

// モードチェック
if (isOnlineMode()) {
  console.log('Firestoreを使用中');
} else {
  console.log('LocalStorageを使用中');
}
```

---

## 2. Garage CRUD操作

### 2.1 全Garageデータの読み込み

```javascript
import { Storage } from './storage-service.js';

async function loadAllGarageData(userId) {
  try {
    const garages = await Storage.loadAllGarages(userId);

    console.log('GARAGE-A:', garages.garageA.title);
    console.log('GARAGE-B:', garages.garageB.title);
    console.log('GARAGE-C:', garages.garageC.title);
    console.log('GARAGE-D:', garages.garageD.title);

    // UIに表示
    document.getElementById('garage-a-title').value = garages.garageA.title;
    document.getElementById('stroke1').value = garages.garageA.stroke1;
    // ...

    return garages;
  } catch (error) {
    console.error('ガレージ読み込みエラー:', error);
    alert('データの読み込みに失敗しました');
  }
}

// 使用例
const userId = 'user_abc123';
loadAllGarageData(userId);
```

### 2.2 単一Garageの更新

```javascript
async function updateGarageTitle(userId, garageId, newTitle) {
  try {
    await Storage.saveTitle(userId, garageId, newTitle);
    console.log('タイトル更新成功');
    showToast('保存しました');
  } catch (error) {
    console.error('保存エラー:', error);
    alert('保存に失敗しました');
  }
}

// 使用例
updateGarageTitle('user_abc123', 'garageA', '新しいプロジェクト');
```

### 2.3 Strokeの自動保存（デバウンス付き）

```javascript
let saveTimer = null;

function autoSaveStroke(userId, garageId, fieldKey, value) {
  // 既存のタイマーをクリア
  if (saveTimer) {
    clearTimeout(saveTimer);
  }

  // 2秒後に保存
  saveTimer = setTimeout(async () => {
    try {
      await Storage.saveStroke(userId, garageId, fieldKey, value);
      console.log('自動保存完了:', fieldKey);
      showAutoSaveIndicator();
    } catch (error) {
      console.error('自動保存エラー:', error);
    }
  }, 2000);
}

// textarea イベントリスナー
document.getElementById('stroke1').addEventListener('input', (e) => {
  autoSaveStroke('user_abc123', 'garageA', 'stroke1', e.target.value);
});
```

### 2.4 Garageの削除

```javascript
async function deleteGarageWithConfirmation(userId, garageId) {
  if (!confirm('このガレージを削除しますか？')) {
    return;
  }

  try {
    await Storage.deleteGarage(userId, garageId);
    console.log('ガレージ削除成功');

    // UIをクリア
    document.getElementById(`${garageId}-title`).value = '';
    document.getElementById('stroke1').value = '';
    // ...

    showToast('削除しました');
  } catch (error) {
    console.error('削除エラー:', error);
    alert('削除に失敗しました');
  }
}

// 使用例
deleteGarageWithConfirmation('user_abc123', 'garageA');
```

---

## 3. Mandara CRUD操作

### 3.1 全Mandaraの読み込みとリスト表示

```javascript
import { Storage } from './storage-service.js';

async function loadAndDisplayMandaras(userId) {
  try {
    const mandaras = await Storage.loadAllMandaras(userId);

    console.log(`${mandaras.length}件のマンダラを読み込みました`);

    // リスト表示
    const listContainer = document.getElementById('mandara-list');
    listContainer.innerHTML = '';

    mandaras.forEach(mandara => {
      const card = createMandaraCard(mandara);
      listContainer.appendChild(card);
    });

    return mandaras;
  } catch (error) {
    console.error('マンダラ読み込みエラー:', error);
    alert('データの読み込みに失敗しました');
    return [];
  }
}

function createMandaraCard(mandara) {
  const card = document.createElement('div');
  card.className = 'mandara-card';
  card.innerHTML = `
    <h3>${mandara.title || '無題'}</h3>
    <p>中心: ${mandara.cells[5] || '-'}</p>
    <p>作成: ${new Date(mandara.createdAt).toLocaleDateString()}</p>
  `;

  card.addEventListener('click', () => {
    loadMandaraById(mandara.id);
  });

  return card;
}

// 使用例
loadAndDisplayMandaras('user_abc123');
```

### 3.2 新しいMandaraの作成

```javascript
function generateMandaraId() {
  return `mandara_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function createNewMandara(userId) {
  const newMandara = {
    id: generateMandaraId(),
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

  try {
    await Storage.saveMandara(userId, newMandara);
    console.log('新しいマンダラ作成成功:', newMandara.id);

    // UIに読み込み
    loadMandaraIntoUI(newMandara);
    showToast('新しいマンダラを作成しました');

    return newMandara;
  } catch (error) {
    console.error('作成エラー:', error);
    alert('作成に失敗しました');
  }
}

// 使用例
document.getElementById('new-mandara-btn').addEventListener('click', () => {
  createNewMandara('user_abc123');
});
```

### 3.3 Mandaraの更新（自動保存）

```javascript
let currentMandara = null;
let saveTimer = null;

function autoSaveMandara(userId) {
  if (!currentMandara) return;

  if (saveTimer) {
    clearTimeout(saveTimer);
  }

  saveTimer = setTimeout(async () => {
    try {
      // UIから最新データを取得
      currentMandara.title = document.getElementById('mandara-title').value;
      currentMandara.cells[1] = document.getElementById('cell-1').value;
      currentMandara.cells[2] = document.getElementById('cell-2').value;
      // ... 他のセル
      currentMandara.memo = document.getElementById('mandara-memo').value;
      currentMandara.updatedAt = new Date();

      await Storage.saveMandara(userId, currentMandara);
      console.log('自動保存完了');
      showAutoSaveIndicator();
    } catch (error) {
      console.error('自動保存エラー:', error);
    }
  }, 2000);
}

// 全入力フィールドにリスナー設定
document.getElementById('mandara-title').addEventListener('input', () => {
  autoSaveMandara('user_abc123');
});

for (let i = 1; i <= 9; i++) {
  document.getElementById(`cell-${i}`).addEventListener('input', () => {
    autoSaveMandara('user_abc123');
  });
}
```

### 3.4 タグの追加・削除

```javascript
async function addTag(userId, tag) {
  if (!currentMandara || !tag.trim()) return;

  // 重複チェック
  if (currentMandara.tags.includes(tag)) {
    console.log('タグは既に存在します');
    return;
  }

  currentMandara.tags.push(tag);
  currentMandara.updatedAt = new Date();

  try {
    await Storage.saveMandara(userId, currentMandara);
    renderTags(); // UIを更新
    showToast('タグを追加しました');
  } catch (error) {
    console.error('タグ追加エラー:', error);
  }
}

async function removeTag(userId, tag) {
  if (!currentMandara) return;

  currentMandara.tags = currentMandara.tags.filter(t => t !== tag);
  currentMandara.updatedAt = new Date();

  try {
    await Storage.saveMandara(userId, currentMandara);
    renderTags(); // UIを更新
    showToast('タグを削除しました');
  } catch (error) {
    console.error('タグ削除エラー:', error);
  }
}

function renderTags() {
  const container = document.getElementById('tags-container');
  container.innerHTML = '';

  currentMandara.tags.forEach(tag => {
    const tagEl = document.createElement('span');
    tagEl.className = 'tag';
    tagEl.innerHTML = `
      ${tag}
      <button onclick="removeTag('user_abc123', '${tag}')">×</button>
    `;
    container.appendChild(tagEl);
  });
}
```

### 3.5 TODOの管理

```javascript
function generateTodoId() {
  return `todo_${Date.now()}`;
}

async function addTodo(userId, text) {
  if (!currentMandara || !text.trim()) return;

  const newTodo = {
    id: generateTodoId(),
    text: text.trim(),
    completed: false
  };

  currentMandara.todos.push(newTodo);
  currentMandara.updatedAt = new Date();

  try {
    await Storage.saveMandara(userId, currentMandara);
    renderTodos(); // UIを更新
    showToast('TODOを追加しました');
  } catch (error) {
    console.error('TODO追加エラー:', error);
  }
}

async function toggleTodo(userId, todoId) {
  if (!currentMandara) return;

  const todo = currentMandara.todos.find(t => t.id === todoId);
  if (!todo) return;

  todo.completed = !todo.completed;
  currentMandara.updatedAt = new Date();

  try {
    await Storage.saveMandara(userId, currentMandara);
    renderTodos(); // UIを更新
  } catch (error) {
    console.error('TODO更新エラー:', error);
  }
}

async function removeTodo(userId, todoId) {
  if (!currentMandara) return;

  currentMandara.todos = currentMandara.todos.filter(t => t.id !== todoId);
  currentMandara.updatedAt = new Date();

  try {
    await Storage.saveMandara(userId, currentMandara);
    renderTodos(); // UIを更新
    showToast('TODOを削除しました');
  } catch (error) {
    console.error('TODO削除エラー:', error);
  }
}

function renderTodos() {
  const container = document.getElementById('todos-container');
  container.innerHTML = '';

  currentMandara.todos.forEach(todo => {
    const todoEl = document.createElement('div');
    todoEl.className = 'todo-item';
    todoEl.innerHTML = `
      <input type="checkbox"
             ${todo.completed ? 'checked' : ''}
             onchange="toggleTodo('user_abc123', '${todo.id}')">
      <span class="${todo.completed ? 'completed' : ''}">${todo.text}</span>
      <button onclick="removeTodo('user_abc123', '${todo.id}')">×</button>
    `;
    container.appendChild(todoEl);
  });
}
```

---

## 4. バッチ操作

### 4.1 複数Mandaraの一括削除

```javascript
import { Storage } from './storage-service.js';

async function deleteSelectedMandaras(userId) {
  // チェックされたマンダラIDを取得
  const checkboxes = document.querySelectorAll('.mandara-checkbox:checked');
  const ids = Array.from(checkboxes).map(cb => cb.dataset.id);

  if (ids.length === 0) {
    alert('削除するマンダラを選択してください');
    return;
  }

  if (!confirm(`${ids.length}件のマンダラを削除しますか？`)) {
    return;
  }

  try {
    // バッチ削除（高速）
    await Storage.deleteMandaras(userId, ids);

    console.log(`${ids.length}件のマンダラを削除しました`);
    showToast(`${ids.length}件削除しました`);

    // リストを再読み込み
    await loadAndDisplayMandaras(userId);
  } catch (error) {
    console.error('バッチ削除エラー:', error);
    alert('削除に失敗しました');
  }
}

// 使用例
document.getElementById('delete-selected-btn').addEventListener('click', () => {
  deleteSelectedMandaras('user_abc123');
});
```

### 4.2 全Mandaraの削除

```javascript
async function deleteAllMandaras(userId) {
  const mandaras = await Storage.loadAllMandaras(userId);

  if (mandaras.length === 0) {
    alert('削除するマンダラがありません');
    return;
  }

  if (!confirm(`全${mandaras.length}件のマンダラを削除しますか？\n\nこの操作は取り消せません。`)) {
    return;
  }

  // 二重確認
  if (!confirm('本当に全てのマンダラを削除しますか？')) {
    return;
  }

  try {
    const ids = mandaras.map(m => m.id);
    await Storage.deleteMandaras(userId, ids);

    console.log('全マンダラを削除しました');
    showToast('全て削除しました');

    // リストをクリア
    document.getElementById('mandara-list').innerHTML = '';
  } catch (error) {
    console.error('全削除エラー:', error);
    alert('削除に失敗しました');
  }
}
```

---

## 5. エラーハンドリング

### 5.1 基本的なエラーハンドリング

```javascript
async function safeLoadMandaras(userId) {
  try {
    const mandaras = await Storage.loadAllMandaras(userId);
    return mandaras;
  } catch (error) {
    console.error('読み込みエラー:', error);

    // エラーの種類に応じた処理
    if (error.code === 'permission-denied') {
      alert('アクセス権限がありません。再ログインしてください。');
      window.location.href = '/login.html';
    } else if (error.code === 'unavailable') {
      alert('ネットワークエラーが発生しました。接続を確認してください。');
    } else {
      alert('データの読み込みに失敗しました。');
    }

    return []; // 空配列を返す
  }
}
```

### 5.2 リトライ機能付きエラーハンドリング

```javascript
async function loadWithRetry(userId, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const mandaras = await Storage.loadAllMandaras(userId);
      console.log('読み込み成功');
      return mandaras;
    } catch (error) {
      console.error(`読み込み失敗 (${i + 1}/${maxRetries})`, error);

      if (i === maxRetries - 1) {
        // 最後の試行も失敗
        alert('データの読み込みに失敗しました。時間をおいて再度お試しください。');
        throw error;
      }

      // 1秒待ってリトライ
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
```

### 5.3 オフライン対応

```javascript
import { isOnlineMode } from './storage-service.js';

async function loadMandarasWithFallback(userId) {
  if (isOnlineMode()) {
    try {
      // オンラインモード: Firestoreから読み込み
      const mandaras = await Storage.loadAllMandaras(userId);

      // ローカルにバックアップ
      localStorage.setItem('mandaras_backup', JSON.stringify(mandaras));

      return mandaras;
    } catch (error) {
      console.error('Firestore読み込みエラー、バックアップから復元:', error);

      // バックアップから復元
      const backup = localStorage.getItem('mandaras_backup');
      if (backup) {
        showToast('オフラインモードで動作中');
        return JSON.parse(backup);
      }

      throw error;
    }
  } else {
    // ローカルモード
    return await Storage.loadAllMandaras(null);
  }
}
```

---

## 6. 実装パターン

### 6.1 検索・フィルター機能

```javascript
function filterMandaras(mandaras, searchQuery) {
  if (!searchQuery) return mandaras;

  const query = searchQuery.toLowerCase();

  return mandaras.filter(mandara => {
    // タイトルで検索
    if (mandara.title.toLowerCase().includes(query)) {
      return true;
    }

    // セルの内容で検索
    for (let i = 1; i <= 9; i++) {
      if (mandara.cells[i].toLowerCase().includes(query)) {
        return true;
      }
    }

    // タグで検索
    if (mandara.tags.some(tag => tag.toLowerCase().includes(query))) {
      return true;
    }

    // メモで検索
    if (mandara.memo.toLowerCase().includes(query)) {
      return true;
    }

    return false;
  });
}

// 使用例
document.getElementById('search-input').addEventListener('input', async (e) => {
  const allMandaras = await Storage.loadAllMandaras('user_abc123');
  const filtered = filterMandaras(allMandaras, e.target.value);
  displayMandaras(filtered);
});
```

### 6.2 ソート機能

```javascript
function sortMandaras(mandaras, sortBy) {
  const sorted = [...mandaras]; // コピーを作成

  switch (sortBy) {
    case 'updated-desc':
      return sorted.sort((a, b) =>
        new Date(b.updatedAt) - new Date(a.updatedAt)
      );

    case 'updated-asc':
      return sorted.sort((a, b) =>
        new Date(a.updatedAt) - new Date(b.updatedAt)
      );

    case 'created-desc':
      return sorted.sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
      );

    case 'created-asc':
      return sorted.sort((a, b) =>
        new Date(a.createdAt) - new Date(b.createdAt)
      );

    case 'title-asc':
      return sorted.sort((a, b) =>
        (a.title || '').localeCompare(b.title || '')
      );

    case 'title-desc':
      return sorted.sort((a, b) =>
        (b.title || '').localeCompare(a.title || '')
      );

    default:
      return sorted;
  }
}

// 使用例
document.getElementById('sort-select').addEventListener('change', async (e) => {
  const allMandaras = await Storage.loadAllMandaras('user_abc123');
  const sorted = sortMandaras(allMandaras, e.target.value);
  displayMandaras(sorted);
});
```

### 6.3 ページネーション

```javascript
function paginateMandaras(mandaras, page = 1, perPage = 20) {
  const start = (page - 1) * perPage;
  const end = start + perPage;

  return {
    items: mandaras.slice(start, end),
    totalPages: Math.ceil(mandaras.length / perPage),
    currentPage: page,
    totalItems: mandaras.length
  };
}

// 使用例
let currentPage = 1;

async function displayPage(page) {
  const allMandaras = await Storage.loadAllMandaras('user_abc123');
  const { items, totalPages } = paginateMandaras(allMandaras, page, 20);

  displayMandaras(items);
  updatePaginationUI(page, totalPages);
}

document.getElementById('next-page-btn').addEventListener('click', () => {
  currentPage++;
  displayPage(currentPage);
});

document.getElementById('prev-page-btn').addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    displayPage(currentPage);
  }
});
```

---

## 7. よくある実装例

### 7.1 初回ログイン時のデータ移行

```javascript
import { isOnlineMode } from './storage-service.js';
import { migrateFromLocalStorage } from './firestore-crud.js';

async function handleFirstLogin(userId) {
  if (!isOnlineMode()) return;

  try {
    // localStorageからFirestoreへ移行
    await migrateFromLocalStorage(userId);
    console.log('データ移行完了');
    showToast('ローカルデータを同期しました');
  } catch (error) {
    console.error('データ移行エラー:', error);
    alert('データ移行に失敗しました。手動でデータをバックアップしてください。');
  }
}

// 認証状態が変わったら実行
onAuthChange(async (user) => {
  if (user) {
    await handleFirstLogin(user.uid);
  }
});
```

### 7.2 オフライン・オンライン切り替え

```javascript
import { setStorageMode, isOnlineMode } from './storage-service.js';

async function switchToOnlineMode() {
  if (isOnlineMode()) {
    console.log('既にオンラインモードです');
    return;
  }

  // ログインページへ移動
  window.location.href = '/login.html';
}

async function switchToLocalMode() {
  if (!isOnlineMode()) {
    console.log('既にローカルモードです');
    return;
  }

  if (!confirm('ローカルモードに切り替えますか？\nオンラインデータは保持されます。')) {
    return;
  }

  // ローカルモードに切り替え
  setStorageMode('local');
  showToast('ローカルモードに切り替えました');

  // リロード
  window.location.reload();
}

// 使用例
document.getElementById('mode-switch-btn').addEventListener('click', () => {
  if (isOnlineMode()) {
    switchToLocalMode();
  } else {
    switchToOnlineMode();
  }
});
```

### 7.3 エクスポート機能

```javascript
async function exportMandarasAsJSON(userId) {
  try {
    const mandaras = await Storage.loadAllMandaras(userId);

    // JSON形式で出力
    const json = JSON.stringify(mandaras, null, 2);

    // ダウンロード
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mandaras_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('エクスポート完了');
  } catch (error) {
    console.error('エクスポートエラー:', error);
    alert('エクスポートに失敗しました');
  }
}

// 使用例
document.getElementById('export-btn').addEventListener('click', () => {
  exportMandarasAsJSON('user_abc123');
});
```

### 7.4 インポート機能

```javascript
async function importMandarasFromJSON(userId, file) {
  try {
    const text = await file.text();
    const mandaras = JSON.parse(text);

    if (!Array.isArray(mandaras)) {
      throw new Error('無効なフォーマットです');
    }

    if (!confirm(`${mandaras.length}件のマンダラをインポートしますか？`)) {
      return;
    }

    // 1件ずつ保存
    for (const mandara of mandaras) {
      await Storage.saveMandara(userId, mandara);
    }

    showToast(`${mandaras.length}件インポートしました`);

    // リロード
    await loadAndDisplayMandaras(userId);
  } catch (error) {
    console.error('インポートエラー:', error);
    alert('インポートに失敗しました');
  }
}

// 使用例
document.getElementById('import-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    importMandarasFromJSON('user_abc123', file);
  }
});
```

---

## まとめ

このガイドでは、4STROKEアプリケーションで使用するFirestore APIの実践的な使用例を紹介しました。

### 重要なポイント

1. **Storage.jsを使う**: モードに応じて自動的にLocalStorage/Firestoreを切り替え
2. **エラーハンドリング**: try-catchで適切にエラーを処理
3. **自動保存**: デバウンスを使って不要な保存を防ぐ
4. **バッチ操作**: 複数のドキュメントはバッチで処理して高速化
5. **オフライン対応**: ローカルバックアップを活用

詳細な仕様は [FIRESTORE_DB_STRUCTURE.md](./FIRESTORE_DB_STRUCTURE.md) を参照してください。
