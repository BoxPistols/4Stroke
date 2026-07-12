/**
 * Board IO Module
 * マンダラ/Boardデータの JSONバックアップ (エクスポート/インポート/マージ) を扱う純関数群。
 * DOM・ストレージには依存しない (ダウンロードやファイル読込は呼び出し側の責務)。
 *
 * 設計ドキュメント: docs/MANDARA_EVOLUTION_PLAN.md §6
 */

import { projectRootCells } from "./board-logic.js";

export const BACKUP_TYPE = "4strokes-mandara-backup";
export const BACKUP_VERSION = 1;

/**
 * 全マンダラをバックアップJSON文字列にする。
 * v1マンダラ・v2 Boardのどちらも素通しで保持する (変換しない)。
 */
export function exportMandarasToJson(mandaras, mandaraOrder = []) {
  const envelope = {
    type: BACKUP_TYPE,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    count: mandaras.length,
    mandaraOrder,
    mandaras,
  };
  return JSON.stringify(envelope, null, 2);
}

/**
 * バックアップJSONを解析して { mandaras, mandaraOrder } を返す。
 * 受け付ける形式:
 * - 本アプリのバックアップ形式 (type/version付きエンベロープ)
 * - 素のマンダラ配列 (localStorage "mandaras" の直コピー)
 * @throws {Error} INVALID_JSON | INVALID_FORMAT | UNSUPPORTED_VERSION
 */
export function parseMandarasJson(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("INVALID_JSON");
  }

  let mandaras;
  let mandaraOrder = [];

  if (Array.isArray(data)) {
    mandaras = data;
  } else if (data && data.type === BACKUP_TYPE) {
    if (data.version > BACKUP_VERSION) {
      throw new Error("UNSUPPORTED_VERSION");
    }
    if (!Array.isArray(data.mandaras)) {
      throw new Error("INVALID_FORMAT");
    }
    mandaras = data.mandaras;
    mandaraOrder = Array.isArray(data.mandaraOrder) ? data.mandaraOrder : [];
  } else {
    throw new Error("INVALID_FORMAT");
  }

  const normalized = mandaras.map(normalizeImportedItem).filter(Boolean);
  if (normalized.length !== mandaras.length) {
    throw new Error("INVALID_FORMAT");
  }

  return { mandaras: normalized, mandaraOrder };
}

/**
 * インポート項目の最低限の検証と欠損フィールドの補完。
 * 不正な項目は null を返す。
 */
function normalizeImportedItem(item) {
  if (!item || typeof item !== "object") return null;
  if (typeof item.id !== "string" || item.id.length === 0) return null;

  // v2 Board はそのまま (grids必須)。ただしレガシー読み取り(insight横断分析
  // 等)が参照する cells シャドウが欠けていれば射影して補う — 外部で手編集
  // された Board を取り込んでもクラッシュしないようにする。
  if (item.schemaVersion === 2) {
    // rootGridId が grids 内に実在しない Board (外部で手編集され壊れた
    // バックアップ等)を弾く。実在しないルートを許すと、以降のレンダリング/
    // ナビゲーション操作が軒並みクラッシュする。
    if (!item.grids || !item.rootGridId || !item.grids[item.rootGridId]) {
      return null;
    }
    if (!item.cells) item.cells = projectRootCells(item);
    return item;
  }

  // v1 マンダラ: cells 1..9 を補完
  const cells = {};
  for (let i = 1; i <= 9; i++) {
    cells[i] = String(item.cells?.[i] ?? "");
  }
  return {
    ...item,
    title: typeof item.title === "string" ? item.title : "",
    cells,
    memo: typeof item.memo === "string" ? item.memo : "",
    tags: Array.isArray(item.tags) ? item.tags : [],
    todos: Array.isArray(item.todos) ? item.todos : [],
    linkedGarageId: item.linkedGarageId ?? null,
  };
}

function toTime(value) {
  if (!value) return 0;
  if (typeof value.toDate === "function") return value.toDate().getTime();
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/**
 * インポート分を既存データにマージする (非破壊: 新しい配列を返す)。
 * ポリシー:
 * - 未知のID → 追加
 * - 既存ID かつ インポート側の updatedAt が新しい → 置換
 * - それ以外 → スキップ (既存を守る)
 * @returns {{merged: Array, added: string[], updated: string[], skipped: string[]}}
 */
export function mergeMandaras(existing, imported) {
  const byId = new Map(existing.map((m) => [m.id, m]));
  const added = [];
  const updated = [];
  const skipped = [];

  for (const item of imported) {
    const current = byId.get(item.id);
    if (!current) {
      byId.set(item.id, item);
      added.push(item.id);
    } else if (toTime(item.updatedAt) > toTime(current.updatedAt)) {
      byId.set(item.id, item);
      updated.push(item.id);
    } else {
      skipped.push(item.id);
    }
  }

  return { merged: [...byId.values()], added, updated, skipped };
}

/** バックアップのファイル名 (例: 4strokes-backup-20260710-1530.json) */
export function buildBackupFilename(now = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
    now.getDate()
  )}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `4strokes-backup-${stamp}.json`;
}
