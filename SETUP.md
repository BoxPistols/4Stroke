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

### 4. ローカルサーバーを起動

```bash
# Python 3を使う場合
python3 -m http.server 8000

# または Node.jsを使う場合
npx http-server -p 8000
```

### 5. ブラウザでアクセス

```
http://localhost:8000/
```

---

## 🌐 本番環境デプロイ（Netlify）

### 1. Netlify環境変数の設定（オプション）

Netlify ダッシュボードで環境変数を設定できますが、Firebase APIキーは公開されても安全なので、**直接コミット**しても問題ありません。

### 2. Firebaseで承認済みドメインを追加

1. [Firebaseコンソール](https://console.firebase.google.com/) を開く
2. Authentication → Settings → Authorized domains
3. 「ドメインを追加」をクリック
4. Netlifyドメインを追加:
   ```
   your-app-name.netlify.app
   ```

### 3. デプロイ

```bash
git push origin main
```

Netlifyが自動的にデプロイします。

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
