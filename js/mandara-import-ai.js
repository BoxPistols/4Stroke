/**
 * Mandara Import AI Module
 * 貼り付けテキスト/Markdown を AI で「中枢の判定 + マス分類」し、
 * board-md.js の Draft 形式に正規化する。
 *
 * 設計ドキュメント: docs/MANDARA_EVOLUTION_PLAN.md §4
 * AI呼び出しは既存の ai-service.js (generateJSON) を利用する。
 */

import { generateJSON, isAIAvailable } from "./ai-service.js";

export { isAIAvailable };

/**
 * AI へ渡す分類プロンプトを生成する。
 * 出力契約: {center, centerRationale, title, groups:[{label, items}], overflow}
 */
export function buildImportPrompt(rawText) {
  const truncated = String(rawText || "").slice(0, 12000);
  return `あなたは思考整理の専門家です。以下の文書を「マンダラチャート」(中心1マス + 周辺8マスの3x3グリッド)に分類してください。

## 指示
1. 文書全体の「中枢概念」(最も本質的なテーマ)を1フレーズで判定する
2. なぜそれが中枢なのか根拠を1文で述べる
3. 内容を最大8グループに分類する。各グループには短いラベル(周辺マスに入る)と、元テキストの要素(items)を割り当てる
4. グループが8を超える場合は近いもの同士を統合する。どうしても収まらない断片は overflow に入れる(捨てない)
5. 各グループの items は最大8件。超える場合は統合するか overflow へ

## 出力形式 (JSONのみを出力すること)
{
  "title": "文書のタイトル(短く)",
  "center": "中枢概念(1フレーズ)",
  "centerRationale": "中枢と判定した根拠(1文)",
  "groups": [
    { "label": "マスに入る短いラベル", "items": ["要素1", "要素2"] }
  ],
  "overflow": ["どのマスにも属さない断片"]
}

## 対象文書
${truncated}`;
}

/**
 * AI応答のJSONを board-md.js の Draft 形式に正規化する。
 * 欠損・型不一致は寛容に補正する (AIの出力は信用しない)。
 */
export function aiResultToDraft(json) {
  const asString = (v) => (typeof v === "string" ? v.trim() : "");
  const groups = Array.isArray(json?.groups) ? json.groups : [];
  const overflow = Array.isArray(json?.overflow) ? json.overflow : [];

  const draft = {
    title: asString(json?.title) || asString(json?.center),
    center: asString(json?.center) || asString(json?.title),
    centerRationale: asString(json?.centerRationale),
    groups: groups
      .map((g) => ({
        label: asString(g?.label),
        body: [],
        children: (Array.isArray(g?.items) ? g.items : [])
          .map((item) => ({ label: asString(item), body: [] }))
          .filter((c) => c.label),
      }))
      .filter((g) => g.label || g.children.length),
    memo: overflow.map(asString).filter(Boolean).join("\n"),
    tags: [],
  };
  return draft;
}

/**
 * テキストをAIで分類して Draft を返す。
 * @throws {AIError} キー未設定・レート制限・パース失敗など (ai-service 由来)
 */
export async function classifyTextWithAI(rawText) {
  const json = await generateJSON(buildImportPrompt(rawText), {
    temperature: 0.3, // 分類タスクなので発散を抑える
  });
  return aiResultToDraft(json);
}
