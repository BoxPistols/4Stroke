# 🎓 Firebase認証 + オンラインCRUD 完全ガイド

## 📖 目次
1. [全体概要](#全体概要)
2. [画面設計](#画面設計)
3. [データベース設計](#データベース設計)
4. [ファイル構成](#ファイル構成)
5. [実装コード全体](#実装コード全体)
6. [Firebase操作手順（画面付き）](#firebase操作手順)
7. [トラブルシューティング](#トラブルシューティング)

---

## 🏗️ 全体概要

### システム構成図

```
┌─────────────────────────────────────────────────────────────┐
│                      ユーザー（ブラウザ）                        │
│  ┌──────────────┐              ┌──────────────┐              │
│  │ログイン画面    │─────認証───→│メインアプリ    │              │
│  │login.html    │   成功後     │index.html    │              │
│  └──────────────┘              └──────────────┘              │
└────────────┬────────────────────────────┬────────────────────┘
             │                            │
             ↓                            ↓
    ┌────────────────┐          ┌────────────────┐
    │ Firebase Auth  │          │   Firestore    │
    │ ・Googleログイン │          │  ・ユーザーデータ │
    │ ・Email/Pass   │          │  ・CRUD操作     │
    └────────────────┘          └────────────────┘
             ↑                            ↑
             └────────────────────────────┘
                   Firebase SDK
```

### 認証フロー

```
[未ログイン] → [login.html表示]
                    │
                    ├─→ [Googleログイン] ─→ [認証成功]
                    │                          │
                    └─→ [Email/Passログイン] ──┘
                                              │
                                              ↓
                                    [index.html へリダイレクト]
                                              │
                                              ↓
                                    [Firestoreからデータ読み込み]
                                              │
                                              ↓
                                    [メインアプリ表示]
```

### データフロー

```
[ユーザー入力]
      │
      ↓
[デバウンス処理] ← 連続入力を500ms待つ
      │
      ↓
[Firestore保存]
      │
      ├─→ [成功] → "Auto saved" 表示
      │
      └─→ [失敗] → エラー表示
```

---

## 🎨 画面設計

### 1. ログイン画面 (login.html)

```
┌───────────────────────────────────────────┐
│                                           │
│         🔥 4STROKES                       │
│         ログインしてください                │
│                                           │
│   ┌─────────────────────────────────┐    │
│   │  📧 メールアドレス               │    │
│   └─────────────────────────────────┘    │
│   ┌─────────────────────────────────┐    │
│   │  🔒 パスワード                   │    │
│   └─────────────────────────────────┘    │
│                                           │
│   [ ログイン ]  [ 新規登録 ]              │
│                                           │
│   ─────────── または ───────────          │
│                                           │
│   [  🌐 Googleでログイン  ]               │
│                                           │
│   エラーメッセージ表示エリア               │
│                                           │
└───────────────────────────────────────────┘
```

### 2. メイン画面 (index.html) - ログイン後

```
┌───────────────────────────────────────────────────────┐
│  4STROKES        Auto saved   👤user@example.com      │
│                                    [ログアウト]        │
├───────────────────────────────────────────────────────┤
│  [GARAGE A] [GARAGE B] [GARAGE C] [GARAGE D]          │
├───────────────────────────────────────────────────────┤
│                                                       │
│  ┌─ GARAGE A ────────────────┐                       │
│  │ タイトル: [______________] [×]                    │
│  │                                                   │
│  │ ┌─ Key ─────────────────┐ [×]                    │
│  │ │                       │                        │
│  │ └───────────────────────┘                        │
│  │                                                   │
│  │ ┌─ Issue ───────────────┐ [×]                    │
│  │ │                       │                        │
│  │ └───────────────────────┘                        │
│  │                                                   │
│  │ ┌─ Action ──────────────┐ [×]                    │
│  │ │                       │                        │
│  │ └───────────────────────┘                        │
│  │                                                   │
│  │ ┌─ Publish ─────────────┐ [×]                    │
│  │ │                       │                        │
│  │ └───────────────────────┘                        │
│  │                                                   │
│  │ [このガレージを削除]                               │
│  └───────────────────────────┘                       │
│                                                       │
└───────────────────────────────────────────────────────┘
```

---

## 🗄️ データベース設計

### Firestore コレクション構造

```
users (collection)
  └── {userId} (document)
      ├── profile (sub-collection)
      │   └── info (document)
      │       ├── email: string
      │       ├── displayName: string
      │       └── createdAt: timestamp
      │
      └── garages (sub-collection)
          ├── garage1 (document)
          │   ├── title: string
          │   ├── stroke1: string (Key)
          │   ├── stroke2: string (Issue)
          │   ├── stroke3: string (Action)
          │   ├── stroke4: string (Publish)
          │   └── updatedAt: timestamp
          │
          ├── garage2 (document)
          ├── garage3 (document)
          └── garage4 (document)
```

### 具体的なデータ例

```json
{
  "users": {
    "abc123userId": {
      "profile": {
        "info": {
          "email": "user@example.com",
          "displayName": "山田太郎",
          "createdAt": "2025-11-08T10:00:00Z"
        }
      },
      "garages": {
        "garage1": {
          "title": "新規プロジェクト",
          "stroke1": "目標を明確にする",
          "stroke2": "どんな問題があるか？",
          "stroke3": "次に何をする？",
          "stroke4": "結果を共有する",
          "updatedAt": "2025-11-08T10:30:00Z"
        },
        "garage2": { /* ... */ },
        "garage3": { /* ... */ },
        "garage4": { /* ... */ }
      }
    }
  }
}
```

---

## 📁 ファイル構成

### 追加・変更ファイル一覧

```
/home/user/4Stroke/
├── 🆕 login.html                    # ログイン画面
├── 🔄 index.html                    # メイン画面（ヘッダー修正）
│
├── js/
│   ├── 🔄 app.js                    # 既存（Firestore連携に変更）
│   ├── 🆕 firebase-config.js        # Firebase設定
│   ├── 🆕 auth.js                   # 認証ロジック
│   └── 🆕 firestore-crud.js         # Firestore CRUD操作
│
├── structure/
│   ├── 🆕 login.pug                 # ログイン画面テンプレート
│   └── 🔄 _title.pug                # ヘッダー（ユーザー情報追加）
│
├── styles/
│   ├── 🔄 style.scss                # 既存（auth追加）
│   └── 🆕 _auth.scss                # 認証画面スタイル
│
└── docs/
    └── 🆕 FIREBASE_SETUP_GUIDE.md   # このガイド
```

---

## 💻 実装コード全体

### 1️⃣ firebase-config.js (新規)

**ファイルパス**: `/js/firebase-config.js`

```javascript
// Firebase SDK v10 (モジュール版)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// TODO: Firebaseコンソールから取得した設定を貼り付け
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Firebaseアプリ初期化
const app = initializeApp(firebaseConfig);

// 認証とFirestoreのインスタンス
export const auth = getAuth(app);
export const db = getFirestore(app);
```

**学習ポイント**:
- `initializeApp`: Firebaseアプリを初期化
- `getAuth`: 認証サービスを取得
- `getFirestore`: データベースサービスを取得
- `export`: 他のファイルで使えるようにエクスポート

---

### 2️⃣ auth.js (新規)

**ファイルパス**: `/js/auth.js`

```javascript
import { auth } from './firebase-config.js';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Googleログイン
export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    console.log('Google ログイン成功:', result.user);
    return result.user;
  } catch (error) {
    console.error('Google ログイン失敗:', error);
    throw error;
  }
}

// メール+パスワードでログイン
export async function loginWithEmail(email, password) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    console.log('メールログイン成功:', result.user);
    return result.user;
  } catch (error) {
    console.error('メールログイン失敗:', error);
    throw error;
  }
}

// 新規ユーザー登録
export async function registerWithEmail(email, password) {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    console.log('新規登録成功:', result.user);
    return result.user;
  } catch (error) {
    console.error('新規登録失敗:', error);
    throw error;
  }
}

// ログアウト
export async function logout() {
  try {
    await signOut(auth);
    console.log('ログアウト成功');
  } catch (error) {
    console.error('ログアウト失敗:', error);
    throw error;
  }
}

// 認証状態の監視
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
}

// 現在のユーザーを取得
export function getCurrentUser() {
  return auth.currentUser;
}
```

**学習ポイント**:
- `signInWithPopup`: Googleログインのポップアップを表示
- `signInWithEmailAndPassword`: メール+パスワードでログイン
- `createUserWithEmailAndPassword`: 新規ユーザー作成
- `onAuthStateChanged`: ログイン状態の変化を監視（超重要！）
- `async/await`: 非同期処理を同期的に書く

---

### 3️⃣ firestore-crud.js (新規)

**ファイルパス**: `/js/firestore-crud.js`

```javascript
import { db } from './firebase-config.js';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ユーザーのドキュメント参照を取得
function getUserDocRef(userId, garageId) {
  return doc(db, 'users', userId, 'garages', garageId);
}

// ガレージデータを読み込み
export async function loadGarageData(userId, garageId) {
  try {
    const docRef = getUserDocRef(userId, garageId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      // データが存在しない場合は空データを返す
      return {
        title: '',
        stroke1: '',
        stroke2: '',
        stroke3: '',
        stroke4: '',
        updatedAt: new Date()
      };
    }
  } catch (error) {
    console.error('データ読み込み失敗:', error);
    throw error;
  }
}

// 全ガレージデータを読み込み
export async function loadAllGarages(userId) {
  const garages = {};
  for (let i = 1; i <= 4; i++) {
    garages[`garage${i}`] = await loadGarageData(userId, `garage${i}`);
  }
  return garages;
}

// ストロークを保存（1つだけ）
export async function saveStroke(userId, garageId, strokeKey, value) {
  try {
    const docRef = getUserDocRef(userId, garageId);
    await updateDoc(docRef, {
      [strokeKey]: value,
      updatedAt: new Date()
    });
    console.log('保存成功:', garageId, strokeKey);
  } catch (error) {
    // ドキュメントが存在しない場合は新規作成
    if (error.code === 'not-found') {
      await setDoc(docRef, {
        title: '',
        stroke1: '',
        stroke2: '',
        stroke3: '',
        stroke4: '',
        [strokeKey]: value,
        updatedAt: new Date()
      });
    } else {
      console.error('保存失敗:', error);
      throw error;
    }
  }
}

// タイトルを保存
export async function saveTitle(userId, garageId, title) {
  return saveStroke(userId, garageId, 'title', title);
}

// ストロークを削除（空文字列で上書き）
export async function deleteStroke(userId, garageId, strokeKey) {
  return saveStroke(userId, garageId, strokeKey, '');
}

// ガレージ全体を削除
export async function deleteGarage(userId, garageId) {
  try {
    const docRef = getUserDocRef(userId, garageId);
    await setDoc(docRef, {
      title: '',
      stroke1: '',
      stroke2: '',
      stroke3: '',
      stroke4: '',
      updatedAt: new Date()
    });
    console.log('ガレージ削除成功:', garageId);
  } catch (error) {
    console.error('ガレージ削除失敗:', error);
    throw error;
  }
}

// localStorage → Firestore 移行（初回ログイン時のみ）
export async function migrateFromLocalStorage(userId) {
  const migrationKey = 'firestore_migrated';

  // すでに移行済みかチェック
  if (localStorage.getItem(migrationKey)) {
    console.log('すでに移行済み');
    return;
  }

  console.log('localStorageからFirestoreへ移行開始...');

  try {
    // 4つのガレージをループ
    for (let garageNum = 1; garageNum <= 4; garageNum++) {
      const garageId = `garage${garageNum}`;
      const garageData = {
        title: localStorage.getItem(`stroke-title${garageNum}`) || '',
        stroke1: localStorage.getItem(`stroke${(garageNum - 1) * 4 + 1}`) || '',
        stroke2: localStorage.getItem(`stroke${(garageNum - 1) * 4 + 2}`) || '',
        stroke3: localStorage.getItem(`stroke${(garageNum - 1) * 4 + 3}`) || '',
        stroke4: localStorage.getItem(`stroke${(garageNum - 1) * 4 + 4}`) || '',
        updatedAt: new Date()
      };

      // Firestoreに保存
      const docRef = getUserDocRef(userId, garageId);
      await setDoc(docRef, garageData);
      console.log(`${garageId} 移行完了`);
    }

    // 移行完了フラグを保存
    localStorage.setItem(migrationKey, 'true');
    console.log('移行完了！');
  } catch (error) {
    console.error('移行失敗:', error);
    throw error;
  }
}
```

**学習ポイント**:
- `doc()`: ドキュメントの参照を取得
- `getDoc()`: ドキュメントを読み込み
- `setDoc()`: ドキュメントを新規作成/上書き
- `updateDoc()`: 既存ドキュメントの一部を更新
- Firestoreのパス: `users/{userId}/garages/{garageId}`

---

### 4️⃣ login.html (新規)

**ファイルパス**: `/login.html`

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ログイン - 4STROKES</title>
  <link rel="stylesheet" href="dist/style.css">
  <style>
    /* ログイン画面専用スタイル */
    body {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .login-container {
      background: white;
      padding: 3rem;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      width: 100%;
      max-width: 400px;
    }

    .login-title {
      text-align: center;
      margin-bottom: 2rem;
      color: #333;
      font-size: 2rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      color: #555;
      font-weight: 500;
    }

    .form-group input {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #ddd;
      border-radius: 6px;
      font-size: 1rem;
      transition: border-color 0.3s;
    }

    .form-group input:focus {
      outline: none;
      border-color: #667eea;
    }

    .btn {
      width: 100%;
      padding: 0.75rem;
      border: none;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
    }

    .btn-primary {
      background: #667eea;
      color: white;
      margin-bottom: 1rem;
    }

    .btn-primary:hover {
      background: #5568d3;
    }

    .btn-secondary {
      background: #f3f4f6;
      color: #333;
      margin-bottom: 1rem;
    }

    .btn-secondary:hover {
      background: #e5e7eb;
    }

    .btn-google {
      background: #4285f4;
      color: white;
    }

    .btn-google:hover {
      background: #357ae8;
    }

    .divider {
      text-align: center;
      margin: 1.5rem 0;
      color: #999;
      position: relative;
    }

    .divider::before,
    .divider::after {
      content: '';
      position: absolute;
      top: 50%;
      width: 40%;
      height: 1px;
      background: #ddd;
    }

    .divider::before {
      left: 0;
    }

    .divider::after {
      right: 0;
    }

    .error-message {
      background: #fee;
      color: #c33;
      padding: 0.75rem;
      border-radius: 6px;
      margin-bottom: 1rem;
      display: none;
    }

    .error-message.show {
      display: block;
    }

    .toggle-form {
      text-align: center;
      margin-top: 1rem;
      color: #666;
    }

    .toggle-form a {
      color: #667eea;
      text-decoration: none;
      font-weight: 600;
    }

    .toggle-form a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="login-container">
    <h1 class="login-title">🔥 4STROKES</h1>

    <div id="error-message" class="error-message"></div>

    <!-- ログインフォーム -->
    <form id="login-form">
      <div class="form-group">
        <label for="login-email">📧 メールアドレス</label>
        <input type="email" id="login-email" required autocomplete="email">
      </div>
      <div class="form-group">
        <label for="login-password">🔒 パスワード</label>
        <input type="password" id="login-password" required autocomplete="current-password">
      </div>
      <button type="submit" class="btn btn-primary">ログイン</button>
      <button type="button" id="show-register" class="btn btn-secondary">新規登録</button>
    </form>

    <!-- 新規登録フォーム（初期非表示） -->
    <form id="register-form" style="display: none;">
      <div class="form-group">
        <label for="register-email">📧 メールアドレス</label>
        <input type="email" id="register-email" required autocomplete="email">
      </div>
      <div class="form-group">
        <label for="register-password">🔒 パスワード（6文字以上）</label>
        <input type="password" id="register-password" required minlength="6" autocomplete="new-password">
      </div>
      <button type="submit" class="btn btn-primary">登録</button>
      <button type="button" id="show-login" class="btn btn-secondary">ログインに戻る</button>
    </form>

    <div class="divider">または</div>

    <button id="google-login" class="btn btn-google">
      🌐 Googleでログイン
    </button>
  </div>

  <script type="module">
    import { loginWithGoogle, loginWithEmail, registerWithEmail } from './js/auth.js';

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const errorMessage = document.getElementById('error-message');
    const googleLoginBtn = document.getElementById('google-login');
    const showRegisterBtn = document.getElementById('show-register');
    const showLoginBtn = document.getElementById('show-login');

    // エラー表示
    function showError(message) {
      errorMessage.textContent = message;
      errorMessage.classList.add('show');
      setTimeout(() => {
        errorMessage.classList.remove('show');
      }, 5000);
    }

    // ログイン成功時
    function onLoginSuccess() {
      window.location.href = '/index.html';
    }

    // Googleログイン
    googleLoginBtn.addEventListener('click', async () => {
      try {
        await loginWithGoogle();
        onLoginSuccess();
      } catch (error) {
        showError('Googleログインに失敗しました: ' + error.message);
      }
    });

    // メールログイン
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;

      try {
        await loginWithEmail(email, password);
        onLoginSuccess();
      } catch (error) {
        showError('ログインに失敗しました: ' + error.message);
      }
    });

    // 新規登録
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('register-email').value;
      const password = document.getElementById('register-password').value;

      try {
        await registerWithEmail(email, password);
        onLoginSuccess();
      } catch (error) {
        showError('登録に失敗しました: ' + error.message);
      }
    });

    // フォーム切り替え
    showRegisterBtn.addEventListener('click', () => {
      loginForm.style.display = 'none';
      registerForm.style.display = 'block';
    });

    showLoginBtn.addEventListener('click', () => {
      registerForm.style.display = 'none';
      loginForm.style.display = 'block';
    });
  </script>
</body>
</html>
```

**学習ポイント**:
- `type="module"`: ES6モジュールを使用
- `e.preventDefault()`: フォームのデフォルト送信を防ぐ
- エラーハンドリングとユーザーへのフィードバック

---

### 5️⃣ app.js の変更箇所 (既存ファイルを修正)

**ファイルパス**: `/js/app.js`

**ファイル先頭に追加**:

```javascript
// Firebase関連のインポート
import { onAuthChange, getCurrentUser, logout } from './auth.js';
import {
  loadAllGarages,
  saveStroke,
  saveTitle,
  deleteStroke,
  deleteGarage,
  migrateFromLocalStorage
} from './firestore-crud.js';

// デバウンス用のタイマー
let saveTimer = null;

// 認証状態チェック
onAuthChange(async (user) => {
  if (!user) {
    // ログインしていない場合はログイン画面へ
    window.location.href = '/login.html';
    return;
  }

  console.log('ログイン中:', user.email);

  // ユーザー情報を表示
  const userEmailElement = document.getElementById('user-email');
  if (userEmailElement) {
    userEmailElement.textContent = user.email;
  }

  // localStorage → Firestore 移行（初回のみ）
  await migrateFromLocalStorage(user.uid);

  // Firestoreからデータ読み込み
  await loadDataFromFirestore(user.uid);
});

// Firestoreからデータ読み込み
async function loadDataFromFirestore(userId) {
  try {
    const garages = await loadAllGarages(userId);

    // 画面に反映
    for (let i = 1; i <= 4; i++) {
      const garage = garages[`garage${i}`];

      // タイトル
      const titleInput = document.querySelector(`#garage${i} .stroke-title`);
      if (titleInput) {
        titleInput.value = garage.title || '';
      }

      // ストローク
      for (let j = 1; j <= 4; j++) {
        const strokeIndex = (i - 1) * 4 + j;
        const textarea = document.querySelectorAll('textarea.stroke')[strokeIndex - 1];
        if (textarea) {
          textarea.value = garage[`stroke${j}`] || '';
        }
      }
    }

    console.log('データ読み込み完了');
  } catch (error) {
    console.error('データ読み込みエラー:', error);
  }
}
```

**既存のイベントリスナーを変更**:

```javascript
// テキストエリアの保存処理を変更
handleTextArea.forEach((elm, i) => {
  elm.addEventListener("keyup", (event) => {
    const user = getCurrentUser();
    if (!user) return;

    // デバウンス処理（500ms待つ）
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const garageNum = Math.floor(i / 4) + 1;
      const strokeNum = (i % 4) + 1;
      const garageId = `garage${garageNum}`;
      const strokeKey = `stroke${strokeNum}`;

      try {
        await saveStroke(user.uid, garageId, strokeKey, event.target.value);
        autoSave(); // 保存完了メッセージ表示
      } catch (error) {
        console.error('保存エラー:', error);
      }
    }, 500);
  });
});

// タイトル保存処理を変更
const titleInputs = document.querySelectorAll('.stroke-title');
titleInputs.forEach((input, i) => {
  input.addEventListener("keyup", (event) => {
    const user = getCurrentUser();
    if (!user) return;

    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const garageId = `garage${i + 1}`;
      try {
        await saveTitle(user.uid, garageId, event.target.value);
        autoSave();
      } catch (error) {
        console.error('タイトル保存エラー:', error);
      }
    }, 500);
  });
});

