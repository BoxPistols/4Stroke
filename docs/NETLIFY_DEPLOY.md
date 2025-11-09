# 🚀 Netlifyデプロイガイド

このドキュメントでは、4STROKESをNetlifyにデプロイする手順を説明します。

---

## 📋 前提条件

- ✅ Firebaseプロジェクトを作成済み
- ✅ Firebase Authentication（Google、Email/Password）を有効化済み
- ✅ Firestore Databaseを作成済み
- ✅ Netlifyアカウントを作成済み

---

## 🌐 Part 1: Netlifyデプロイの基本設定

### ステップ1: Netlifyで新しいサイトを作成

1. [Netlify](https://app.netlify.com/) にログイン
2. 「Add new site」→「Import an existing project」をクリック
3. GitHubリポジトリを選択
4. ビルド設定:
   ```
   Build command: (空欄)
   Publish directory: .
   ```
5. 「Deploy site」をクリック

### ステップ2: サイトURLを確認

デプロイが完了すると、以下のようなURLが発行されます：
```
https://your-site-name.netlify.app
```

このURLをメモしておいてください。

---

## 🔐 Part 2: Firebaseの承認済みドメイン設定

Netlifyにデプロイしただけでは、認証が動作しません。
Firebaseで承認済みドメインを追加する必要があります。

### ステップ1: Firebaseコンソールを開く

1. [Firebaseコンソール](https://console.firebase.google.com/) にアクセス
2. プロジェクト「strokes-a0b62」を選択
3. 左メニューから「Authentication」をクリック

### ステップ2: 承認済みドメインを追加

1. 「Settings」タブをクリック
2. 「Authorized domains」セクションを探す
3. 「Add domain」をクリック
4. NetlifyのURLを入力:
   ```
   your-site-name.netlify.app
   ```
5. 「Add」をクリック

**結果**:
```
承認済みドメイン:
✅ localhost
✅ your-site-name.netlify.app
```

---

## 📝 Part 3: Firebase設定の更新

### 方法1: firebase-config.jsを直接コミット（推奨）

**現在の構成では、この方法を推奨します。**

理由:
- Firebase APIキーは公開されても安全
- ビルドプロセス不要
- シンプルで管理しやすい

**手順**:
1. ローカルの `js/firebase-config.js` に正しい設定が入っているか確認
2. `.gitignore` から一時的に削除してコミット
   ```bash
   # .gitignoreを編集して js/firebase-config.js の行を削除
   git add js/firebase-config.js
   git commit -m "Add Firebase config for deployment"
   git push
   ```
3. Netlifyが自動的に再デプロイ

### 方法2: Netlify環境変数を使う（高度）

ビルドプロセスを追加する場合の方法です。

**手順**:

1. **Netlifyダッシュボードで環境変数を設定**:
   - Site settings → Environment variables
   - 以下の変数を追加:
     ```
     FIREBASE_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
     FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
     FIREBASE_PROJECT_ID=your-project-id
     FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
     FIREBASE_MESSAGING_SENDER_ID=123456789012
     FIREBASE_APP_ID=1:123456:web:abcdef
     ```

2. **ビルドスクリプトを作成** (`build.sh`):
   ```bash
   #!/bin/bash

   # firebase-config.jsを環境変数から生成
   cat > js/firebase-config.js <<EOF
   import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
   import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
   import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

   const firebaseConfig = {
     apiKey: "${FIREBASE_API_KEY}",
     authDomain: "${FIREBASE_AUTH_DOMAIN}",
     projectId: "${FIREBASE_PROJECT_ID}",
     storageBucket: "${FIREBASE_STORAGE_BUCKET}",
     messagingSenderId: "${FIREBASE_MESSAGING_SENDER_ID}",
     appId: "${FIREBASE_APP_ID}"
   };

   const app = initializeApp(firebaseConfig);
   export const auth = getAuth(app);
   export const db = getFirestore(app);

   console.log('Firebase初期化完了 ✅');
   console.log('プロジェクトID:', firebaseConfig.projectId);
   EOF
   ```

3. **Netlifyのビルド設定を更新**:
   ```
   Build command: bash build.sh
   Publish directory: .
   ```

---

## 🧪 Part 4: デプロイの確認

### ステップ1: サイトにアクセス

```
https://your-site-name.netlify.app/
```

### ステップ2: 動作確認

1. **ログイン画面が表示される**
   - ✅ 自動的に `/login.html` にリダイレクト

2. **Googleログインをテスト**
   - 「Googleでログイン」をクリック
   - Googleアカウントを選択
   - ログイン成功 → `/index.html` にリダイレクト

3. **メールログインをテスト**
   - 新規登録またはログイン
   - 成功すると右上にメールアドレスが表示

4. **データ保存をテスト**
   - テキストエリアに入力
   - 「Auto Save...」が表示される
   - Firebaseコンソールで確認

---

## 🔄 Part 5: 継続的デプロイ

Netlifyは自動的にGitリポジトリと連携しています。

**デプロイフロー**:
```
git push origin main
    ↓
Netlify自動検知
    ↓
自動ビルド
    ↓
自動デプロイ
    ↓
https://your-site-name.netlify.app/ が更新される
```

**プレビューデプロイ**:
- PRを作成すると、自動的にプレビュー環境が作成されます
- レビュー用のURLが発行されます

---

## 🎨 Part 6: カスタムドメインの設定（オプション）

### ステップ1: Netlifyでカスタムドメインを追加

1. Site settings → Domain management
2. 「Add custom domain」をクリック
3. ドメイン名を入力（例: `4strokes.com`）
4. DNSレコードを設定

### ステップ2: Firebaseで承認済みドメインを追加

1. Firebaseコンソール → Authentication → Settings
2. 「Add domain」をクリック
3. カスタムドメインを入力
4. 「Add」をクリック

**結果**:
```
承認済みドメイン:
✅ localhost
✅ your-site-name.netlify.app
✅ 4strokes.com
✅ www.4strokes.com
```

---

## 🐛 トラブルシューティング

### エラー1: 「auth/unauthorized-domain」

**原因**: Firebaseの承認済みドメインにNetlifyのURLが登録されていない

**解決策**:
1. Firebaseコンソール → Authentication → Settings → Authorized domains
2. NetlifyのURLを追加

### エラー2: 「firebase-config.js が見つからない」

**原因**: `firebase-config.js` が `.gitignore` に含まれていてデプロイされていない

**解決策**:
- 方法1: `.gitignore` から削除してコミット（推奨）
- 方法2: Netlify環境変数 + ビルドスクリプトを使用

### エラー3: ログインできるがデータが保存されない

**原因**: Firestoreのセキュリティルールが正しく設定されていない

**解決策**:
1. Firebaseコンソール → Firestore Database → Rules
2. 以下のルールを確認:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```
3. 「公開」をクリック

---

## 📊 デプロイチェックリスト

### Netlifyデプロイ前
- [ ] Firebaseプロジェクト作成済み
- [ ] Authentication有効化済み
- [ ] Firestore Database作成済み
- [ ] セキュリティルール設定済み
- [ ] `firebase-config.js` に正しい設定

### Netlifyデプロイ時
- [ ] Netlifyでサイト作成
- [ ] デプロイ成功
- [ ] サイトURLを取得

### Netlifyデプロイ後
- [ ] Firebaseで承認済みドメインに追加
- [ ] ログイン機能のテスト
- [ ] データ保存のテスト
- [ ] 別ブラウザ/デバイスでテスト

---

## 🔗 参考リンク

- [Netlify公式ドキュメント](https://docs.netlify.com/)
- [Firebase承認済みドメイン](https://firebase.google.com/docs/auth/web/redirect-best-practices)
- [Netlify環境変数](https://docs.netlify.com/environment-variables/overview/)

---

**最終更新**: 2025-11-08
**作成者**: Claude Code
