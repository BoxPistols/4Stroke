# URL to Markdown Conversion Feature

## 概要

テキストエリアにURLを貼り付けると、自動的にマークダウン形式 `[タイトル](URL)` に変換される機能です。

## 使い方

### 基本的な使い方

1. 任意のストロークのテキストエリアにURLをコピー
2. Ctrl+V（Mac: Cmd+V）でペースト
3. 自動的にマークダウン形式に変換される

### 例

#### 入力
```
https://github.com/anthropics/claude-code
```

#### 出力
```
[Claude Code](https://github.com/anthropics/claude-code)
```

### 複数URLの貼り付け

テキストに複数のURLが含まれている場合、すべて変換されます。

#### 入力
```
参考リンク:
https://example.com/article-1
https://example.com/article-2
```

#### 出力
```
参考リンク:
[Article 1](https://example.com/article-1)
[Article 2](https://example.com/article-2)
```

## 動作の仕組み

### 1. URL検出

正規表現でHTTP/HTTPSのURLを検出します：
```javascript
/(https?:\/\/[^\s]+)/g
```

### 2. タイトル取得

2つの方法でタイトルを取得します：

#### 方法A: メタデータAPI（優先）
- unfurl.io APIを使用
- ページの `<title>` タグや Open Graph タグからタイトルを取得
- より正確なタイトルが得られる

#### 方法B: URLからの抽出（フォールバック）
- APIが失敗した場合に使用
- URLのパスからタイトルを推測
- ハイフンやアンダースコアをスペースに変換
- 単語の先頭を大文字化

### 3. マークダウン変換

`[タイトル](URL)` 形式に変換します。

## 対応するURL形式

✅ 対応:
- `http://example.com`
- `https://example.com`
- `https://example.com/path/to/page`
- `https://example.com/page?query=param`
- `https://example.com/page#section`
- `http://localhost:3000/page`

❌ 非対応:
- `ftp://example.com`
- `mailto:email@example.com`
- `tel:+1234567890`

## タイトル抽出の例

| URL | 抽出されるタイトル |
|-----|------------------|
| `https://example.com/my-blog-post` | `My Blog Post` |
| `https://github.com/user/repo` | `Repo` |
| `https://example.com/docs/getting-started` | `Getting Started` |
| `https://example.com/file.pdf` | `File` (拡張子削除) |
| `https://example.com` | `example.com` (ホスト名) |

## 設定

### 機能の有効化/無効化

`js/app.js` の先頭にあるフラグで制御できます：

```javascript
const URL_CONVERSION_ENABLED = true; // true: 有効, false: 無効
```

### カスタマイズ

#### メタデータAPIの変更

`js/url-converter.js` の `fetchURLMetadata()` 関数を編集：

