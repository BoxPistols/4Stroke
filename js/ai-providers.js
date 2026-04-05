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
  OPENAI: "openai",
  // 将来拡張: CLAUDE: "claude"
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
 * OpenAI Chat Completions API 呼び出し
 */
async function callOpenAI(apiKey, modelId, prompt, config) {
  const url = "https://api.openai.com/v1/chat/completions";

  const body = {
    model: modelId,
    messages: [{ role: "user", content: prompt }],
    temperature: config.temperature,
    top_p: config.topP,
    max_tokens: config.maxOutputTokens,
    ...(config.responseMimeType === "application/json" && {
      response_format: { type: "json_object" },
    }),
  };

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw toAIError(e);
  }

  if (!res.ok) {
    const errorBody = await res.text();
    console.error("[OpenAI] error:", res.status, errorBody.slice(0, 200));
    throw classifyHttpError(res.status, errorBody);
  }

  const data = await res.json();
  const choice = data.choices?.[0];
  if (!choice) {
    throw new AIError(ApiErrorCode.EMPTY_RESPONSE);
  }
  if (choice.finish_reason === "content_filter") {
    throw new AIError(ApiErrorCode.SAFETY_BLOCKED);
  }
  if (choice.finish_reason === "length") {
    console.warn("[OpenAI] Response truncated at max tokens");
  }

  const text = choice.message?.content || "";
  if (!text) {
    throw new AIError(ApiErrorCode.EMPTY_RESPONSE, {
      detail: `finish reason: ${choice.finish_reason || "unknown"}`,
    });
  }
  return text;
}

/**
 * モデルTier定義
 * - free: デフォルト共有キーで利用可（レート制限あり）
 * - premium: ユーザー自身のAPIキーが必要
 */
export const ModelTier = Object.freeze({
  FREE: "free",
  PREMIUM: "premium",
});

/**
 * プロバイダーレジストリ
 */
const PROVIDER_REGISTRY = Object.freeze({
  [ProviderKey.GEMINI]: {
    name: "Gemini",
    storageKey: "gemini_api_key",
    apiKeyHint: "AIza...",
    apiKeyUrl: "https://aistudio.google.com/apikey",
    call: callGemini,
    models: [
      {
        id: "gemini-2.5-flash",
        label: "Gemini 2.5 Flash",
        tier: ModelTier.FREE,
        description: "無料利用可（1日30回まで）",
      },
    ],
  },
  [ProviderKey.OPENAI]: {
    name: "OpenAI",
    storageKey: "openai_api_key",
    apiKeyHint: "sk-...",
    apiKeyUrl: "https://platform.openai.com/api-keys",
    call: callOpenAI,
    models: [
      {
        id: "gpt-4.1-nano",
        label: "GPT-4.1 nano",
        tier: ModelTier.FREE,
        description: "無料利用可（1日30回まで）",
      },
      {
        id: "gpt-4.1-mini",
        label: "GPT-4.1 mini",
        tier: ModelTier.PREMIUM,
        description: "自身のAPIキーが必要（無制限）",
      },
    ],
  },
});

/**
 * 後方互換: プロバイダーのデフォルトモデル（FREE tier の最初のモデル）
 */
function getDefaultModel(providerId) {
  const config = PROVIDER_REGISTRY[providerId];
  return config?.models?.find((m) => m.tier === ModelTier.FREE)?.id
    || config?.models?.[0]?.id;
}

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
 * プロバイダーのデフォルトモデルIDを取得（FREE tier の最初のモデル）
 */
export function getDefaultModelId(providerId) {
  return getDefaultModel(providerId);
}

/**
 * プロバイダー + モデルID からモデル定義を取得
 */
export function getModelInfo(providerId, modelId) {
  const provider = getProvider(providerId);
  return provider.models.find((m) => m.id === modelId) || null;
}

/**
 * APIキーで接続テスト
 * @param {string} providerId
 * @param {string} apiKey
 * @param {string} [modelId] - テストに使用するモデル (省略時はデフォルト)
 * @returns {Promise<void>} 成功時は何も返さない。失敗時は AIError
 */
export async function testProviderConnection(providerId, apiKey, modelId) {
  const provider = getProvider(providerId);
  const targetModel = modelId || getDefaultModel(providerId);

  await provider.call(apiKey, targetModel, "Hi", {
    temperature: 0.1,
    maxOutputTokens: 20,
  });
}
