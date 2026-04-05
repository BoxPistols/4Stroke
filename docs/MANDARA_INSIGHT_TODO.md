# MANDARA Insight — 残課題 & 運用ガイド

> **関連Issue**: [#49](https://github.com/BoxPistols/4Stroke/issues/49)
> **関連PR**: [#48 (merged)](https://github.com/BoxPistols/4Stroke/pull/48)
> **最終更新**: 2026-04-06

---

## 🔴 今すぐ対応が必要な項目

### 1. Vercel 環境変数の設定

本番環境 (https://4st.vercel.app) で Google ログインを有効化するために、Vercel Dashboard で以下の環境変数を設定してください。

**設定箇所**: Vercel Dashboard → Project Settings → Environment Variables

| Key | 値の例 | 必須 | 環境 |
|-----|-------|------|------|
| `ALLOWED_GOOGLE_EMAIL` | `your@gmail.com` | **⚠️ 必須** (Googleログイン用) | Production / Preview / Development |
| `GEMINI_API_KEY` | `AIza...` | オプション (AI分析用の共有キー) | Production / Preview |
| `OPENAI_API_KEY` | `sk-proj-...` | オプション (OpenAI利用時) | Production / Preview |
| `ACTIVE_AI_PROVIDER` | `gemini` or `openai` | オプション (デフォルト: `gemini`) | Production / Preview |

**設定後の反映手順**:
1. 環境変数を追加
2. Vercel Dashboard の Deployments → 最新デプロイ → 「Redeploy」
3. または空コミットで push: `git commit --allow-empty -m "chore: trigger redeploy"`

⚠️ **注意**: Firebase のクライアント設定 (`FIREBASE_API_KEY` 等) は `scripts/generate-config.js` にデフォルト値として含まれているため、通常は設定不要です。変更したい場合のみ環境変数で上書きしてください。

---

## 🟡 中期課題 (別PR推奨)

### 2. Store パターンの段階的導入

`js/mandara-store.js` (Pub/Sub Store) は追加済みだが、**まだ未使用**。

**現状の問題**:
- `mandara.js` に `let currentMandara`, `let allMandaras` 等のグローバル状態が散在
- 状態変更時に手動で `renderMandara()` を呼び出す必要がある
- モジュール間で context オブジェクト経由で状態を渡している

**推奨アプローチ** (段階的):
1. まず `currentMandara` のみ store 経由に変更
2. `store.subscribe()` で自動再描画を導入
3. `allMandaras`, `mandaraOrder` と順次移行
4. 最終的に各モジュールで `store` を直接 import

**注意**: 一気に書き換えると既存機能が壊れるため、必ず段階的に。

### 3. TypeScript 段階的移行

現状 `js/` 配下はすべて `.js`。

**推奨アプローチ**:
```json
// tsconfig.json
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "noEmit": true,
    "strict": true
  }
}
```
1. まず JSDoc で型を充実させる
2. 新規ファイルは `.ts` で書く
3. 既存ファイルは触るタイミングで変換

### 4. E2E テストの追加

PR #48 で追加した UI 機能の e2e テストが未整備:
- INSIGHT パネルの開閉・タブ切替
- API キー入力 → 接続テスト → 保存フロー
- TODO フィルター/却下ボタン動作
- サイドバー幅切替 (S/M/L)
- Markdown エクスポート (コピー/ダウンロード)
- GARAGE 連携提案の空スロット自動選択

### 5. mandara-insight-controller の責務分割

約450行と肥大化。分離候補:
- `handleInsightCreateGarage` → `mandara-garage-bridge.js`
- `showInsightIntro` (HTML生成含む) → `mandara-insight-intro-ui.js`

---

## 🟢 軽微な改善

### 6. coderabbitai 指摘の修正
- `scripts/generate-config.js` の `escapeJS` に `\u2028` / `\u2029` エスケープを追加

### 7. ドキュメント更新
- `SETUP.md` に MANDARA Insight の使い方を追記
- `.env.example` に `ALLOWED_GOOGLE_EMAIL` を明示
- README に Insight 機能のスクリーンショット追加

### 8. INSIGHT ボタンのアクセシビリティ
- 緑 (`rgba(80, 250, 123, 0.8)`) のコントラストを検証
- キーボードフォーカス時の視覚フィードバック強化

---

## 📦 PR #48 で完了した機能一覧

### AI 分析機能 (MANDARA Insight)
- ✅ 構造分析 (整合性スコア / セル分析 / カバレッジ / 関係マップ)
- ✅ 課題抽出 (矛盾 / リスク / 依存 / 曖昧 / 欠落)
- ✅ アクションプラン (3ステップ / TODO / 優先度マトリクス / GARAGE提案)
- ✅ 横断分析 (複数マンダラの共通テーマ/依存/重複)
- ✅ ローカルフォールバック分析 (APIキー不要)

### プロバイダー管理
- ✅ マルチプロバイダー対応 (Gemini / OpenAI)
- ✅ モデルtier (FREE / PREMIUM)
- ✅ 共有APIキー + ユーザー個別キー
- ✅ 日次レート制限 (30回/日)
- ✅ 接続テストボタン

### UX機能
- ✅ 分析前確認ダイアログ
- ✅ 却下ボタン (localStorage永続化)
- ✅ TODO フィルター (優先度別) / ソート
- ✅ サイドバー幅切替 (S/M/L)
- ✅ 9マス1画面固定レイアウト + 内部スクロール
- ✅ Markdown エクスポート (コピー/ダウンロード)

### セキュリティ & 安定性
- ✅ env-config 統合 (ハードコード除去)
- ✅ Firebase graceful degradation (.env無しでも動作)
- ✅ AIレスポンスのXSS対策 (全 renderXXX で escapeHtml)
- ✅ GARAGE上書き確認 (空スロット優先選択)
- ✅ Provider Registry パターン
- ✅ 統一エラーコード (AIError / ApiErrorCode)

### コード品質
- ✅ テスト +76件 (合計 403件)
- ✅ Vitest unit tests / happy-dom
- ✅ Code Quality Check (max 1000行/ファイル)

---

## 🏗️ アーキテクチャ概要

```
mandara.html
  ├─ mandara.js (メインコントローラ)
  │    ├─ mandara-logic.js (純粋関数)
  │    ├─ mandara-tags-todos-ui.js (タグ/TODO UI)
  │    ├─ mandara-list-view.js (一覧画面)
  │    ├─ mandara-insight-controller.js ◄── Insight機能の起動
  │    │    ├─ mandara-insight.js (AI分析オーケストレーション)
  │    │    │    ├─ ai-service.js (統一API)
  │    │    │    │    ├─ ai-providers.js (Gemini/OpenAI レジストリ)
  │    │    │    │    ├─ ai-errors.js (エラー分類)
  │    │    │    │    └─ ai-rate-limiter.js (日次制限)
  │    │    │    └─ mandara-insight-prompts.js (プロンプトテンプレート)
  │    │    ├─ mandara-local-analyzer.js (ローカル分析)
  │    │    ├─ mandara-insight-ui.js (結果描画)
  │    │    ├─ mandara-insight-api-tab.js (API設定タブ)
  │    │    └─ mandara-insight-export.js (Markdown出力)
  │    └─ sidebar-size.js (幅切替)
  │
  └─ 共通基盤
       ├─ firebase-config.js (graceful degradation)
       ├─ firebase-available.js (軽量可用性チェック)
       ├─ storage-service.js (LocalStorage/Firestore統一IF)
       ├─ ai-config.js (共有キー解決)
       └─ env-config.generated.js (.env からビルド時注入)
```

---

## 🚀 デプロイフロー

```
.env (ローカル、gitignored)
  ↓ npm run generate:config
js/env-config.generated.js (gitignored)
  ↓ static import
├─ js/firebase-config.js (Firebase初期化)
├─ js/ai-config.js (AI共有キー)
└─ js/config.js (ALLOWED_GOOGLE_EMAIL)

Vercel ビルド:
  1. npm ci
  2. npm run build → generate:config 実行 → sass コンパイル
     .env が無くても Firebase デフォルト値で env-config.generated.js 生成
  3. dist/ + js/ + html がデプロイ
```

---

## 📞 連絡先・参考資料

- **GitHub Issues**: https://github.com/BoxPistols/4Stroke/issues
- **本番**: https://4st.vercel.app
- **Vercel Dashboard**: https://vercel.com/asagiri/4-stroke

---

*このドキュメントは PR #48 マージ後のセッションで作成されました。新しい課題が発生した場合は Issue #49 にコメントを追加するか、新規 Issue を作成してください。*