// 削除処理を変更
clearBtns.forEach((btn, i) => {
  btn.addEventListener("click", async () => {
    const user = getCurrentUser();
    if (!user) return;

    const garageNum = Math.floor(i / 4) + 1;
    const strokeNum = (i % 4) + 1;
    const garageId = `garage${garageNum}`;
    const strokeKey = `stroke${strokeNum}`;

    try {
      await deleteStroke(user.uid, garageId, strokeKey);
      handleTextArea[i].value = "";
      autoSave();
    } catch (error) {
      console.error('削除エラー:', error);
    }
  });
});

// ガレージ削除処理を変更
const garageClearBtns = document.querySelectorAll('#clearA, #clearB, #clearC, #clearD');
garageClearBtns.forEach((btn, garageIndex) => {
  btn.addEventListener("click", async () => {
    const user = getCurrentUser();
    if (!user) return;

    const garageId = `garage${garageIndex + 1}`;

    if (confirm(`GARAGE ${String.fromCharCode(65 + garageIndex)} を削除しますか？`)) {
      try {
        await deleteGarage(user.uid, garageId);

        // 画面もクリア
        const startIndex = garageIndex * 4;
        for (let i = startIndex; i < startIndex + 4; i++) {
          handleTextArea[i].value = "";
        }

        // タイトルもクリア
        const titleInput = titleInputs[garageIndex];
        if (titleInput) {
          titleInput.value = "";
        }

        autoSave();
      } catch (error) {
        console.error('ガレージ削除エラー:', error);
      }
    }
  });
});

