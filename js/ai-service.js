// AI Service - Unified interface for AI providers
//
// 責務: ユーザーが保存したAPIキーを使って、指定プロバイダーでテキスト/JSONを生成する
// 将来的にClaudeやOpenAIを追加したい場合は ai-providers.js にプロバイダーを登録するだけで済む

import { getProvider, ProviderKey, testProviderConnection } from "./ai-providers.js";
import { AIError, ApiErrorCode } from "./ai-errors.js";

// デフォルト設定
const DEFAULT_PROVIDER = ProviderKey.GEMINI;
const ACTIVE_PROVIDER_STORAGE = "ai_active_provider";

const GENERATION_CONFIG = {
  temperature: 0.7,
  topP: 0.9,
  topK: 40,
  maxOutputTokens: 4096,
  responseMimeType: "application/json",
};

// --- アクティブプロバイダー管理 ---

/**
 * 現在選択されているプロバイダーIDを取得
 */
export function getActiveProvider() {
  try {
    return localStorage.getItem(ACTIVE_PROVIDER_STORAGE) || DEFAULT_PROVIDER;
  } catch {
    return DEFAULT_PROVIDER;
  }
}

/**
 * アクティブプロバイダーを設定
 */
export function setActiveProvider(providerId) {
  try {
    localStorage.setItem(ACTIVE_PROVIDER_STORAGE, providerId);
  } catch {}
}

// --- APIキー管理 (プロバイダー別) ---

/**
 * 指定プロバイダーのAPIキーを取得
 */
export function getApiKey(providerId = getActiveProvider()) {
  try {
    const provider = getProvider(providerId);
    return localStorage.getItem(provider.storageKey) || "";
  } catch {
    return "";
  }
}

/**
 * 指定プロバイダーのAPIキーを保存
 */
export function setApiKey(key, providerId = getActiveProvider()) {
  const provider = getProvider(providerId);
  const trimmed = (key || "").trim();
  try {
    if (trimmed) {
      localStorage.setItem(provider.storageKey, trimmed);
    } else {
      localStorage.removeItem(provider.storageKey);
    }
  } catch {}
  console.log(`[AI] API key ${trimmed ? "set" : "cleared"} for ${providerId}`);
}

/**
 * APIキーを持っているか
 */
export function hasApiKey(providerId = getActiveProvider()) {
  return !!getApiKey(providerId);
}

/**
 * 接続テスト
 * @returns {Promise<{ok: boolean, error?: AIError}>}
 */
export async function testConnection(apiKey, providerId = getActiveProvider()) {
  try {
    await testProviderConnection(providerId, apiKey);
    return { ok: true };
  } catch (e) {
    const err = e instanceof AIError ? e : new AIError(ApiErrorCode.PROVIDER_ERROR, { cause: e });
    return { ok: false, error: err };
  }
}

// --- コア呼び出し ---

/**
 * 指定プロバイダーで AI を呼び出す
 */
async function callAI(prompt, configOverrides = {}) {
  const providerId = getActiveProvider();
  const apiKey = getApiKey(providerId);

  if (!apiKey) {
    throw new AIError(ApiErrorCode.API_KEY_REQUIRED);
  }

  const provider = getProvider(providerId);
  const config = { ...GENERATION_CONFIG, ...configOverrides };

  try {
    return await provider.call(apiKey, provider.defaultModel, prompt, config);
  } catch (e) {
    // APIキー無効の場合はキーをクリア（次回はREQUIRED扱い）
    if (e instanceof AIError && e.code === ApiErrorCode.API_KEY_INVALID) {
      setApiKey("", providerId);
    }
    throw e;
  }
}

// --- Public API ---

/**
 * JSON レスポンスを取得
 */
export async function generateJSON(prompt, configOverrides = {}) {
  const text = await callAI(prompt, {
    responseMimeType: "application/json",
    ...configOverrides,
  });

  console.log("[AI] Raw response length:", text.length);

  try {
    return JSON.parse(text);
  } catch {
    // コードブロック内のJSON抽出
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[1].trim()); } catch {}
    }
    // { から } までの範囲を抽出
    const braceMatch = text.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      try { return JSON.parse(braceMatch[0]); } catch {}
    }
    console.error("[AI] Failed to parse JSON:", text.slice(0, 300));
    throw new AIError(ApiErrorCode.PARSE_ERROR);
  }
}

/**
 * プレーンテキストレスポンスを取得
 */
export async function generateText(prompt) {
  return await callAI(prompt, { responseMimeType: "text/plain" });
}

/**
 * AI 機能が利用可能か（APIキーがあれば true）
 */
export function isAIAvailable() {
  return hasApiKey();
}

/**
 * 現在のバックエンド情報 (デバッグ用)
 */
export function getBackendInfo() {
  const providerId = getActiveProvider();
  const provider = getProvider(providerId);
  return {
    provider: providerId,
    name: provider.name,
    model: provider.defaultModel,
    hasKey: hasApiKey(providerId),
  };
}

// --- Backwards compatibility (既存コードとの互換性) ---

export const getUserApiKey = getApiKey;
export const setUserApiKey = setApiKey;
export const hasUserApiKey = hasApiKey;
