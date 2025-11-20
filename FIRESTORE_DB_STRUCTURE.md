# Firestore データベース構造ドキュメント

## 概要

4STROKEアプリケーションはFirestoreをバックエンドデータベースとして使用し、ユーザーごとのGarageデータとMandaraデータを管理します。

## コレクション構造

```
firestore (root)
└── users/
    └── {userId}/                    # ユーザーID（Firebase Auth UID）
        ├── garages/                 # ガレージデータコレクション
        │   ├── garage1              # GARAGE-A
        │   ├── garage2              # GARAGE-B
        │   ├── garage3              # GARAGE-C
        │   └── garage4              # GARAGE-D
        │
        └── mandaras/                # マンダラデータコレクション
            ├── {mandaraId1}
            ├── {mandaraId2}
            └── ...
```

---

## 1. Garageデータスキーマ

### コレクションパス
```
users/{userId}/garages/{garageId}
```

### ドキュメントID
- `garage1` - GARAGE-A
- `garage2` - GARAGE-B
- `garage3` - GARAGE-C
- `garage4` - GARAGE-D

### データ構造
```typescript
interface GarageData {
  title: string;           // ガレージのタイトル
  stroke1: string;         // Key（1番目のストローク）
  stroke2: string;         // Issue（2番目のストローク）
  stroke3: string;         // Action（3番目のストローク）
  stroke4: string;         // Publish（4番目のストローク）
  updatedAt: Timestamp;    // 最終更新日時
}
```

### 例
```json
{
  "title": "プロジェクトA",
  "stroke1": "ユーザー体験を改善する",
  "stroke2": "読み込みが遅い",
  "stroke3": "キャッシュを実装",
  "stroke4": "パフォーマンス向上を発信",
  "updatedAt": "2024-01-20T12:00:00.000Z"
}
```

---

## 2. Mandaraデータスキーマ

### コレクションパス
```
users/{userId}/mandaras/{mandaraId}
```

### ドキュメントID
自動生成: `mandara_{timestamp}_{random}`

例: `mandara_1705750800000_k3j2h1g9f`

### データ構造
```typescript
interface MandaraData {
  id: string;                        // マンダラID
  title: string;                     // マンダラのタイトル
  cells: {                           // 9マスのセル
    1: string;
    2: string;
    3: string;
    4: string;
    5: string;                       // 中心セル
    6: string;
    7: string;
    8: string;
    9: string;
  };
  memo: string;                      // 備考メモ
  tags: string[];                    // タグ配列
  todos: Array<{                     // TODOリスト
    id: string;                      // TODO ID
    text: string;                    // TODO内容
    completed: boolean;              // 完了フラグ
  }>;
  linkedGarageId: string | null;     // 関連するガレージID（未実装）
  createdAt: Timestamp;              // 作成日時
  updatedAt: Timestamp;              // 更新日時
}
```

### 例
```json
{
  "id": "mandara_1705750800000_k3j2h1g9f",
  "title": "2024年の目標",
  "cells": {
    "1": "健康",
    "2": "仕事",
    "3": "学習",
    "4": "趣味",
    "5": "充実した人生",
    "6": "家族",
    "7": "友人",
    "8": "財務",
    "9": "旅行"
  },
  "memo": "バランスよく取り組む",
  "tags": ["2024", "目標", "ライフプラン"],
  "todos": [
    {
      "id": "todo_1705750801000",
      "text": "週3回の運動",
      "completed": false
    },
    {
      "id": "todo_1705750802000",
      "text": "月1冊の読書",
      "completed": true
    }
  ],
  "linkedGarageId": null,
  "createdAt": "2024-01-20T12:00:00.000Z",
  "updatedAt": "2024-01-20T15:30:00.000Z"
}
```

---

## 3. Firestore CRUD API

### ファイル: `js/firestore-crud.js`

全ての関数はPromiseを返し、async/awaitで使用します。

---

### 3.1 Garage関連API

#### `loadGarageData(userId, garageId)`
単一のガレージデータを読み込み

**パラメータ:**
- `userId`: string - ユーザーID
- `garageId`: string - ガレージID (`garage1-4` または `garageA-D`)

**戻り値:**
```typescript
Promise<GarageData>
```

**例:**
```javascript
const garage = await loadGarageData('user123', 'garage1');
console.log(garage.title); // "プロジェクトA"
```

---

#### `loadAllGarages(userId)`
全ガレージデータを並列読み込み（高速化）

**パラメータ:**
- `userId`: string - ユーザーID

**戻り値:**
```typescript
Promise<{
  garageA: GarageData;
  garageB: GarageData;
  garageC: GarageData;
  garageD: GarageData;
}>
```

**例:**
```javascript
const garages = await loadAllGarages('user123');
console.log(garages.garageA.title);
console.log(garages.garageB.title);
```

---

#### `saveStroke(userId, garageId, fieldKey, value)`
ストロークまたはタイトルを保存（merge: true）

**パラメータ:**
- `userId`: string - ユーザーID
- `garageId`: string - ガレージID
- `fieldKey`: string - フィールド名 (`title`, `stroke1`, `stroke2`, `stroke3`, `stroke4`)
- `value`: string - 保存する値