// ログアウトボタン
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    if (confirm('ログアウトしますか？')) {
      await logout();
      window.location.href = '/login.html';
    }
  });
}
```

---

### 6️⃣ index.html の変更箇所

**`<head>` セクションに追加**:

```html
<!-- Firebase SDK (モジュール版) -->
<script type="module" src="js/firebase-config.js"></script>
```

**`<header>` セクションに追加**:

```html
<div class="user-info">
  <span id="user-email">読み込み中...</span>
  <button id="logout-btn" class="btn-logout">ログアウト</button>
</div>
```

---

## 🖥️ Firebase操作手順（画面ベース）

### Step 1: Firebaseプロジェクト作成

#### 1-1. Firebaseコンソールにアクセス

ブラウザで以下のURLを開く：
```
https://console.firebase.google.com/
```

#### 1-2. 「プロジェクトを追加」をクリック

```
┌────────────────────────────────────────┐
│  Firebase Console                      │
├────────────────────────────────────────┤
│                                        │
│  [+ プロジェクトを追加]                  │
│                                        │
└────────────────────────────────────────┘
```

#### 1-3. プロジェクト名を入力

```
┌────────────────────────────────────────┐
│  プロジェクト名を入力                    │
├────────────────────────────────────────┤
│  プロジェクト名:                        │
│  [4strokes-online          ]           │
│                                        │
│  プロジェクトID:                        │
│  4strokes-online-xxxxx (自動生成)      │
│                                        │
│         [続行]                         │
└────────────────────────────────────────┘
```

**入力内容**:
- プロジェクト名: `4strokes-online`
- ☑ 規約に同意
- 「続行」をクリック

#### 1-4. Google Analytics設定

```
┌────────────────────────────────────────┐
│  Google Analyticsを有効にしますか?       │
├────────────────────────────────────────┤
│  ○ 有効にする                          │
│  ● 今は設定しない ← 推奨               │
│                                        │
│         [続行]                         │
└────────────────────────────────────────┘
```

「今は設定しない」を選択 → 「続行」

#### 1-5. プロジェクト作成完了を待つ（30秒〜1分）

---

### Step 2: Webアプリの追加

#### 2-1. プロジェクトダッシュボードで「</>」(Web)アイコンをクリック

```
┌────────────────────────────────────────┐
│  アプリを追加して利用を開始しましょう    │
│                                        │
│   [iOS]  [Android]  [</>]  [Unity]    │
│                      ↑                 │
│                  ここをクリック          │
└────────────────────────────────────────┘
```

#### 2-2. アプリのニックネームを入力

```
┌────────────────────────────────────────┐
│  アプリのニックネーム:                  │
│  [4strokes-web         ]               │
│                                        │
│  ☐ Firebase Hostingも設定（不要）      │
│                                        │
│         [アプリを登録]                  │
└────────────────────────────────────────┘
```

#### 2-3. Firebase設定をコピー

```
┌────────────────────────────────────────┐
│  const firebaseConfig = {              │
│    apiKey: "AIza....",                 │
│    authDomain: "4strokes-online.fi...",│
│    projectId: "4strokes-online",       │
│    storageBucket: "4strokes-onlin...", │
│    messagingSenderId: "123456789",     │
│    appId: "1:123456:web:abcdef"        │
│  };                                    │
│                                        │
│  [📋 構成をコピー]                      │
└────────────────────────────────────────┘
```

**👉 この設定を `firebase-config.js` に貼り付け！**

---

### Step 3: 認証を有効化

#### 3-1. 左メニューから「Authentication」をクリック

```
┌────────────────────────────────────────┐
│  🔧 ビルド                             │
│    └─ 🔐 Authentication    ← ここ      │
└────────────────────────────────────────┘
```

#### 3-2. 「始める」をクリック

#### 3-3. 「Google」を選択して有効化

```
┌────────────────────────────────────────┐
│  Google                                │
├────────────────────────────────────────┤
│  ☑ 有効にする                          │
│                                        │
│  プロジェクトの公開名:                  │
│  [4strokes-online         ]            │
│                                        │
│  サポートメール:                        │
│  [your-email@gmail.com ]               │
│                                        │
│         [保存]                         │
└────────────────────────────────────────┘
```

#### 3-4. 同様に「メール/パスワード」も有効化

```
┌────────────────────────────────────────┐
│  メール/パスワード                      │
├────────────────────────────────────────┤
│  ☑ 有効にする                          │
│                                        │
│         [保存]                         │
└────────────────────────────────────────┘
```

---

### Step 4: Firestoreデータベース作成

#### 4-1. 左メニューから「Firestore Database」をクリック

#### 4-2. 「データベースの作成」をクリック

#### 4-3. セキュリティルールを選択

```
┌────────────────────────────────────────┐
│  ● テストモードで開始 ← 推奨           │
│     (開発中は便利)                     │
│                                        │
│  ○ 本番環境モードで開始                │
│                                        │
│         [次へ]                         │
└────────────────────────────────────────┘
```

#### 4-4. ロケーションを選択

```
┌────────────────────────────────────────┐
│  [asia-northeast1 (Tokyo)  ▼]         │
│                                        │
│         [有効にする]                    │
└────────────────────────────────────────┘
```

#### 4-5. セキュリティルールを更新（重要！）

データベース作成後、「ルール」タブをクリック：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザーは自分のデータのみアクセス可能
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

「公開」ボタンをクリックして保存

---

## 🧪 動作確認手順

### 1. ローカルサーバー起動

```bash
# Python 3を使う場合
python3 -m http.server 8000

