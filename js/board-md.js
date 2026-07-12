/**
 * Board Markdown Module
 * Markdown ⇄ Board(v2) の相互変換を担う純関数群。DOM/AI/ストレージ非依存。
 *
 * 設計ドキュメント: docs/MANDARA_EVOLUTION_PLAN.md §4, §6
 *
 * 写像規約 (ローカルフォールバック = AIなしでも決定的に変換できる):
 *   # H1            → Board タイトル 兼 ルート中心 (見出しが1つも無い文書のみ、
 *                      最初の非空行をタイトルとして採用する)
 *   ## H2           → ルートの周辺セル (最大8)
 *   ### H3以降      → その周辺セルを中枢とした子Gridのセル
 *   - 箇条書き      → 直上の見出しの子セル
 *   地の文          → 直上の見出しセルの本文 (改行連結)
 *   \# / \- / \---  → エスケープされた地の文 (構造として解釈しない)
 *   ``` 〜 ```      → フェンスコード内は構造解釈せず地の文として取り込む
 *   --- 以降        → 備考メモ ("タグ: a, b" 行はタグとして取り込む)
 *   9件目以降の超過 → 切り捨てず備考メモへ退避 (必ず可視化する。ただし
 *                      備考メモ自体の肥大化を防ぐため件数に上限を設ける)
 *
 * ラウンドトリップは構造レベルで保証する:
 *   parseMarkdownToDraft(boardToMarkdown(board)) がセル配置・親子関係を再現する。
 * これを成立させるため、セル本文中の見出し/箇条書き/区切り線に見える行は
 * エクスポート時にバックスラッシュでエスケープし、インポート時に復元する。
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
const MAX_OVERFLOW_ITEMS = 200; // 備考メモの肥大化 (ストレージ上限超過) を防ぐ上限
const MAX_INPUT_LENGTH = 300_000; // 文字数上限。呼び出し側 (UI) の事前チェックの保険

const HEADING_RE = /^(#{1,6})(?:\s+(.*))?$/;
const BULLET_RE = /^\s*(?:[-*+]|\d+[.)])\s+(.*)$/;
const STRUCTURAL_HEADING_RE = /^#{1,6}(?:\s|$)/;
const STRUCTURAL_BULLET_RE = /^\s*(?:[-*+]|\d+[.)])\s+/;
const FENCE_RE = /^```/;

function isStructuralLine(line) {
  const trimmed = line.trim();
  return (
    trimmed === MEMO_SEPARATOR ||
    STRUCTURAL_HEADING_RE.test(line) ||
    STRUCTURAL_BULLET_RE.test(line)
  );
}

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

  // 呼び出し側 (UI) が事前に上限チェックする想定だが、ライブラリ単体としても
  // 病的に巨大な入力で固まらないよう防御的に切り詰める
  const source =
    text.length > MAX_INPUT_LENGTH ? text.slice(0, MAX_INPUT_LENGTH) : text;

  const lines = source.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const preamble = []; // 見出しが1つも出現しなかった場合のフォールバック用
  const memoLines = [];
  let mode = "body"; // body | memo
  let inFence = false;
  let currentGroup = null;
  let currentChild = null;
  let sawHeading = false;

  const pushPlainLine = (text) => {
    if (currentChild) currentChild.body.push(text);
    else if (currentGroup) currentGroup.body.push(text);
    else preamble.push(text);
  };

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

    // フェンスコード境界: 内部では見出し/箇条書き/区切り線を解釈しない
    if (FENCE_RE.test(line.trim())) {
      inFence = !inFence;
      pushPlainLine(line.trim());
      continue;
    }
    if (inFence) {
      if (line.trim()) pushPlainLine(line.trim());
      continue;
    }

    // エスケープされた構造行 (先頭の "\" を1つ外して地の文として扱う)
    if (line.startsWith("\\") && isStructuralLine(line.slice(1))) {
      pushPlainLine(line.slice(1));
      continue;
    }

    if (line.trim() === MEMO_SEPARATOR) {
      mode = "memo";
      continue;
    }

    const heading = line.match(HEADING_RE);
    if (heading) {
      sawHeading = true;
      const level = heading[1].length;
      const label = (heading[2] || "").trim();

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

    const bullet = line.match(BULLET_RE);
    if (bullet) {
      if (currentGroup) {
        // 箇条書き = 子セル (H3配下の箇条書きはその子の本文)
        if (currentChild) {
          currentChild.body.push(bullet[1]);
        } else {
          currentGroup.children.push({ label: bullet[1], body: [] });
        }
      } else {
        // 見出しの前にある箇条書き: マーカーを外して地の文として扱う
        pushPlainLine(bullet[1]);
      }
      continue;
    }

    if (!line.trim()) continue;

    pushPlainLine(line.trim());
  }

  // 見出しが1つも無い文書だけ、先頭の地の文をタイトル/中心として採用する。
  // 見出しが存在する文書では、見出しより前の地の文は備考メモへ回す
  // (後から出てくる本物のH1がタイトルの座を奪えなくなる問題を避ける)。
  if (!sawHeading && !draft.title && preamble.length > 0) {
    const first = preamble.shift();
    draft.title = first;
    draft.center = first;
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
 * 備考メモへ退避して必ず可視化する(件数に上限あり)。
 * cells シャドウも設定済みで返す。
 */
