/**
 * Board Markdown Module
 * Markdown ⇄ Board(v2) の相互変換を担う純関数群。DOM/AI/ストレージ非依存。
 *
 * 設計ドキュメント: docs/MANDARA_EVOLUTION_PLAN.md §4, §6
 *
 * 写像規約 (ローカルフォールバック = AIなしでも決定的に変換できる):
 *   # H1            → Board タイトル 兼 ルート中心
 *   ## H2           → ルートの周辺セル (最大8)
 *   ### H3以降      → その周辺セルを中枢とした子Gridのセル
 *   - 箇条書き      → 直上の見出しの子セル
 *   地の文          → 直上の見出しセルの本文 (改行連結)
 *   --- 以降        → 備考メモ ("タグ: a, b" 行はタグとして取り込む)
 *   9件目以降の超過 → 切り捨てず備考メモへ退避 (必ず可視化する)
 *
 * ラウンドトリップは構造レベルで保証する:
 *   parseMarkdownToDraft(boardToMarkdown(board)) がセル配置・親子関係を再現する。
 */

import {
  createBoard,
  getGrid,
  expandCell,
  setCellText,
  projectRootCells,
} from "./board-logic.js";

const MAX_GROUPS = 8; // 3x3 の周辺セル数
const MEMO_SEPARATOR = "---";
const TAGS_PREFIX = "タグ:";
const OVERFLOW_HEADER = "── 取り込みできなかった項目 ──";

// --- Markdown → Draft ---

/**
 * Markdownテキストを中間表現(Draft)に変換する。
 * Draft = {
 *   title, center,
 *   groups: [{ label, body: [lines], children: [{ label, body: [lines] }] }],
 *   memo, tags: [],
 * }
 */
export function parseMarkdownToDraft(text) {
  const draft = { title: "", center: "", groups: [], memo: "", tags: [] };
  if (!text || !text.trim()) return draft;

  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const preamble = []; // 最初の見出しより前の地の文
  const memoLines = [];
  let mode = "body"; // body | memo
  let currentGroup = null;
  let currentChild = null;

  const headingMatch = (line) => line.match(/^(#{1,6})\s+(.*)$/);
  const bulletMatch = (line) => line.match(/^\s*(?:[-*+]|\d+[.)])\s+(.*)$/);

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (mode === "memo") {
      if (line.trim().startsWith(TAGS_PREFIX)) {
        const tags = line
          .trim()
          .slice(TAGS_PREFIX.length)
          .split(/[,、]/)
          .map((t) => t.trim())
          .filter(Boolean);
        draft.tags.push(...tags);
      } else {
        memoLines.push(line);
      }
      continue;
    }

    if (line.trim() === MEMO_SEPARATOR) {
      mode = "memo";
      continue;
    }

    const heading = headingMatch(line);
    if (heading) {
      const level = heading[1].length;
      const label = heading[2].trim();

      if (level === 1 && !draft.title) {
        // 最初のH1 = タイトル兼中心
        draft.title = label;
        draft.center = label;
      } else if (level <= 2) {
        // H2 (および2つ目以降のH1) = 周辺セル
        currentGroup = { label, body: [], children: [] };
        currentChild = null;
        draft.groups.push(currentGroup);
      } else {
        // H3以降 = 子セル (グループ未出現なら暗黙グループを立てる)
        if (!currentGroup) {
          currentGroup = { label: "", body: [], children: [] };
          draft.groups.push(currentGroup);
        }
        currentChild = { label, body: [] };
        currentGroup.children.push(currentChild);
      }
      continue;
    }

    const bullet = bulletMatch(line);
    if (bullet && currentGroup) {
      // 箇条書き = 子セル (H3配下の箇条書きはその子の本文)
      if (currentChild) {
        currentChild.body.push(bullet[1]);
      } else {
        currentGroup.children.push({ label: bullet[1], body: [] });
      }
      continue;
    }

    if (!line.trim()) continue;

    // 地の文
    if (currentChild) {
      currentChild.body.push(line.trim());
    } else if (currentGroup) {
      currentGroup.body.push(line.trim());
    } else if (!draft.title) {
      // 見出しが無いテキスト: 最初の行を中心に据える
      draft.title = line.trim();
      draft.center = line.trim();
    } else {
      preamble.push(line.trim());
    }
  }

  const memoParts = [];
  if (preamble.length) memoParts.push(preamble.join("\n"));
  if (memoLines.length) memoParts.push(memoLines.join("\n").trim());
  draft.memo = memoParts.join("\n").trim();

  return draft;
}

