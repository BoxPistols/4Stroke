// MANDARA Insight - Analysis Controller
import { generateJSON, isAIAvailable } from "./ai-service.js";
import {
  countFilledCells,
  buildStructuralAnalysisPrompt,
  buildIssueExtractionPrompt,
  buildActionPlanPrompt,
  buildCrossAnalysisPrompt,
} from "./mandara-insight-prompts.js";

const MIN_CELLS_FOR_ANALYSIS = 3;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Analysis result cache (per mandara ID)
const analysisCache = new Map();

/**
 * キャッシュキーを生成（MANDARA ID + 内容ハッシュ）
 */
function getCacheKey(mandara, type) {
  const contentHash = JSON.stringify(mandara.cells) + mandara.memo + (mandara.tags || []).join(",");
  let hash = 0;
  for (let i = 0; i < contentHash.length; i++) {
    const char = contentHash.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `${mandara.id}_${type}_${hash}`;
}

/**
 * キャッシュから取得（TTL チェック付き）
 */
function getFromCache(key) {
  const entry = analysisCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    analysisCache.delete(key);
    return null;
  }
  return entry.data;
}

/**
 * キャッシュに保存
 */
function saveToCache(key, data) {
  analysisCache.set(key, { data, timestamp: Date.now() });
}

/**
 * 分析可能かチェック
 * @returns {{ available: boolean, reason: string }}
 */
export function checkAnalysisReady(mandara) {
  if (!isAIAvailable()) {
    return { available: false, reason: "AI_NOT_AVAILABLE" };
  }
  if (!mandara) {
    return { available: false, reason: "NO_MANDARA" };
  }
  const filledCount = countFilledCells(mandara);
  if (filledCount < MIN_CELLS_FOR_ANALYSIS) {
    return {
      available: false,
      reason: "INSUFFICIENT_CONTENT",
      filledCount,
      required: MIN_CELLS_FOR_ANALYSIS,
    };
  }
  return { available: true, reason: "OK" };
}

/**
 * 構造分析を実行
 * @param {object} mandara - MANDARAデータ
 * @returns {Promise<object>} 構造分析結果
 */
export async function runStructuralAnalysis(mandara) {
  const cacheKey = getCacheKey(mandara, "structural");
  const cached = getFromCache(cacheKey);
  if (cached) {
    console.log("[Insight] Returning cached structural analysis");
    return cached;
  }

  console.log("[Insight] Running structural analysis...");
  const prompt = buildStructuralAnalysisPrompt(mandara);
  const result = await generateJSON(prompt);
  saveToCache(cacheKey, result);
  return result;
}

/**
 * 課題抽出を実行
 * @param {object} mandara - MANDARAデータ
 * @returns {Promise<object>} 課題抽出結果
 */
export async function runIssueExtraction(mandara) {
  const cacheKey = getCacheKey(mandara, "issues");
  const cached = getFromCache(cacheKey);
  if (cached) {
    console.log("[Insight] Returning cached issue extraction");
    return cached;
  }

  console.log("[Insight] Running issue extraction...");
  const prompt = buildIssueExtractionPrompt(mandara);
  const result = await generateJSON(prompt);
  saveToCache(cacheKey, result);
  return result;
}

/**
 * アクションプランを生成
 * @param {object} mandara - MANDARAデータ
 * @param {Array} issues - 課題抽出結果（任意）
 * @returns {Promise<object>} アクションプラン結果
 */
export async function runActionPlan(mandara, issues = []) {
  const cacheKey = getCacheKey(mandara, "action");
  const cached = getFromCache(cacheKey);
  if (cached) {
    console.log("[Insight] Returning cached action plan");
    return cached;
  }

  console.log("[Insight] Running action plan generation...");
  const prompt = buildActionPlanPrompt(mandara, issues);
  const result = await generateJSON(prompt);
  saveToCache(cacheKey, result);
  return result;
}

/**
 * 全分析を一括実行（構造→課題→アクションプランを順次実行）
 * @param {object} mandara - MANDARAデータ
 * @param {function} onProgress - 進捗コールバック (phase, result)
 * @returns {Promise<object>} 全分析結果
 */
export async function runFullAnalysis(mandara, onProgress) {
  const results = {};

  // Phase 1: 構造分析
  if (onProgress) onProgress("structural", null);
  results.structural = await runStructuralAnalysis(mandara);
  if (onProgress) onProgress("structural", results.structural);

  // Phase 2: 課題抽出
  if (onProgress) onProgress("issues", null);
  results.issues = await runIssueExtraction(mandara);
  if (onProgress) onProgress("issues", results.issues);

  // Phase 3: アクションプラン（課題抽出結果を渡す）
  if (onProgress) onProgress("action", null);
  results.action = await runActionPlan(
    mandara,
    results.issues?.issues || []
  );
  if (onProgress) onProgress("action", results.action);

  return results;
}

/**
 * 横断分析を実行
 * @param {Array} mandaras - 複数のMANDARAデータ
 * @returns {Promise<object>} 横断分析結果
 */
export async function runCrossAnalysis(mandaras) {
  if (!mandaras || mandaras.length < 2) {
    throw new Error("CROSS_ANALYSIS_REQUIRES_MULTIPLE");
  }

  // 10件以上ある場合は内容が多いものを優先
  const targets = mandaras
    .map((m) => ({ mandara: m, filled: countFilledCells(m) }))
    .filter((m) => m.filled >= MIN_CELLS_FOR_ANALYSIS)
    .sort((a, b) => b.filled - a.filled)
    .slice(0, 10)
    .map((m) => m.mandara);

  if (targets.length < 2) {
    throw new Error("CROSS_ANALYSIS_INSUFFICIENT_DATA");
  }

  console.log("[Insight] Running cross analysis on", targets.length, "mandaras...");
  const prompt = buildCrossAnalysisPrompt(targets);
  return await generateJSON(prompt);
}

/**
 * キャッシュをクリア
 */
export function clearCache() {
  analysisCache.clear();
  console.log("[Insight] Cache cleared");
}