**戻り値:**
```typescript
Promise<void>
```

**例:**
```javascript
await saveStroke('user123', 'garage1', 'title', '新しいタイトル');
await saveStroke('user123', 'garage1', 'stroke1', 'キーワード');
```

---

#### `saveTitle(userId, garageId, title)`
タイトルを保存（saveStrokeのエイリアス）

**パラメータ:**
- `userId`: string - ユーザーID
- `garageId`: string - ガレージID
- `title`: string - タイトル

**戻り値:**
```typescript
Promise<void>
```

**例:**
```javascript
await saveTitle('user123', 'garage1', '新プロジェクト');
```

---

#### `deleteStroke(userId, garageId, fieldKey)`
ストロークを削除（空文字列で上書き）

**パラメータ:**
- `userId`: string - ユーザーID
- `garageId`: string - ガレージID
- `fieldKey`: string - フィールド名

**戻り値:**
```typescript
Promise<void>
```

**例:**
```javascript
await deleteStroke('user123', 'garage1', 'stroke2');
```

---

#### `deleteGarage(userId, garageId)`
ガレージ全体を削除（ドキュメント削除）

**パラメータ:**
- `userId`: string - ユーザーID
- `garageId`: string - ガレージID

**戻り値:**
```typescript
Promise<void>
```

**例:**
```javascript
await deleteGarage('user123', 'garage1');
```

---

### 3.2 Mandara関連API

#### `loadAllMandaras(userId)`
全マンダラデータを読み込み（更新日時降順）

**パラメータ:**
- `userId`: string - ユーザーID

**戻り値:**
```typescript
Promise<MandaraData[]>
```

**例:**
```javascript
const mandaras = await loadAllMandaras('user123');
console.log(`${mandaras.length}件のマンダラ`);
mandaras.forEach(m => console.log(m.title));
```

---

#### `loadMandara(userId, mandaraId)`
単一のマンダラデータを読み込み

**パラメータ:**
- `userId`: string - ユーザーID
- `mandaraId`: string - マンダラID

**戻り値:**
```typescript
Promise<MandaraData | null>
```

**例:**
```javascript
const mandara = await loadMandara('user123', 'mandara_123456_abc');
if (mandara) {
  console.log(mandara.title);
}
```

---

#### `saveMandara(userId, mandara)`
マンダラを保存（作成または更新）

**パラメータ:**
- `userId`: string - ユーザーID
- `mandara`: MandaraData - マンダラデータ

**戻り値:**
```typescript
Promise<void>
```

**挙動:**
- `createdAt`が無い場合は新規作成として追加
- 常に`updatedAt`を現在時刻で更新

**例:**
```javascript
const newMandara = {
  id: 'mandara_' + Date.now() + '_abc',
  title: '新しいマンダラ',
  cells: { 1: '', 2: '', 3: '', 4: '', 5: '中心', 6: '', 7: '', 8: '', 9: '' },
  memo: '',
  tags: [],
  todos: [],
  linkedGarageId: null
};
await saveMandara('user123', newMandara);
```

---

#### `deleteMandara(userId, mandaraId)`
マンダラを削除

**パラメータ:**
- `userId`: string - ユーザーID
- `mandaraId`: string - マンダラID

**戻り値:**
```typescript
Promise<void>
```

**例:**
```javascript
await deleteMandara('user123', 'mandara_123456_abc');
```

---

#### `deleteMandaras(userId, mandaraIds)` 🆕
複数のマンダラを一括削除（バッチ操作）

**パラメータ:**
- `userId`: string - ユーザーID
- `mandaraIds`: string[] - マンダラID配列

**戻り値:**
```typescript
Promise<void>
```

**特徴:**
- `writeBatch`を使用してアトミックに削除
- 500件までの制限あり（Firestoreの制限）

**例:**
```javascript
const ids = ['mandara_123_a', 'mandara_456_b', 'mandara_789_c'];
await deleteMandaras('user123', ids);
```

---

### 3.3 データ移行API

#### `migrateFromLocalStorage(userId)`
localStorage → Firestoreへデータ移行（初回のみ）

**パラメータ:**
- `userId`: string - ユーザーID

**戻り値:**
```typescript
Promise<void>
```

**挙動:**
- 移行済みフラグがあればスキップ
- `writeBatch`でアトミックに実行
- 完了後、localStorageに移行フラグを保存

**例:**
```javascript
// 初回ログイン時
await migrateFromLocalStorage('user123');
```

---

#### `backupToLocalStorage(userId)`
Firestore → localStorageへバックアップ（オプション）

**パラメータ:**
- `userId`: string - ユーザーID

**戻り値:**
```typescript
Promise<void>
```

**例:**
```javascript
await backupToLocalStorage('user123');
```

---

## 4. Storage Service（統合API）

### ファイル: `js/storage-service.js`

モードに応じて自動的にLocalStorageまたはFirestoreを使い分けます。

### モード管理