// --- Draft → Board ---

function cellText(label, body) {
  return [label, ...(body || [])].filter(Boolean).join("\n").trim();
}

/**
 * Draft から v2 Board を構築する。超過分(9件目以降のグループ/子)は
 * 備考メモへ退避して必ず可視化する。cells シャドウも設定済みで返す。
 */
export function draftToBoard(draft) {
  const board = createBoard(draft.title || "");
  const root = getGrid(board, board.rootGridId);
  const overflow = [];

  setCellText(board, root.id, root.centerCellId, draft.center || draft.title || "");

  const perimeterIds = root.cellIds.filter((id) => id !== root.centerCellId);
  (draft.groups || []).forEach((group, index) => {
    if (index >= MAX_GROUPS) {
      overflow.push(cellText(group.label, group.body) || "(無題のグループ)");
      (group.children || []).forEach((c) =>
        overflow.push(`  - ${cellText(c.label, c.body)}`)
      );
      return;
    }

    const cellId = perimeterIds[index];
    setCellText(board, root.id, cellId, cellText(group.label, group.body));

    if ((group.children || []).length > 0) {
      const child = expandCell(board, root.id, cellId);
      const childPerimeter = child.cellIds.filter(
        (id) => id !== child.centerCellId
      );
      group.children.forEach((item, ci) => {
        if (ci >= childPerimeter.length) {
          overflow.push(`${group.label} > ${cellText(item.label, item.body)}`);
          return;
        }
        setCellText(board, child.id, childPerimeter[ci], cellText(item.label, item.body));
      });
    }
  });

  const memoParts = [];
  if (draft.memo) memoParts.push(draft.memo);
  if (overflow.length) {
    memoParts.push([OVERFLOW_HEADER, ...overflow].join("\n"));
  }
  board.memo = memoParts.join("\n\n");
  board.tags = [...new Set(draft.tags || [])];
  board.cells = projectRootCells(board);

  return board;
}

/** Markdown → Board (ローカルフォールバックの一括変換) */
export function markdownToBoard(text) {
  return draftToBoard(parseMarkdownToDraft(text));
}

// --- Board → Markdown ---

function splitCellText(text) {
  const lines = String(text || "").split("\n").filter((l) => l.trim());
  return { label: lines[0] || "", body: lines.slice(1) };
}

function emitGrid(board, grid, depth, lines) {
  const perimeterIds = grid.cellIds.filter((id) => id !== grid.centerCellId);
  for (const cellId of perimeterIds) {
    const cell = grid.cells[cellId];
    const { label, body } = splitCellText(cell?.text);
    if (!label && !cell?.childGridId) continue;

    if (depth <= 6) {
      lines.push(`${"#".repeat(depth)} ${label || "(無題)"}`);
      body.forEach((l) => lines.push(l));
    } else {
      // 見出しレベル上限を超える深さは箇条書きで表現
      const indent = "  ".repeat(depth - 7);
      lines.push(`${indent}- ${[label, ...body].join(" / ")}`);
    }
    lines.push("");

    if (cell?.childGridId) {
      const child = getGrid(board, cell.childGridId);
      if (child) emitGrid(board, child, depth + 1, lines);
    }
  }
}

/**
 * Board ツリー全体を見出し階層のMarkdownに変換する。
 * Obsidian/Notion にそのまま貼れる形式。
 */
export function boardToMarkdown(board) {
  if (!board) return "";
  const lines = [];
  const root = getGrid(board, board.rootGridId);
  const centerText = root?.centerCellId
    ? root.cells[root.centerCellId]?.text ?? ""
    : "";

  lines.push(`# ${board.title || centerText || "無題"}`);
  lines.push("");

  if (root) emitGrid(board, root, 2, lines);

  if (board.memo || (board.tags || []).length) {
    lines.push(MEMO_SEPARATOR);
    if ((board.tags || []).length) lines.push(`${TAGS_PREFIX} ${board.tags.join(", ")}`);
    if (board.memo) lines.push(board.memo);
    lines.push("");
  }

  // 連続空行を1つに潰す
  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim() + "\n";
}
