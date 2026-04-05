// AI Providers - Provider Registry
//
// 参考: BoxPistols/local-ui-builder の providers.ts パターンを適用
// 新プロバイダー追加は PROVIDER_REGISTRY に1エントリ追加するだけで済む

import { AIError, ApiErrorCode, classifyHttpError, toAIError } from "./ai-errors.js";

/**
 * プロバイダー識別子
 */
export const ProviderKey = Object.freeze({
  GEMINI: "gemini",
  // 将来拡張: CLAUDE: "claude", OPENAI: "openai"
});

/**
 * プロバイダー設定
 * @typedef {Object} ProviderConfig
 * @property {string} name - 表示名
 * @property {string} defaultModel - デフォルトモデルID
 * @property {string} storageKey - localStorage に保存する際のキー名
 * @property {string} apiKeyHint - UI用ヒント (例: "AIza...")
 * @property {string} apiKeyUrl - キー取得URL
 * @property {(apiKey: string, modelId: string, prompt: string, config: object) => Promise<string>} call
 */

/**
 * Gemini REST API 呼び出し
 */
async function callGemini(apiKey, modelId, prompt, config) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: config.temperature,
      topP: config.topP,
      topK: config.topK,
      maxOutputTokens: config.maxOutputTokens,
      ...(config.responseMimeType && { responseMimeType: config.responseMimeType }),
    },
  };

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw toAIError(e);
  }

  if (!res.ok) {
    const errorBody = await res.text();
    console.error("[Gemini] error:", res.status, errorBody.slice(0, 200));
    throw classifyHttpError(res.status, errorBody);
  }

  const data = await res.json();

  const candidate = data.candidates?.[0];
  if (!candidate) {
    const blockReason = data.promptFeedback?.blockReason;
    if (blockReason) {
      throw new AIError(ApiErrorCode.SAFETY_BLOCKED, { detail: blockReason });
    }
    throw new AIError(ApiErrorCode.EMPTY_RESPONSE);
  }

  if (candidate.finishReason === "SAFETY") {
    throw new AIError(ApiErrorCode.SAFETY_BLOCKED);
  }
  if (candidate.finishReason === "MAX_TOKENS") {
    console.warn("[Gemini] Response truncated at max tokens");
  }

  // 全テキストパート結合 (thinking blocks 等対応)
  const text = (candidate.content?.parts || [])
    .map((p) => p.text)
    .filter(Boolean)
    .join("");

  if (!text) {
    throw new AIError(ApiErrorCode.EMPTY_RESPONSE, {
      detail: `finish reason: ${candidate.finishReason || "unknown"}`,
    });
  }

  return text;
}

/**
 * プロバイダーレジストリ
 */
const PROVIDER_REGISTRY = Object.freeze({
  [ProviderKey.GEMINI]: {
    name: "Gemini",
    defaultModel: "gemini-2.5-flash",
    storageKey: "gemini_api_key",
    apiKeyHint: "AIza...",
    apiKeyUrl: "https://aistudio.google.com/apikey",
    call: callGemini,
  },
});

/**
 * プロバイダー設定を取得
 * @param {string} providerId
 * @returns {ProviderConfig}
 */
export function getProvider(providerId) {
  const config = PROVIDER_REGISTRY[providerId];
  if (!config) {
    throw new AIError(ApiErrorCode.INVALID_PROVIDER, { detail: providerId });
  }
  return config;
}

/**
 * 既知のプロバイダーか判定
 */
export function isKnownProvider(providerId) {
  return providerId in PROVIDER_REGISTRY;
}

/**
 * 登録されている全プロバイダーのリスト
 */
export function listProviders() {
  return Object.keys(PROVIDER_REGISTRY).map((id) => ({
    id,
    ...PROVIDER_REGISTRY[id],
  }));
}

/**
 * APIキーで接続テスト
 * @param {string} providerId
 * @param {string} apiKey
 * @returns {Promise<void>} 成功時は何も返さない。失敗時は AIError
 */
export async function testProviderConnection(providerId, apiKey) {
  const provider = getProvider(providerId);

  // maxOutputTokens: 20 で余裕を持たせる
  // (8など小さすぎると finish_reason=LENGTH で失敗する場合がある)
  await provider.call(apiKey, provider.defaultModel, "Hi", {
    temperature: 0.1,
    maxOutputTokens: 20,
  });
}