```javascript
import { getStorageMode, setStorageMode, isLocalMode, isOnlineMode } from './storage-service.js';

// 現在のモードを取得
const mode = getStorageMode(); // 'local' または 'online'

// モードを設定
setStorageMode('online');

// モードチェック
if (isOnlineMode()) {
  console.log('オンラインモード');
}
```

---

### 統合API

#### `Storage.loadAllGarages(userId)`
```javascript
import { Storage } from './storage-service.js';

const garages = await Storage.loadAllGarages(userId);
// ローカルモード: LocalStorage.loadAllGarages()
// オンラインモード: firestore-crud.loadAllGarages(userId)
```

#### `Storage.loadAllMandaras(userId)`
```javascript
const mandaras = await Storage.loadAllMandaras(userId);
// モードに応じて自動切替
```

#### `Storage.saveMandara(userId, mandara)`
```javascript
await Storage.saveMandara(userId, mandara);
// モードに応じて自動切替
```

#### `Storage.deleteMandara(userId, mandaraId)`
```javascript
await Storage.deleteMandara(userId, mandaraId);
// モードに応じて自動切替
```

#### `Storage.deleteMandaras(userId, mandaraIds)` 🆕
```javascript
await Storage.deleteMandaras(userId, mandaraIds);
// ローカルモード: LocalStorage.deleteMandaras(mandaraIds)
// オンラインモード: firestore-crud.deleteMandaras(userId, mandaraIds)
```

---

## 5. データフロー

### Garageデータフロー

```
ユーザー操作
    ↓
UI (main.html)
    ↓
app.js (イベントハンドラー)
    ↓
storage-service.js (モード判定)
    ↓
    ├─ ローカルモード → LocalStorage
    └─ オンラインモード → firestore-crud.js → Firestore
```

### Mandaraデータフロー

```
ユーザー操作
    ↓
UI (mandara.html)
    ↓
mandara.js (イベントハンドラー)
    ↓
storage-service.js (モード判定)
    ↓
    ├─ ローカルモード → LocalStorage
    └─ オンラインモード → firestore-crud.js → Firestore
```

---

## 6. エラーハンドリング

### Firestoreエラーコード

```javascript
try {
  await deleteMandara(userId, mandaraId);
} catch (error) {
  if (error.code === 'not-found') {
    // ドキュメントが存在しない
    console.log('既に削除されています');
  } else if (error.code === 'permission-denied') {
    // 権限エラー
    console.error('アクセス権限がありません');
  } else {
    // その他のエラー
    console.error('削除に失敗しました:', error);
  }
}
```

---

## 7. パフォーマンス最適化

### バッチ操作
複数のドキュメント操作を1つのバッチにまとめることで、ネットワークコストを削減：

```javascript
// ❌ 遅い（100回のネットワークリクエスト）
for (const id of mandaraIds) {
  await deleteMandara(userId, id);
}

// ✅ 速い（1回のバッチリクエスト）
await deleteMandaras(userId, mandaraIds);
```

### 並列読み込み
Promise.allで複数の読み込みを並列化：

```javascript
// loadAllGarages()内部
const [garage1, garage2, garage3, garage4] = await Promise.all([
  loadGarageData(userId, 'garage1'),
  loadGarageData(userId, 'garage2'),
  loadGarageData(userId, 'garage3'),
  loadGarageData(userId, 'garage4')
]);
```

---

## 8. セキュリティルール（推奨）

### Firestoreセキュリティルール例

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザーは自分のデータのみアクセス可能
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /garages/{garageId} {
        allow read, write: if request.auth.uid == userId;
      }

      match /mandaras/{mandaraId} {
        allow read, write: if request.auth.uid == userId;
      }
    }
  }
}
```

---

## 9. 制限事項

### Firestore制限
- ドキュメントサイズ: 1MB以内
- バッチ操作: 500件まで
- トランザクション: 500ドキュメントまで
- クエリ結果: デフォルト100件（ページネーション推奨）

### LocalStorage制限
- 容量: 約5-10MB（ブラウザ依存）
- 同期型API（非同期処理不可）
- ドメイン単位の共有ストレージ

---

## 10. トラブルシューティング

### Q: データが保存されない
A:
1. ストレージモードを確認: `getStorageMode()`
2. オンラインモードの場合、ログインしているか確認
3. ブラウザコンソールでエラーをチェック

### Q: Firestoreから読み込めない
A:
1. Firebase設定を確認: `js/firebase-config.js`
2. セキュリティルールを確認
3. ネットワーク接続を確認

### Q: バッチ削除が失敗する
A:
1. 削除件数が500件以下か確認
2. 全てのIDが存在するか確認（not-foundエラーは無視される）

---

## 11. デバッグツール

### ブラウザコンソールでのデバッグ

```javascript
// Mandaraデバッグ（mandara.htmlで使用可能）
window.mandaraDebug.logCurrentState();
window.mandaraDebug.getAllMandaras();
window.mandaraDebug.getLocalStorage();
window.mandaraDebug.forceSave();
window.mandaraDebug.clearAll(); // 注意: 全削除
```

---

## 更新履歴

- **2024-01-20**: 初版作成
  - Garage/Mandaraスキーマ定義
  - CRUD API仕様
  - バッチ削除API追加
