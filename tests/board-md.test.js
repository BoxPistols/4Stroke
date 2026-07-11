/**
 * Board Markdown (Markdown ⇄ Board) のユニットテスト
 */
import { describe, it, expect } from "vitest";
import {
  parseMarkdownToDraft,
  draftToBoard,
  markdownToBoard,
  boardToMarkdown,
} from "../js/board-md.js";
import {
  createBoard,
  getGrid,
  expandCell,
  setCellText,
  validateBoard,
  isBoard,
} from "../js/board-logic.js";
import { aiResultToDraft, buildImportPrompt } from "../js/mandara-import-ai.js";

const SAMPLE_MD = `# 事業計画

## 採用
母集団を広げる

### エンジニア採用
リファラル強化

### 広報連携

## プロダクト
- ロードマップ策定
- 品質改善

## 財務

---
タグ: 経営, 2026
来期に向けた検討メモ
`;

describe("parseMarkdownToDraft", () => {
  it("maps H1 to title/center, H2 to groups, H3/bullets to children", () => {
    const draft = parseMarkdownToDraft(SAMPLE_MD);
    expect(draft.title).toBe("事業計画");
    expect(draft.center).toBe("事業計画");
    expect(draft.groups.map((g) => g.label)).toEqual(["採用", "プロダクト", "財務"]);
    expect(draft.groups[0].body).toEqual(["母集団を広げる"]);
    expect(draft.groups[0].children.map((c) => c.label)).toEqual([
      "エンジニア採用",
      "広報連携",
    ]);
    expect(draft.groups[0].children[0].body).toEqual(["リファラル強化"]);
    expect(draft.groups[1].children.map((c) => c.label)).toEqual([
      "ロードマップ策定",
      "品質改善",
    ]);
  });

  it("captures memo and tags after the --- separator", () => {
    const draft = parseMarkdownToDraft(SAMPLE_MD);
    expect(draft.tags).toEqual(["経営", "2026"]);
    expect(draft.memo).toContain("来期に向けた検討メモ");
  });

  it("falls back to first line as center when there are no headings", () => {
    const draft = parseMarkdownToDraft("ただのメモ\n続きの文章");
    expect(draft.center).toBe("ただのメモ");
    expect(draft.memo).toContain("続きの文章");
    expect(draft.groups).toEqual([]);
  });

  it("returns an empty draft for empty input", () => {
    expect(parseMarkdownToDraft("").groups).toEqual([]);
    expect(parseMarkdownToDraft(null).title).toBe("");
  });
});

describe("draftToBoard", () => {
  it("builds a valid 2-level board from a draft", () => {
    const board = markdownToBoard(SAMPLE_MD);
    expect(isBoard(board)).toBe(true);
    expect(validateBoard(board)).toEqual([]);
    expect(board.title).toBe("事業計画");
    expect(board.tags).toEqual(["経営", "2026"]);

    const root = getGrid(board, board.rootGridId);
    expect(root.cells[root.centerCellId].text).toBe("事業計画");

    // 周辺セル: 採用 (本文つき) に子Gridがある
    const perimeter = root.cellIds
      .filter((id) => id !== root.centerCellId)
      .map((id) => root.cells[id]);
    expect(perimeter[0].text).toBe("採用\n母集団を広げる");
    expect(perimeter[0].childGridId).toBeTruthy();

    const child = getGrid(board, perimeter[0].childGridId);
    const childTexts = child.cellIds
      .filter((id) => id !== child.centerCellId)
      .map((id) => child.cells[id].text)
      .filter(Boolean);
    expect(childTexts).toEqual(["エンジニア採用\nリファラル強化", "広報連携"]);
    // 子の中心は親セルを写す
    expect(child.cells[child.centerCellId].text).toBe("採用\n母集団を広げる");
  });

  it("sends 9th+ groups to memo overflow instead of dropping them", () => {
    const md = ["# T", ...Array.from({ length: 10 }, (_, i) => `## G${i + 1}`)].join("\n");
    const board = markdownToBoard(md);
    const root = getGrid(board, board.rootGridId);
    const filled = root.cellIds
      .filter((id) => id !== root.centerCellId)
      .map((id) => root.cells[id].text)
      .filter(Boolean);
    expect(filled).toHaveLength(8);
    expect(board.memo).toContain("G9");
    expect(board.memo).toContain("G10");
    expect(board.memo).toContain("取り込みできなかった項目");
  });

  it("sends 9th+ children of a group to memo overflow", () => {
    const md = ["# T", "## G", ...Array.from({ length: 10 }, (_, i) => `- item${i + 1}`)].join("\n");
    const board = markdownToBoard(md);
    expect(board.memo).toContain("G > item9");
    expect(board.memo).toContain("G > item10");
  });

  it("sets the legacy cells shadow", () => {
    const board = markdownToBoard(SAMPLE_MD);
    expect(board.cells[5]).toBe("事業計画");
  });
});

