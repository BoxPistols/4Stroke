# Deployment Guide

## デプロイ戦略

このプロジェクトは**mainブランチのみ**本番環境にデプロイされます。

### ブランチ構成

```
main/master   → 本番環境デプロイ (Vercel + Netlify)
develop       → デプロイなし（テストのみ）
claude/**     → デプロイなし（テストのみ）
feature/**    → デプロイなし（テストのみ）
```

## 自動デプロイ設定

### Vercel

**設定ファイル**: `vercel.json`

```json
{
  "git": {
    "deploymentEnabled": {
      "main": true,
      "master": true
    }
  }
}
```

**Vercelダッシュボード設定**:
1. Project Settings → Git
2. "Production Branch" を `main` に設定
3. "Ignored Build Step" を以下のように設定:

```bash
if [ "$VERCEL_GIT_COMMIT_REF" != "main" ] && [ "$VERCEL_GIT_COMMIT_REF" != "master" ]; then exit 0; fi
```

### Netlify

**設定ファイル**: `netlify.toml`

```toml
[context.production]
  command = "sass styles/style.scss dist/style.css --no-source-map"
  publish = "."

[context.branch-deploy]
  command = "echo 'Branch deploys disabled'"

[context.deploy-preview]
  command = "echo 'Deploy previews disabled'"
```

**Netlifyダッシュボード設定**:
1. Site Settings → Build & Deploy → Continuous Deployment
2. "Branch deploys" → "None"
3. "Deploy previews" → "None"
4. "Production branch" → `main`

## GitHub Actions

### デプロイワークフロー

**ファイル**: `.github/workflows/deploy.yml`

- **トリガー**: `main`/`master`ブランチへのpush
- **実行内容**:
  1. 依存関係インストール
  2. テスト実行
  3. SCSS ビルド
  4. Vercel/Netlifyへ自動デプロイ

### テストワークフロー

**ファイル**: `.github/workflows/test.yml`

- **トリガー**: `develop`, `claude/**`ブランチへのpush, PRs
- **実行内容**:
  1. ユニットテスト
  2. コード品質チェック
  3. ファイルサイズチェック (1000行制限)
  4. インラインスタイルチェック
  5. マジックナンバーチェック

## デプロイフロー

### 開発フロー

```bash
# 1. feature/developブランチで開発
git checkout develop
git pull origin develop

# 2. 新機能開発
git checkout -b feature/new-feature
# ... 開発作業 ...
git commit -m "feat: add new feature"

# 3. developにマージ（デプロイなし）
git checkout develop
git merge feature/new-feature
git push origin develop
# → テストのみ実行、デプロイなし

# 4. mainにマージ（本番デプロイ）
git checkout main
git merge develop
git push origin main
# → テスト + デプロイ実行
```

### プルリクエストフロー

```bash
# 1. PRを作成
git push origin feature/new-feature
# GitHub上でPR作成: feature/new-feature → develop

# 2. テスト自動実行
# → .github/workflows/test.yml が実行される

# 3. レビュー後にdevelopへマージ
# → デプロイなし

# 4. mainへのPR作成
# GitHub上でPR作成: develop → main

# 5. レビュー後にmainへマージ
# → デプロイ実行
```

## 手動デプロイ

### Vercel CLI

```bash
# インストール
npm install -g vercel

# ログイン
vercel login

# プロダクションデプロイ（mainブランチから）
git checkout main
vercel --prod
```

### Netlify CLI

```bash
# インストール
npm install -g netlify-cli

# ログイン
netlify login

# プロダクションデプロイ（mainブランチから）
git checkout main
netlify deploy --prod
```

## デプロイ前チェックリスト

- [ ] すべてのテストが通っている (`npm test`)
- [ ] SCSSがビルドされている (`sass styles/style.scss dist/style.css`)
- [ ] main/masterブランチにいる (`git branch --show-current`)
- [ ] 最新のコードがpullされている (`git pull origin main`)
- [ ] package.jsonのバージョンが更新されている（オプション）

## トラブルシューティング

### developブランチがデプロイされてしまう

**Vercel**:
```bash
# vercel.jsonを確認
cat vercel.json

# Vercelダッシュボードで確認
# Settings → Git → Production Branch
```

**Netlify**:
```bash
# netlify.tomlを確認
cat netlify.toml

# Netlifyダッシュボードで確認
# Site Settings → Build & Deploy → Branch deploys
```

### ビルドエラー

```bash
# ローカルでビルドテスト
npm ci
npm test
sass styles/style.scss dist/style.css --no-source-map

# エラーログ確認
# Vercel: https://vercel.com/dashboard → Deployments → [失敗したデプロイ]
# Netlify: https://app.netlify.com → Deploys → [失敗したデプロイ]
```

### GitHub Actionsが動かない

```bash
# ワークフローファイル確認
cat .github/workflows/deploy.yml
cat .github/workflows/test.yml

# GitHub上で確認
# Repository → Actions → 失敗したワークフロー
```

## 環境変数

本番環境で環境変数が必要な場合:

### Vercel
```bash
vercel env add VARIABLE_NAME production
```

### Netlify
```bash
netlify env:set VARIABLE_NAME value
```

または、ダッシュボードから設定:
- Vercel: Settings → Environment Variables
- Netlify: Site Settings → Build & Deploy → Environment

## ロールバック

### Vercel

```bash
# 以前のデプロイにロールバック
vercel rollback [deployment-url]
```

または、ダッシュボードから:
1. Deployments
2. 以前のデプロイを選択
3. "Promote to Production"

### Netlify

ダッシュボードから:
1. Deploys
2. 以前のデプロイを選択
3. "Publish deploy"

## セキュリティ

- Firebase設定ファイルは本番用のみコミット
- 開発用の秘密情報は`.env.local`に保存（gitignore済み）
- 本番環境変数はダッシュボードから設定
- デプロイ通知をSlack/Discordに送信（推奨）

## モニタリング

- Vercel Analytics: 自動有効
- Netlify Analytics: 有料プランで利用可能
- 外部モニタリング: UptimeRobot, Pingdom等を推奨
