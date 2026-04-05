// AI Service - Unified interface for AI providers
//
// 責務:
// - アクティブなプロバイダー/モデルを管理
// - モデルの tier に応じて共有キー or ユーザーキーを使い分け
// - FREE tier の場合は日次レート制限を適用

import {
  getProvider,
  getDefaultModelId,
  getModelInfo,
  ProviderKey,
  ModelTier,
  testProviderConnection,
  listProviders,
} from "./ai-providers.js";
import { AIError, ApiErrorCode } from "./ai-errors.js";
import {
  checkRateLimit,
  incrementUsage,
  getRemainingUsage,
} from "./ai-rate-limiter.js";
import { getSharedKey } from "./ai-config.js";

const DEFAULT_PROVIDER = ProviderKey.GEMINI;
const ACTIVE_PROVIDER_STORAGE = "ai_active_provider";
const ACTIVE_MODEL_STORAGE = "ai_active_model";

const GENERATION_CONFIG = {
  temperature: 0.7,
  topP: 0.9,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: "application/json",
};

// --- アクティブプロバイダー/モデル管理 ---

export function getActiveProvider() {
  try {
    const stored = localStorage.getItem(ACTIVE_PROVIDER_STORAGE);
    return stored || DEFAULT_PROVIDER;
  } catch {
    return DEFAULT_PROVIDER;
  }
}

export function setActiveProvider(providerId) {
  try {
    localStorage.setItem(ACTIVE_PROVIDER_STORAGE, providerId);
    // プロバイダーを変えたらデフォルトモデルに戻す
    localStorage.setItem(ACTIVE_MODEL_STORAGE, getDefaultModelId(providerId));
  } catch {}
}

export function getActiveModel() {
  try {
    const stored = localStorage.getItem(ACTIVE_MODEL_STORAGE);
    const providerId = getActiveProvider();
    // 保存されたモデルが現在のプロバイダーに属するか検証
    if (stored && getModelInfo(providerId, stored)) {
      return stored;
    }
    return getDefaultModelId(providerId);
  } catch {
    return getDefaultModelId(getActiveProvider());
  }
}

export function setActiveModel(modelId) {
  try {
    localStorage.setItem(ACTIVE_MODEL_STORAGE, modelId);
  } catch {}
}

// --- APIキー管理 ---

export function getApiKey(providerId = getActiveProvider()) {
  try {
    const provider = getProvider(providerId);
    return localStorage.getItem(provider.storageKey) || "";
  } catch {
    return "";
  }
}

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

export function hasApiKey(providerId = getActiveProvider()) {
  return !!getApiKey(providerId);
}

// --- キー解決ロジック ---

/**
 * モデルの tier に応じて使うべきキーを決定
 * FREE: ユーザーキー優先、なければ共有キー
 * PREMIUM: ユーザーキーのみ
 * @returns {{ apiKey: string, isUserKey: boolean, tier: string }}
 */
function resolveKey(providerId, modelId) {
  const model = getModelInfo(providerId, modelId);
  if (!model) {
    throw new AIError(ApiErrorCode.INVALID_MODEL, { detail: modelId });
  }

  const userKey = getApiKey(providerId);

  if (model.tier === ModelTier.PREMIUM) {
    if (!userKey) {
      throw new AIError(ApiErrorCode.API_KEY_REQUIRED, {
        detail: `${model.label} は自身のAPIキーが必要です`,
      });
    }
    return { apiKey: userKey, isUserKey: true, tier: model.tier };
  }

  // FREE tier
  const sharedKey = getSharedKey(providerId);
  const apiKey = userKey || sharedKey || "";
  if (!apiKey) {
    throw new AIError(ApiErrorCode.API_KEY_REQUIRED);
  }
  return { apiKey, isUserKey: !!userKey, tier: model.tier };
}

// --- テスト接続 ---

export async function testConnection(apiKey, providerId = getActiveProvider(), modelId = null) {
  try {
    await testProviderConnection(providerId, apiKey, modelId);
    return { ok: true };
  } catch (e) {
    const err = e instanceof AIError ? e : new AIError(ApiErrorCode.PROVIDER_ERROR, { cause: e });
    return { ok: false, error: err };
  }
}

// --- コア呼び出し ---

async function callAI(prompt, configOverrides = {}) {
  const providerId = getActiveProvider();
  const modelId = getActiveModel();
  const provider = getProvider(providerId);

  // キー解決 (共有 or ユーザー)
  const { apiKey, isUserKey, tier } = resolveKey(providerId, modelId);

  // FREE tier + 共有キー利用時のみレート制限
  const usageKey = `${providerId}:${modelId}`;
  if (tier === ModelTier.FREE && !isUserKey) {
    checkRateLimit(usageKey);
  }

  const config = { ...GENERATION_CONFIG, ...configOverrides };

  try {
    const result = await provider.call(apiKey, modelId, prompt, config);
    // 成功時にカウント増加（共有キー利用時のみ）
    if (tier === ModelTier.FREE && !isUserKey) {
      incrementUsage(usageKey);
    }
    return result;
  } catch (e) {
    // ユーザーキーが無効ならクリア
    if (e instanceof AIError && e.code === ApiErrorCode.API_KEY_INVALID && isUserKey) {
      setApiKey("", providerId);
    }
    throw e;
  }
}

// --- Public API ---

export async function generateJSON(prompt, configOverrides = {}) {
  const text = await callAI(prompt, {
    responseMimeType: "application/json",
    ...configOverrides,
  });

  console.log("[AI] Raw response length:", text.length);

  try {
    return JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[1].trim()); } catch {}
    }
    const braceMatch = text.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      try { return JSON.parse(braceMatch[0]); } catch {}
    }
    console.error("[AI] Failed to parse JSON:", text.slice(0, 300));
    throw new AIError(ApiErrorCode.PARSE_ERROR);
  }
}

export async function generateText(prompt) {
  return await callAI(prompt, { responseMimeType: "text/plain" });
}

export function isAIAvailable() {
  // 共有キーがあるか、ユーザーキーがあれば利用可能
  for (const p of listProviders()) {
    if (getApiKey(p.id) || getSharedKey(p.id)) return true;
  }
  return false;
}

export function getBackendInfo() {
  const providerId = getActiveProvider();
  const modelId = getActiveModel();
  const provider = getProvider(providerId);
  const modelInfo = getModelInfo(providerId, modelId);
  return {
    provider: providerId,
    providerName: provider.name,
    model: modelId,
    modelLabel: modelInfo?.label || modelId,
    tier: modelInfo?.tier,
    hasUserKey: hasApiKey(providerId),
    remainingUsage: modelInfo?.tier === ModelTier.FREE
      ? getRemainingUsage(`${providerId}:${modelId}`)
      : null,
  };
}

// --- 後方互換エイリアス ---
export const getUserApiKey = getApiKey;
export const setUserApiKey = setApiKey;
export const hasUserApiKey = hasApiKey;