describe("boardToMarkdown", () => {
  it("emits headings for the tree and a memo/tags section", () => {
    const board = createBoard("計画");
    const root = getGrid(board, board.rootGridId);
    setCellText(board, root.id, root.centerCellId, "計画");
    const [c1] = root.cellIds.filter((id) => id !== root.centerCellId);
    setCellText(board, root.id, c1, "採用\n補足文");
    const child = expandCell(board, root.id, c1);
    const [cc1] = child.cellIds.filter((id) => id !== child.centerCellId);
    setCellText(board, child.id, cc1, "リファラル");
    board.memo = "メモ本文";
    board.tags = ["a", "b"];

    const md = boardToMarkdown(board);
    expect(md).toContain("# 計画");
    expect(md).toContain("## 採用");
    expect(md).toContain("補足文");
    expect(md).toContain("### リファラル");
    expect(md).toContain("---");
    expect(md).toContain("タグ: a, b");
    expect(md).toContain("メモ本文");
  });

  it("returns empty string for null", () => {
    expect(boardToMarkdown(null)).toBe("");
  });
});

describe("round-trip (構造レベル)", () => {
  it("import(export(board)) preserves cell layout and hierarchy", () => {
    const original = markdownToBoard(SAMPLE_MD);
    const reimported = markdownToBoard(boardToMarkdown(original));

    expect(validateBoard(reimported)).toEqual([]);
    expect(reimported.title).toBe(original.title);
    expect(reimported.tags).toEqual(original.tags);

    const labels = (board) => {
      const root = getGrid(board, board.rootGridId);
      return root.cellIds
        .filter((id) => id !== root.centerCellId)
        .map((id) => {
          const cell = root.cells[id];
          const childLabels = cell.childGridId
            ? (() => {
                const child = getGrid(board, cell.childGridId);
                return child.cellIds
                  .filter((cid) => cid !== child.centerCellId)
                  .map((cid) => child.cells[cid].text)
                  .filter(Boolean);
              })()
            : [];
          return { text: cell.text, children: childLabels };
        })
        .filter((c) => c.text || c.children.length);
    };
    expect(labels(reimported)).toEqual(labels(original));
  });
});

describe("aiResultToDraft (AI応答の正規化)", () => {
  it("normalizes a well-formed AI response into a draft", () => {
    const draft = aiResultToDraft({
      title: "T",
      center: "中枢",
      centerRationale: "根拠",
      groups: [{ label: "G1", items: ["a", "b"] }],
      overflow: ["残り"],
    });
    expect(draft.center).toBe("中枢");
    expect(draft.groups[0].children.map((c) => c.label)).toEqual(["a", "b"]);
    expect(draft.memo).toBe("残り");

    const board = draftToBoard(draft);
    expect(validateBoard(board)).toEqual([]);
  });

  it("tolerates malformed AI output", () => {
    expect(aiResultToDraft(null).groups).toEqual([]);
    expect(aiResultToDraft({ groups: "not-array" }).groups).toEqual([]);
    const d = aiResultToDraft({ groups: [{ label: 1, items: [null, "x"] }] });
    expect(d.groups[0].children.map((c) => c.label)).toEqual(["x"]);
  });

  it("buildImportPrompt embeds the source text and the JSON contract", () => {
    const p = buildImportPrompt("本文サンプル");
    expect(p).toContain("本文サンプル");
    expect(p).toContain('"center"');
    expect(p).toContain('"groups"');
  });
});
