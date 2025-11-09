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

- [セットアップガイド](./SETUP.md) - ローカル開発とデプロイ手順
- [Firebase完全ガイド](./docs/FIREBASE_SETUP_GUIDE.md) - ゼロからのFirebaseセットアップ
- [Netlifyデプロイガイド](./docs/NETLIFY_DEPLOY.md) - 本番環境へのデプロイ手順

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