export function draftToBoard(draft) {
  const board = createBoard(draft.title || "");
  const root = getGrid(board, board.rootGridId);
  const overflow = [];
  let overflowTruncated = 0;

  const pushOverflow = (text) => {
    if (overflow.length >= MAX_OVERFLOW_ITEMS) {
      overflowTruncated++;
      return;
    }
    overflow.push(text);
  };

  setCellText(board, root.id, root.centerCellId, draft.center || draft.title || "");

  const perimeterIds = root.cellIds.filter((id) => id !== root.centerCellId);
  (draft.groups || []).forEach((group, index) => {
    if (index >= MAX_GROUPS) {
      pushOverflow(cellText(group.label, group.body) || "(無題のグループ)");
      (group.children || []).forEach((c) =>
        pushOverflow(`  - ${cellText(c.label, c.body)}`)
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
          pushOverflow(`${group.label} > ${cellText(item.label, item.body)}`);
          return;
        }
        setCellText(board, child.id, childPerimeter[ci], cellText(item.label, item.body));
      });
    }
  });

  const memoParts = [];
  if (draft.memo) memoParts.push(draft.memo);
  if (overflow.length) {
    const overflowLines = [OVERFLOW_HEADER, ...overflow];
    if (overflowTruncated > 0) {
      overflowLines.push(`…ほか${overflowTruncated}件は多すぎるため省略しました`);
    }
    memoParts.push(overflowLines.join("\n"));
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

// 本文行が見出し/箇条書き/区切り線として誤解釈されないようにエスケープする
function escapeBodyLine(line) {
  return isStructuralLine(line) ? `\\${line}` : line;
}

function emitGrid(board, grid, depth, lines) {
  const perimeterIds = grid.cellIds.filter((id) => id !== grid.centerCellId);
  for (const cellId of perimeterIds) {
    const cell = grid.cells[cellId];
    const { label, body } = splitCellText(cell?.text);
    if (!label && !cell?.childGridId) continue;

    if (depth <= 6) {
      // ラベルが空でも見出し自体は出力する ("(無題)" のような偽の文字列を
      // 実データとして混入させず、空見出しとして正しくラウンドトリップさせる)
      lines.push(label ? `${"#".repeat(depth)} ${label}` : "#".repeat(depth));
      body.forEach((l) => lines.push(escapeBodyLine(l)));
    } else {
      // 見出しレベル上限を超える深さは箇条書きで表現 (現行の draftToBoard は
      // 深さ2までしか生成しないため通常到達しない。将来の深い展開に備えた
      // フォールバックであり、この形からの再インポートは完全ではない)
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