```javascript
export async function fetchURLMetadata(url) {
  // 別のAPIサービスを使用する場合
  const apiUrl = `https://your-api.com/v1/metadata?url=${encodeURIComponent(url)}`;

  // ... APIリクエストコード
}
```

#### タイトル抽出ロジックのカスタマイズ

`extractTitleFromURL()` 関数を編集：

```javascript
export function extractTitleFromURL(url) {
  // カスタムロジックを実装
}
```

## トラブルシューティング

### URLが変換されない

**症状**: URLをペーストしても変換されない

**原因**:
1. 機能が無効化されている
2. URLがHTTP/HTTPS以外
3. JavaScriptエラーが発生している

**解決方法**:
1. `URL_CONVERSION_ENABLED = true` を確認
2. ブラウザのコンソールでエラーを確認
3. URLがHTTP/HTTPSで始まることを確認

### 元のURLのままペーストしたい

**方法1**: Ctrl+Shift+V でプレーンテキストとしてペースト

**方法2**: 機能を一時的に無効化
```javascript
const URL_CONVERSION_ENABLED = false;
```

### タイトルが正しく取得されない

**原因**:
- APIが失敗してURLからの抽出にフォールバック
- ページにタイトルタグがない
- CORSエラー

**解決方法**:
- 手動でタイトルを編集
- より信頼性の高いAPIサービスを使用

### APIレート制限に達した

unfurl.io APIには無料プランでレート制限があります。

**解決方法**:
1. 同期モードに切り替え（APIを使用しない）
```javascript
import { processPastedTextSync } from './url-converter.js';
// processPastedText() の代わりに processPastedTextSync() を使用
```

2. 別のAPIサービスを使用
3. 自前のサーバーレス関数を実装

## パフォーマンス

### APIモード（デフォルト）
- 遅延: 500ms - 2秒（ネットワーク依存）
- 正確性: 高（実際のページタイトル取得）

### 同期モード（フォールバック）
- 遅延: < 10ms
- 正確性: 中（URLから推測）

## プライバシーとセキュリティ

### データの送信

URLは外部API（unfurl.io）に送信されます：
- 送信データ: URLのみ
- 用途: メタデータ取得
- 保存: APIサービス側のポリシーに依存

### セキュリティ対策

1. **XSS防止**: URLとタイトルはエスケープされません（マークダウンは安全）
2. **CORS**: APIがCORS対応している必要があります
3. **HTTPSのみ**: 本番環境ではHTTPSを推奨

### プライベートURLの扱い

⚠️ **注意**: イントラネットや社内URLも外部APIに送信されます。

機密性の高いURLを扱う場合：
1. 同期モードを使用（API不使用）
2. 自前のプロキシサーバーを実装
3. 機能を無効化

## 代替API

unfurl.io以外の選択肢：

### 1. Microlink
```javascript
const apiUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}`;
```
- 無料枠: 50リクエスト/日
- 信頼性: 高

### 2. OpenGraph.io
```javascript
const apiUrl = `https://opengraph.io/api/1.1/site/${encodeURIComponent(url)}?app_id=YOUR_APP_ID`;
```
- 無料枠: 100リクエスト/月
- 要API登録

### 3. 自前実装（Netlify/Vercel Functions）

```javascript
// netlify/functions/get-metadata.js
export async function handler(event) {
  const url = event.queryStringParameters.url;
  // URLからメタデータを取得
  return { statusCode: 200, body: JSON.stringify({ title: '...' }) };
}
```

## テスト

ユニットテストは `tests/url-converter.test.js` に含まれています。

```bash
npm test  # 全テスト実行（199テスト）
```

### 手動テスト

1. ローカルサーバー起動:
```bash
npx serve -s . -l 3000
```

2. ブラウザで `http://localhost:3000/main.html` を開く

3. テキストエリアに以下をペースト:
```
https://github.com/anthropics/claude-code
```

4. 自動的に変換されることを確認:
```
[Claude Code](https://github.com/anthropics/claude-code)
```

## FAQ

### Q: すべてのテキストエリアで動作しますか？
A: はい。メインページの全16個のストローク入力で動作します。

### Q: タイトル編集用のinputでも動作しますか？
A: いいえ。ストロークのtextareaのみ対応しています。

### Q: 変換をやり直せますか？
A: はい。Ctrl+Z（Undo）で元に戻せます。

### Q: オフラインでも動作しますか？
A: 同期モード（`processPastedTextSync`）であれば動作します。

### Q: モバイルでも動作しますか？
A: はい。ペーストイベントをサポートするすべてのブラウザで動作します。

## 既知の制限

1. **CORSエラー**: 一部のAPIがCORSに対応していない
2. **レート制限**: 無料APIには制限あり
3. **タイトル取得失敗**: 一部のサイトはタイトル取得不可
4. **ペーストのみ対応**: ドラッグ&ドロップは未対応
5. **取り消し機能**: ペースト直後のみ（保存後は不可）

## 今後の改善案

- [ ] ドラッグ&ドロップ対応
- [ ] プレビュー機能（変換前に確認）
- [ ] カスタムフォーマット設定（HTMLリンクなど）
- [ ] ローカルキャッシュ（同じURLの再取得を防ぐ）
- [ ] バッチ処理（複数URL同時変換の最適化）
- [ ] エラーハンドリング改善（ユーザー通知）

## ライセンス

この機能はプロジェクトのライセンスに従います。

使用しているサービス:
- unfurl.io: 独自のライセンス（利用規約参照）

---

**最終更新**: 2025-01-09
**バージョン**: 1.0.0
