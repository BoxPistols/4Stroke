// AI Config - 共有APIキー設定
//
// ⚠️ 注意:
//   共有キーはクライアントJSに埋め込まれるため、誰でも抽出できます。
//   本番利用時は以下を必ず行ってください:
//   1. Google AI Studio / OpenAI で **HTTP Referrer 制限** を設定
//   2. **日次/月次クォータ** を厳しく設定
//   3. キーを漏洩させないために、public リポジトリへは空のままコミット
//
// 本ファイルは gitignore 対象ではありません (空値ならコミットOK)。
// 実運用時は各自のデプロイ環境で値を入れてください。

const SHARED_KEYS = {
  gemini: "",   // 例: "AIza...リファラ制限付きキー..."
  openai: "",   // 例: "sk-...リファラ制限付きキー..."
};

/**
 * 指定プロバイダーの共有キーを取得
 * 空文字列の場合は「共有キーなし」扱い
 */
export function getSharedKey(providerId) {
  return SHARED_KEYS[providerId] || "";
}

/**
 * 共有キーが設定されているか判定
 */
export function hasSharedKey(providerId) {
  return !!getSharedKey(providerId);
}
