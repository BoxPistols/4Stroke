# 🔧 4STROKES セットアップガイド

このアプリケーションはFirebase Authentication + Firestoreを使用しています。

## 📋 前提条件

- Firebaseプロジェクトを作成済み
- Firebase Authentication（Google、Email/Password）を有効化済み
- Firestore Databaseを作成済み

詳細は [`docs/FIREBASE_SETUP_GUIDE.md`](./docs/FIREBASE_SETUP_GUIDE.md) を参照してください。

---

## 🚀 ローカル開発のセットアップ

### 1. リポジトリをクローン

```bash
git clone <repository-url>
cd 4Stroke
```

### 2. Firebase設定ファイルを作成

テンプレートファイルをコピーして、実際の設定ファイルを作成します：

```bash
cp js/firebase-config.example.js js/firebase-config.js
```

**参考**: `.env.example` ファイルも用意していますが、Vanilla JavaScriptではビルドプロセスがないため直接使用できません。Netlifyなどのデプロイ環境での設定の参考としてご利用ください。

### 3. Firebase設定を編集

`js/firebase-config.js` を開いて、Firebaseコンソールから取得した設定情報を貼り付けます：

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",              // ← あなたのAPIキー
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

**Firebase設定の取得方法**:
1. [Firebaseコンソール](https://console.firebase.google.com/) を開く
2. プロジェクトを選択
3. 設定（⚙️）→ プロジェクトの設定 → マイアプリ
4. SDKの設定と構成 → 構成 をコピー

### 4. Google認証制限を設定（オプション）

このアプリケーションは特定のGoogleアカウントでのみログインを許可する機能を備えています。

**ローカル開発時:**

```bash
# Firebase設定ファイルのコピーと同様に、認証設定をコピー
cp js/config.example.js js/config.js
```

`js/config.js` を編集して、許可するメールアドレスを設定します：

```javascript
export const CONFIG = {
  ALLOWED_GOOGLE_EMAIL: 'your-email@gmail.com',
};
```

**Vercel環境での設定:**

Vercelの環境変数に以下を設定してください：

```
環境変数名: VITE_ALLOWED_GOOGLE_EMAIL
値: あなたのメールアドレス（例: ito.atsu.mail@gmail.com）
```

設定手順：
1. Vercel プロジェクト設定を開く
2. Settings → Environment Variables
3. 上記の環境変数を追加

詳細は [Google認証制限](./docs/GOOGLE_AUTH_RESTRICTION.md) を参照してください。

### 5. ローカルサーバーを起動

```bash
# Python 3を使う場合
python3 -m http.server 8000

# または Node.jsを使う場合
npx http-server -p 8000
```

### 6. ブラウザでアクセス

```
http://localhost:8000/
```

---

## 🌐 本番環境デプロイ（Netlify）

**詳細なデプロイ手順は [Netlifyデプロイガイド](./docs/NETLIFY_DEPLOY.md) を参照してください。**

### クイックスタート

1. **Netlifyでサイトを作成**
   - リポジトリを接続
   - ビルド設定: なし
   - 公開ディレクトリ: `.`（ルート）

2. **Firebaseで承認済みドメインを追加**
   - [Firebaseコンソール](https://console.firebase.google.com/) を開く
   - Authentication → Settings → Authorized domains
   - Netlifyドメイン（`your-app-name.netlify.app`）を追加

3. **デプロイ**
   ```bash
   git push origin main
   ```

### 環境変数の扱い

**推奨方法**: `firebase-config.js` を直接コミット（シンプルで推奨）

- Firebase APIキーは公開されても安全（Firebaseの設計仕様）
- セキュリティはFirestoreルールと認証で保護
- Vercel/Netlifyで追加設定不要

**注意**: 真に機密なAPIキー（外部サービスなど）は環境変数を使用してください。

詳細は [Netlifyデプロイガイド](./docs/NETLIFY_DEPLOY.md) を参照してください。

---

## 🔒 セキュリティについて

### Firebase APIキーは公開されても安全？

**はい、安全です。**

Firebase APIキーはクライアントサイドで使用することを前提としています。実際のセキュリティは以下で管理されます：

1. **Firestoreセキュリティルール**: ユーザーは自分のデータのみアクセス可能
2. **Firebase Authentication**: 認証されたユーザーのみアクセス可能
3. **承認済みドメイン**: 登録されたドメインからのみ認証可能

### なぜ `.gitignore` に追加？

- ベストプラクティスとして
- 複数の環境（開発、本番）で異なる設定を使う場合に便利
- チーム開発時にコンフリクトを避ける

---

## 🐛 トラブルシューティング

### `firebase-config.js` が見つからない

```bash
cp js/firebase-config.example.js js/firebase-config.js
```

を実行して、設定ファイルを作成してください。

### ログインできない

1. Firebaseコンソールで Authentication が有効化されているか確認
2. 承認済みドメインに `localhost` と本番ドメインが追加されているか確認

### データが保存されない

1. Firestoreのセキュリティルールを確認
2. ブラウザのコンソールでエラーを確認

---

## 📚 参考資料

- [Firebase公式ドキュメント](https://firebase.google.com/docs)
- [完全なセットアップガイド](./docs/FIREBASE_SETUP_GUIDE.md)
- [Firestore セキュリティルール](https://firebase.google.com/docs/firestore/security/get-started)

---

**最終更新**: 2025-11-08
**作成者**: Claude Code
