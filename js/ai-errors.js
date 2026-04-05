// AI Errors - Unified error types & classification
//
// 参考: BoxPistols/local-ui-builder の errors.ts パターンを適用

/**
 * エラーコード定義
 */
export const ApiErrorCode = Object.freeze({
  RATE_LIMITED: "RATE_LIMITED",
  AUTH_FAILED: "AUTH_FAILED",
  API_KEY_REQUIRED: "API_KEY_REQUIRED",
  API_KEY_INVALID: "API_KEY_INVALID",
  INVALID_MODEL: "INVALID_MODEL",
  INVALID_PROVIDER: "INVALID_PROVIDER",
  PROVIDER_ERROR: "PROVIDER_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
  SAFETY_BLOCKED: "SAFETY_BLOCKED",
  EMPTY_RESPONSE: "EMPTY_RESPONSE",
  PARSE_ERROR: "PARSE_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
});

/**
 * エラーコード → 日本語メッセージのマップ
 */
const ERROR_MESSAGES = {
  RATE_LIMITED: "レート制限に達しました",
  AUTH_FAILED: "認証に失敗しました",
  API_KEY_REQUIRED: "APIキーが必要です",
  API_KEY_INVALID: "APIキーが無効です",
  INVALID_MODEL: "指定されたモデルは利用できません",
  INVALID_PROVIDER: "不明なプロバイダーです",
  PROVIDER_ERROR: "AIプロバイダーでエラーが発生しました",
  NETWORK_ERROR: "ネットワークエラー",
  SAFETY_BLOCKED: "AIの安全フィルタによりブロックされました",
  EMPTY_RESPONSE: "AIからのレスポンスが空です",
  PARSE_ERROR: "AIレスポンスの解析に失敗しました",
  VALIDATION_ERROR: "入力が無効です",
};

/**
 * 統一エラークラス
 * throw new AIError(ApiErrorCode.API_KEY_INVALID, { detail: "..." })
 */
export class AIError extends Error {
  /**
   * @param {string} code - ApiErrorCode のいずれか
   * @param {object} [options]
   * @param {string} [options.detail] - 追加の詳細メッセージ
   * @param {number} [options.status] - HTTPステータス
   * @param {number} [options.retryAfter] - 再試行までの秒数
   * @param {unknown} [options.cause] - 元のエラー
   */
  constructor(code, options = {}) {
    const baseMessage = ERROR_MESSAGES[code] || code;
    const fullMessage = options.detail
      ? `${baseMessage}: ${options.detail}`
      : baseMessage;
    super(fullMessage);
    this.name = "AIError";
    this.code = code;
    this.detail = options.detail;
    this.status = options.status;
    this.retryAfter = options.retryAfter;
    this.cause = options.cause;
  }

  /** ユーザー向け短縮メッセージ */
  get userMessage() {
    const base = ERROR_MESSAGES[this.code] || this.message;
    return this.detail ? `${base}: ${this.detail}` : base;
  }
}

/**
 * HTTPレスポンスからエラーを分類
 * @param {number} status - HTTPステータスコード
 * @param {string} errorBody - エラー本文 (JSON文字列または生テキスト)
 * @returns {AIError}
 */
export function classifyHttpError(status, errorBody) {
  let parsed = null;
  try {
    parsed = JSON.parse(errorBody);
  } catch {}

  const reason = parsed?.error?.status || "";
  const message = parsed?.error?.message || errorBody.slice(0, 200);

  // レート制限
  if (status === 429 || reason === "RESOURCE_EXHAUSTED" || /quota/i.test(message)) {
    const retryMatch = message.match(/retry.?after[:\s]*(\d+)/i);
    const retryAfter = retryMatch ? parseInt(retryMatch[1], 10) : undefined;
    return new AIError(ApiErrorCode.RATE_LIMITED, {
      status,
      detail: message,
      retryAfter,
    });
  }

  // 認証・権限問題
  if (
    status === 401 ||
    status === 403 ||
    reason === "PERMISSION_DENIED" ||
    reason === "UNAUTHENTICATED" ||
    (status === 400 && /API key/i.test(message))
  ) {
    return new AIError(ApiErrorCode.API_KEY_INVALID, {
      status,
      detail: message,
    });
  }

  // その他のサーバーエラー
  return new AIError(ApiErrorCode.PROVIDER_ERROR, {
    status,
    detail: message,
  });
}

/**
 * 任意のエラーを AIError に変換（必要なら）
 * @param {unknown} err
 * @returns {AIError}
 */
export function toAIError(err) {
  if (err instanceof AIError) return err;

  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  if (err instanceof TypeError && lower.includes("fetch")) {
    return new AIError(ApiErrorCode.NETWORK_ERROR, {
      detail: message,
      cause: err,
    });
  }

  return new AIError(ApiErrorCode.PROVIDER_ERROR, {
    detail: message,
    cause: err,
  });
}
