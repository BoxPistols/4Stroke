// AI Service - Gemini API
//
// APIキー優先順位:
//  1. ユーザーが手動入力したキー (localStorage)
//  2. Firebase config の apiKey
//
// バックエンド優先順位:
//  1. ユーザーキーで Gemini REST API
//  2. Firebase AI SDK (Vertex AI in Firebase)
//  3. Firebase apiKey で Gemini REST API

import { app } from "./firebase-config.js";

const MODEL_NAME = "gemini-2.0-flash";
const USER_API_KEY_STORAGE = "gemini_api_key";

const GENERATION_CONFIG = {
  temperature: 0.7,
  topP: 0.9,
  topK: 40,
  maxOutputTokens: 4096,
  responseMimeType: "application/json",
};

let activeBackend = null; // "user-rest" | "firebase" | "firebase-rest" | null
let firebaseModel = null;

// --- API Key management ---

export function getUserApiKey() {
  try {
    return localStorage.getItem(USER_API_KEY_STORAGE) || "";
  } catch {
    return "";
  }
}

export function setUserApiKey(key) {
  const trimmed = (key || "").trim();
  if (trimmed) {
    localStorage.setItem(USER_API_KEY_STORAGE, trimmed);
  } else {
    localStorage.removeItem(USER_API_KEY_STORAGE);
  }
  // バックエンドをリセットして次回再判定
  activeBackend = null;
  firebaseModel = null;
  console.log("[AI] API key updated, backend reset");
}

function getFirebaseApiKey() {
  try {
    return app?.options?.apiKey || null;
  } catch {
    return null;
  }
}

// --- Gemini REST API ---

const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

async function callGeminiREST(apiKey, prompt, config) {
  const url = `${GEMINI_API_BASE}/${MODEL_NAME}:generateContent?key=${apiKey}`;

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: config.temperature,
      topP: config.topP,
      topK: config.topK,
      maxOutputTokens: config.maxOutputTokens,
      responseMimeType: config.responseMimeType,
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
    console.error("[AI] Network error:", e);
    throw new Error(`ネットワークエラー: ${e.message}`);
  }

  if (!res.ok) {
    const errorBody = await res.text();
    console.error("[AI] Gemini REST error:", res.status, errorBody);

    // エラー本文から原因を判定
    let parsedError = null;
    try {
      parsedError = JSON.parse(errorBody);
    } catch {}

    const reason = parsedError?.error?.status || "";
    const message = parsedError?.error?.message || errorBody.slice(0, 200);

    // キー問題 (認証/権限)
    if (
      res.status === 403 ||
      reason === "PERMISSION_DENIED" ||
      reason === "UNAUTHENTICATED" ||
      (res.status === 400 && /API key/i.test(message))
    ) {
      const err = new Error("API_KEY_INVALID");
      err.status = res.status;
      err.body = errorBody;
      err.reason = reason;
      err.detail = message;
      throw err;
    }

    // レート制限
    if (res.status === 429) {
      throw new Error(`レート制限に達しました。少し待ってから再試行してください。`);
    }

    // その他（プロンプトエラー、サーバーエラー等）: 実際のメッセージを含める
    throw new Error(`Gemini API (${res.status}): ${message}`);
  }

  const data = await res.json();
  console.log("[AI] Response candidates:", data.candidates?.length);

  const candidate = data.candidates?.[0];
  if (!candidate) {
    // promptFeedback で拒否理由が返ることがある
    const blockReason = data.promptFeedback?.blockReason;
    if (blockReason) {
      throw new Error(`プロンプトがブロックされました: ${blockReason}`);
    }
    throw new Error("AIからのレスポンスが空です");
  }

  // finish reason をチェック
  if (candidate.finishReason === "SAFETY") {
    throw new Error("AIの安全フィルタによりブロックされました");
  }
  if (candidate.finishReason === "MAX_TOKENS") {
    console.warn("[AI] Response truncated at max tokens");
  }

  // 全テキストパートを結合（thinking blocksに対応）
  const text = (candidate.content?.parts || [])
    .map((p) => p.text)
    .filter(Boolean)
    .join("");

  if (!text) {
    console.error("[AI] No text in response:", JSON.stringify(candidate).slice(0, 300));
    throw new Error(`AIレスポンスにテキストがありません (finish: ${candidate.finishReason || "unknown"})`);
  }

  return text;
}

