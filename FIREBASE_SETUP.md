# Firebase セットアップガイド（Mandara機能用）

## 概要
4Stroke Mandara機能を使用するには、Firestoreのセキュリティルールとインデックスを設定する必要があります。

## 前提条件
- Firebase CLIがインストールされていること
- Firebaseプロジェクト（`strokes-a0b62`）にアクセス権があること

## セットアップ手順

### 1. Firebase CLIのインストール（未インストールの場合）

```bash
npm install -g firebase-tools
```

### 2. Firebaseにログイン

```bash
firebase login
```

### 3. Firebaseプロジェクトの初期化（初回のみ）

プロジェクトのルートディレクトリで実行：

```bash
firebase init
```

以下を選択：
- **Firestore**: Configure security rules and indexes files
- 既存のプロジェクト: `strokes-a0b62`
- Firestore rules file: `firestore.rules` (デフォルト)
- Firestore indexes file: `firestore.indexes.json` (デフォルト)

### 4. セキュリティルールのデプロイ

```bash
firebase deploy --only firestore:rules
```

### 5. インデックスのデプロイ

```bash
firebase deploy --only firestore:indexes
```

## データ構造

### Mandarasコレクション

```
users/{userId}/mandaras/{mandaraId}
  ├── id: string
  ├── title: string
  ├── cells: {
  │     1: string,
  │     2: string,
  │     3: string,
  │     4: string,
  │     5: string (中心),
  │     6: string,
  │     7: string,
  │     8: string,
  │     9: string
  │   }
  ├── memo: string
  ├── tags: string[]
  ├── todos: {
  │     id: string,
  │     text: string,
  │     completed: boolean
  │   }[]
  ├── linkedGarageId: string | null
  ├── createdAt: timestamp
  └── updatedAt: timestamp
```

## セキュリティルール

- ユーザーは自分のMandaraデータのみ読み書き可能
- 認証が必要（`request.auth.uid == userId`）
- データ構造の検証あり

## インデックス

以下のクエリをサポート：
- `updatedAt` 降順（デフォルトのリスト表示）
- `createdAt` 降順（作成日順）
- `title` 昇順（タイトル順）

## トラブルシューティング

### エラー: "Missing or insufficient permissions"
→ セキュリティルールが正しくデプロイされているか確認

```bash
firebase deploy --only firestore:rules
```

### エラー: "The query requires an index"
→ インデックスが作成されていない可能性があります

```bash
firebase deploy --only firestore:indexes
```

または、Firebaseコンソールのエラーメッセージにあるリンクから自動作成できます。

### ローカルモードでテスト

オンラインモードを使わずにローカルストレージでテストする場合：
1. `login.html`で「Local Mode」を選択
2. Firebaseの設定は不要

## 確認方法

1. Firebaseコンソール（https://console.firebase.google.com/）を開く
2. プロジェクト `strokes-a0b62` を選択
3. **Firestore Database** → **ルール** でセキュリティルールを確認
4. **Firestore Database** → **インデックス** でインデックスを確認

## 参考リンク

- [Firebase Console](https://console.firebase.google.com/)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firestore Indexes](https://firebase.google.com/docs/firestore/query-data/indexing)
