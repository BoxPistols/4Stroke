# 4 STROKES

4段階思考プロセス（Key → Issue → Action → Publish）に基づいたメモアプリ

**Firebase Authentication + Firestore対応版**

## ✨ Features

- 🔐 **認証機能**: Googleログイン、メール/パスワードログイン
- 💾 **オンラインストレージ**: Firestoreでデータを保存
- 🔄 **複数デバイス同期**: どこからでも同じデータにアクセス
- 🎨 **モダンUI**: レスポンシブデザイン
- ⚡ **自動保存**: リアルタイムで自動保存

## 🚀 クイックスタート

詳細なセットアップ手順は [SETUP.md](./SETUP.md) を参照してください。

```bash
# 1. リポジトリをクローン
git clone <repository-url>
cd 4Stroke

# 2. Firebase設定ファイルを作成
cp js/firebase-config.example.js js/firebase-config.js

# 3. firebase-config.js を編集（Firebaseコンソールから設定をコピー）

# 4. ローカルサーバーを起動
python3 -m http.server 8000

# 5. ブラウザで開く
# http://localhost:8000/
```

## 📚 ドキュメント

### セットアップ・デプロイ
- [セットアップガイド](./SETUP.md) - ローカル開発とデプロイ手順
- [Firebase完全ガイド](./docs/FIREBASE_SETUP_GUIDE.md) - ゼロからのFirebaseセットアップ
- [Netlifyデプロイガイド](./docs/NETLIFY_DEPLOY.md) - 本番環境へのデプロイ手順

### データベース・API
- [Firestoreデータベース構造](./FIRESTORE_DB_STRUCTURE.md) - DB設計とスキーマ定義
- [Firestore API実践ガイド](./FIRESTORE_API_EXAMPLES.md) - 実装例とベストプラクティス

### テスト
- [テストアーキテクチャ](./docs/TEST_ARCHITECTURE.md) - テスト設計とベストプラクティス
- [Mandaraマニュアルテスト](./MANDARA_TEST.md) - Mandara機能の手動テスト手順

## 🧪 テスト

### 自動テスト

```bash
# E2Eテスト（Playwright）
npm run test:e2e

# Mandara機能のテスト
npm run test:e2e -- e2e/mandara.spec.js

# UIモードで実行
npm run test:e2e:ui

# ユニットテスト（Vitest）
npm run test

# カバレッジ付きテスト
npm run test:coverage
```

### 手動テスト

```bash
# ローカルサーバー起動
npx serve -s . -l 8000

# ブラウザで開く
http://localhost:8000/mandara.html

# ブラウザコンソール（F12）でデバッグ
mandaraDebug.logCurrentState()
```

### Claude Codeコマンド

```
/test-mandara        # Mandaraテストを実行
/debug-tests         # テスト失敗のデバッグ
/manual-test-guide   # マニュアルテストガイド
```

詳細は [TEST_ARCHITECTURE.md](./docs/TEST_ARCHITECTURE.md) を参照。

## Dev from

- <https://codepen.io/agdg/pen/QWOEbRO>
- <https://codepen.io/agdg/project/editor/AbvGwm>

## Dev to

<https://github.com/BoxPistols/4Stroke>

---

## Pug

- 継承 追加

```pug
header.header
  block header

// 
extends _title.pug

block append header.header
  p xxx
```

- mixin

```pug
//
mixin section(_title, _className)
  section.section
    //- Clip
    div.copy-value(data-clipboard-text=_title) @include flex
      span &#40;
      span= _title
      span &#41;
    code.code
    code.code
    code.code.option
    div.bx(class!=attributes.class)= _className
      + buttons
//
include mixin/_section.pug
+ section("center")(class="box2")
```
