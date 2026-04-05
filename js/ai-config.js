// AI Config - 共有APIキーの解決
//
// 仕組み:
//   1. プロジェクトルートの .env に GEMINI_API_KEY / OPENAI_API_KEY を記載
//   2. `npm run generate:keys` で js/ai-keys.generated.js を生成 (gitignored)
//   3. このファイルがそれを import して公開する
//
// .env または js/ai-keys.generated.js が存在しない場合は空文字を返し、
// ユーザー自身のAPIキー入力 or ローカル分析にフォールバックする。
//
// ⚠️ セキュリティ注意:
//   生成されるキーはクライアントJSに埋め込まれるため誰でも抽出可能です。
//   本番利用時は Google AI Studio / OpenAI で以下の制限を必ずかけてください:
//   - HTTP Referrer 制限 (ドメインをホワイトリスト)
//   - 日次/月次クォータ制限

let cachedKeys = null;

async function loadGeneratedKeys() {
  if (cachedKeys !== null) return cachedKeys;

  try {
    const mod = await import("./ai-keys.generated.js");
    cachedKeys = mod.GENERATED_SHARED_KEYS || {};
    console.log("[ai-config] Loaded generated keys");
  } catch (e) {
    // ファイル未生成時は空で動作させる
    console.log("[ai-config] ai-keys.generated.js not found, using empty shared keys");
    cachedKeys = {};
  }

  return cachedKeys;
}

// 同期アクセス用にモジュール読み込み時に一度だけフェッチ
const keysPromise = loadGeneratedKeys();
let syncKeys = {};
keysPromise.then((k) => {
  syncKeys = k;
});

/**
 * 指定プロバイダーの共有キーを取得（同期）
 */
export function getSharedKey(providerId) {
  return syncKeys[providerId] || "";
}

/**
 * 共有キーが設定されているか判定
 */
export function hasSharedKey(providerId) {
  return !!getSharedKey(providerId);
}

/**
 * 初期化完了を待つ (UI初期描画前に呼ぶと確実)
 */
export async function ensureSharedKeysLoaded() {
  await keysPromise;
}