// --- Firebase AI SDK ---

async function initFirebaseAI() {
  const { getAI, getGenerativeModel } = await import(
    "https://www.gstatic.com/firebasejs/11.8.1/firebase-ai.js"
  );
  const ai = getAI(app);
  firebaseModel = getGenerativeModel(ai, { model: MODEL_NAME });
}

async function callFirebaseAI(prompt, config) {
  const result = await firebaseModel.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: config,
  });
  return result.response.text();
}

// --- Backend selection ---

async function ensureBackend() {
  if (activeBackend) return;

  // 1. ユーザー入力キー → Gemini REST
  const userKey = getUserApiKey();
  if (userKey) {
    activeBackend = "user-rest";
    console.log("[AI] Using user-provided API key → Gemini REST");
    return;
  }

  // 2. Firebase AI SDK
  try {
    await initFirebaseAI();
    // 軽量テスト
    await firebaseModel.generateContent({
      contents: [{ role: "user", parts: [{ text: "test" }] }],
      generationConfig: { maxOutputTokens: 8 },
    });
    activeBackend = "firebase";
    console.log("[AI] Using Firebase AI backend");
    return;
  } catch (e) {
    console.warn("[AI] Firebase AI not available:", e.message);
    firebaseModel = null;
  }

  // 3. Firebase apiKey → Gemini REST
  const fbKey = getFirebaseApiKey();
  if (fbKey) {
    activeBackend = "firebase-rest";
    console.log("[AI] Using Firebase apiKey → Gemini REST");
    return;
  }

  throw new Error("API_KEY_REQUIRED");
}

async function callAI(prompt, configOverrides = {}) {
  await ensureBackend();
  const config = { ...GENERATION_CONFIG, ...configOverrides };

  try {
    switch (activeBackend) {
      case "user-rest":
        return await callGeminiREST(getUserApiKey(), prompt, config);
      case "firebase":
        return await callFirebaseAI(prompt, config);
      case "firebase-rest":
        return await callGeminiREST(getFirebaseApiKey(), prompt, config);
      default:
        throw new Error("API_KEY_REQUIRED");
    }
  } catch (e) {
    // Firebase apiKey で Generative Language API が未有効化などの場合
    // → ユーザーキー入力を促すため API_KEY_REQUIRED に変換
    if (e.message === "API_KEY_INVALID") {
      if (activeBackend === "firebase-rest") {
        console.warn(
          "[AI] Firebase apiKey cannot access Generative Language API. " +
          "User must provide their own Gemini API key."
        );
        activeBackend = null;
        throw new Error("API_KEY_REQUIRED");
      }
      if (activeBackend === "user-rest") {
        // ユーザー入力キーが無効 → 入力し直してもらう
        console.warn("[AI] User-provided API key is invalid");
        setUserApiKey("");
        activeBackend = null;
        throw new Error("API_KEY_REQUIRED");
      }
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
    if (jsonMatch) return JSON.parse(jsonMatch[1].trim());

    const braceMatch = text.match(/\{[\s\S]*\}/);
    if (braceMatch) return JSON.parse(braceMatch[0]);

    console.error("[AI] Failed to parse JSON:", text.slice(0, 300));
    throw new Error("AIレスポンスのJSON解析に失敗しました");
  }
}

export async function generateText(prompt) {
  return await callAI(prompt, { responseMimeType: "text/plain" });
}

export function isAIAvailable() {
  return !!(getUserApiKey() || getFirebaseApiKey());
}

export function hasUserApiKey() {
  return !!getUserApiKey();
}

export function getBackendInfo() {
  return { activeBackend, model: MODEL_NAME, hasUserKey: !!getUserApiKey() };
}