# Node.jsを使う場合
npx http-server -p 8000
```

### 2. ブラウザでアクセス

```
http://localhost:8000/login.html
```

### 3. テストシナリオ

#### シナリオ1: Googleログイン
1. 「Googleでログイン」ボタンをクリック
2. Googleアカウントを選択
3. `index.html` にリダイレクト
4. ヘッダーにメールアドレスが表示される

#### シナリオ2: メール登録
1. 「新規登録」ボタンをクリック
2. メールとパスワードを入力
3. 「登録」ボタンをクリック
4. ログイン成功

#### シナリオ3: データ保存
1. テキストエリアに入力
2. 500ms後に「Auto saved」と表示
3. Firebaseコンソールで確認

#### シナリオ4: データ読み込み
1. ログアウト
2. 再度ログイン
3. 前回入力したデータが表示される

---

## 🐛 トラブルシューティング

### エラー1: `Firebase: Error (auth/configuration-not-found)`

**原因**: Firebase設定が正しくない

**解決策**:
- `firebase-config.js` の設定を確認
- Firebaseコンソールから正確にコピー

### エラー2: `CORS error`

**原因**: `file://` プロトコルで開いている

**解決策**:
```bash
# 必ずローカルサーバーを使う
python3 -m http.server 8000
```

### エラー3: `Permission denied`

