// AI Rate Limiter - クライアントサイド日次制限
//
// FREE tier モデル利用時に 1日あたりの利用回数を制限する。
// PREMIUM tier (ユーザー自身のキー) では制限なし。
// localStorage ベースなので完全な制限ではないが、公正利用の目安として機能する。

import { AIError, ApiErrorCode } from "./ai-errors.js";

const STORAGE_KEY = "ai_usage_daily";
const DEFAULT_DAILY_LIMIT = 30;

/**
 * 今日の日付文字列 (YYYY-MM-DD)
 */
function todayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * 使用状況を読み込み
 * @returns {{date: string, counts: Record<string, number>}}
 */
function loadUsage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { date: todayKey(), counts: {} };
    const parsed = JSON.parse(raw);
    // 日付が変わっていたらリセット
    if (parsed.date !== todayKey()) {
      return { date: todayKey(), counts: {} };
    }
    return parsed;
  } catch {
    return { date: todayKey(), counts: {} };
  }
}

/**
 * 使用状況を保存
 */
function saveUsage(usage) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
  } catch {}
}

/**
 * 指定モデルキー(provider:model)の今日の使用回数を取得
 */
export function getUsageCount(usageKey) {
  const usage = loadUsage();
  return usage.counts[usageKey] || 0;
}

/**
 * 残り利用可能回数を取得
 */
export function getRemainingUsage(usageKey, limit = DEFAULT_DAILY_LIMIT) {
  const used = getUsageCount(usageKey);
  return Math.max(0, limit - used);
}

/**
 * 利用制限チェック（超過していたら AIError を throw）
 */
export function checkRateLimit(usageKey, limit = DEFAULT_DAILY_LIMIT) {
  const used = getUsageCount(usageKey);
  if (used >= limit) {
    throw new AIError(ApiErrorCode.RATE_LIMITED, {
      detail: `本日の無料利用枠(${limit}回)を使い切りました。明日リセットされます`,
    });
  }
}

/**
 * 使用カウントを増加
 */
export function incrementUsage(usageKey) {
  const usage = loadUsage();
  usage.counts[usageKey] = (usage.counts[usageKey] || 0) + 1;
  saveUsage(usage);
  console.log(`[RateLimit] ${usageKey}: ${usage.counts[usageKey]}/${DEFAULT_DAILY_LIMIT}`);
}

/**
 * 全ての使用状況を取得（UI表示用）
 */
export function getAllUsage() {
  const usage = loadUsage();
  return {
    date: usage.date,
    counts: { ...usage.counts },
    limit: DEFAULT_DAILY_LIMIT,
  };
}

/**
 * 使用状況をリセット（デバッグ用）
 */
export function resetUsage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export const DAILY_LIMIT = DEFAULT_DAILY_LIMIT;