**原因**: Firestoreのセキュリティルールが厳しい

**解決策**:
- Firestoreルールを確認
- `request.auth != null` を確認
- ユーザーIDが一致しているか確認

### エラー4: データが保存されない

**原因**:
- 認証されていない
- ドキュメントパスが間違っている

**解決策**:
- Console.log でユーザー情報を確認
- Firestoreコンソールでパスを確認

---

## 📚 学習ステップまとめ

### Phase 1: Firebase準備 (15分)
- [x] Firebaseプロジェクト作成
- [x] Webアプリ登録
- [x] `firebase-config.js` 作成

### Phase 2: 認証実装 (30分)
- [ ] `auth.js` 作成
- [ ] `login.html` 作成
- [ ] Googleログイン実装

### Phase 3: Firestore読み込み (20分)
- [ ] `firestore-crud.js` 作成
- [ ] データ読み込み機能

### Phase 4: Firestore保存 (30分)
- [ ] データ保存機能
- [ ] デバウンス処理

### Phase 5: 削除機能 (15分)
- [ ] ストローク削除
- [ ] ガレージ削除

### Phase 6: メール認証 (40分)
- [ ] 登録フォーム
- [ ] ログインフォーム

### Phase 7: データ移行 (20分)
- [ ] localStorage → Firestore
- [ ] 移行フラグ管理

### Phase 8: UI改善 (30分)
- [ ] ローディング表示
- [ ] エラーハンドリング

---

## 📝 次のステップ

1. **Step 1を完了**: Firebase設定を取得
2. **Step 2**: `firebase-config.js` を作成
3. **Step 3**: `auth.js` と `login.html` を作成
4. **Step 4**: 認証テスト
5. **Step 5以降**: CRUD機能実装

---

## 🔗 参考リンク

- [Firebase公式ドキュメント](https://firebase.google.com/docs)
- [Firebase Auth ガイド](https://firebase.google.com/docs/auth)
- [Firestore ガイド](https://firebase.google.com/docs/firestore)
- [JavaScript async/await](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/async_function)

---

**最終更新**: 2025-11-08
**作成者**: Claude Code
**プロジェクト**: 4STROKES Online Auth & CRUD
