/**
 * Board Logic Module (schema v2)
 * マンダラを「Board(ツリー全体) > Grid(1枚のマス目) > Cell(1マス)」で表す
 * データモデルv2の純関数群。DOM/ストレージには依存しない。
 *
 * 設計ドキュメント: docs/MANDARA_EVOLUTION_PLAN.md §1-§3
 *
 * 親子リンクは必ず双方向で保持する:
 *   Cell.childGridId ⇄ Grid.parentCellId
 * 中心セルのテキストは「親セルが正」とし、setCellText が両方向を同期する。
 */

export const SCHEMA_VERSION = 2;

// グリッドパターン定義 (cellCount: null = 可変長)
export const GRID_PATTERNS = {
  "3x3": { label: "3×3 マンダラ", cellCount: 9, centerIndex: 4 },
  "2x2": { label: "2×2 (Key/Issue/Action/Publish)", cellCount: 4, centerIndex: null },
  "4x4": { label: "4×4", cellCount: 16, centerIndex: null },
  "1xN": { label: "リスト", cellCount: null, centerIndex: null },
  radial8: { label: "放射 (中心+8)", cellCount: 9, centerIndex: 0 },
};

export const DEFAULT_PATTERN = "3x3";
const DEFAULT_VARIABLE_CELL_COUNT = 5; // 1xN の初期マス数

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function createCell(text = "") {
  return {
    id: generateId("cell"),
    text,
    childGridId: null,
  };
}

/**
 * Gridを生成する
 * @param {string} pattern - GRID_PATTERNS のキー
 * @param {Object} [options]
 * @param {string|null} [options.parentCellId] - 親Gridのどのセルから展開されたか
 * @param {number} [options.cellCount] - 可変長パターン(1xN)のマス数
 */
export function createGrid(pattern = DEFAULT_PATTERN, options = {}) {
  const def = GRID_PATTERNS[pattern];
  if (!def) {
    throw new Error(`UNKNOWN_PATTERN: ${pattern}`);
  }

  const count = def.cellCount ?? options.cellCount ?? DEFAULT_VARIABLE_CELL_COUNT;
  const cells = {};
  const cellIds = [];
  for (let i = 0; i < count; i++) {
    const cell = createCell();
    cells[cell.id] = cell;
    cellIds.push(cell.id);
  }

  return {
    id: generateId("grid"),
    pattern,
    centerCellId: def.centerIndex != null ? cellIds[def.centerIndex] : null,
    cellIds,
    parentCellId: options.parentCellId ?? null,
    cells,
  };
}

export function createBoard(title = "") {
  const rootGrid = createGrid(DEFAULT_PATTERN);
  return {
    id: generateId("board"),
    schemaVersion: SCHEMA_VERSION,
    title,
    rootGridId: rootGrid.id,
    grids: { [rootGrid.id]: rootGrid },
    freeNodes: [],
    memo: "",
    tags: [],
    todos: [],
    linkedGarageIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function isBoard(data) {
  return !!data && data.schemaVersion === SCHEMA_VERSION && !!data.grids;
}

/**
 * v1マンダラ ({cells: {1..9}}) を v2 Board に変換する。
 * - 非破壊: 引数は変更せず、新しいオブジェクトを返す
 * - 冪等: すでに v2 ならそのまま返す
 * - IDは維持する (ストレージ上のドキュメントIDを変えない)
 */
export function migrateMandaraToBoard(mandara) {
  if (!mandara) return null;
  if (isBoard(mandara)) return mandara;

  const rootGrid = createGrid("3x3");
  // v1 のセル番号 1..9 を表示順に写像 (5番が中心 = centerIndex 4)
  rootGrid.cellIds.forEach((cellId, index) => {
    rootGrid.cells[cellId].text = String(mandara.cells?.[index + 1] ?? "");
  });

  return {
    id: mandara.id,
    schemaVersion: SCHEMA_VERSION,
    title: mandara.title ?? "",
    rootGridId: rootGrid.id,
    grids: { [rootGrid.id]: rootGrid },
    freeNodes: [],
    memo: mandara.memo ?? "",
    tags: Array.isArray(mandara.tags) ? [...mandara.tags] : [],
    todos: Array.isArray(mandara.todos) ? mandara.todos.map((t) => ({ ...t })) : [],
    linkedGarageIds: mandara.linkedGarageId ? [mandara.linkedGarageId] : [],
    createdAt: mandara.createdAt ?? new Date(),
    updatedAt: mandara.updatedAt ?? new Date(),
  };
}

/**
 * v2 Board を v1 マンダラ形式に戻す (ルートGridのみ)。
 * 旧UI・旧エクスポート経路との互換用。子Gridの情報は失われる。
 */
export function boardToLegacyMandara(board) {
  if (!board) return null;
  if (!isBoard(board)) return board;

  const rootGrid = board.grids[board.rootGridId];
  const cells = {};
  for (let i = 1; i <= 9; i++) {
    const cellId = rootGrid?.cellIds[i - 1];
    cells[i] = cellId ? rootGrid.cells[cellId]?.text ?? "" : "";
  }

  return {
    id: board.id,
    title: board.title,
    cells,
    memo: board.memo,
    tags: [...board.tags],
    todos: board.todos.map((t) => ({ ...t })),
    linkedGarageId: board.linkedGarageIds[0] ?? null,
    createdAt: board.createdAt,
    updatedAt: board.updatedAt,
  };
}

// --- 表示・射影ヘルパー ---

/**
 * ルートGridの9セルを v1 cells{1..9} 形式に射影する。
 * レガシー読み取り(list-view / insight / local-analyzer / export)用の
 * 派生シャドウ。Board が真実、これは常に再生成される読み取り専用キャッシュ。
 */
export function projectRootCells(board) {
  const root = getGrid(board, board?.rootGridId);
  const cells = {};
  for (let i = 1; i <= 9; i++) {
    const cellId = root?.cellIds[i - 1];
    cells[i] = cellId ? root.cells[cellId]?.text ?? "" : "";
  }
  return cells;
}

/**
 * 表示用: 指定Gridの各マスを position 順(1始まり)で返す。
 * @returns {Array<{position, cellId, text, isCenter, hasChild}>}
 */
export function getGridDisplayCells(board, gridId) {
  const grid = getGrid(board, gridId);
  if (!grid) return [];
  return grid.cellIds.map((cellId, index) => {
    const cell = grid.cells[cellId];
    return {
      position: index + 1,
      cellId,
      text: cell?.text ?? "",
      isCenter: grid.centerCellId === cellId,
      hasChild: !!cell?.childGridId,
    };
  });
}

// --- ツリー探索ヘルパー ---

export function getGrid(board, gridId) {
  return board?.grids?.[gridId] ?? null;
}

export function getCell(board, gridId, cellId) {
  return getGrid(board, gridId)?.cells?.[cellId] ?? null;
}

/** セルIDから、そのセルを含むGridを探す */
export function findGridOfCell(board, cellId) {
  for (const grid of Object.values(board.grids)) {
    if (grid.cells[cellId]) return grid;
  }
  return null;
}

/** 指定Gridからルートまでの祖先GridID列 (自身は含まない、ルートが末尾) */
export function getAncestorGridIds(board, gridId) {
  const ancestors = [];
  const visited = new Set([gridId]);
  let current = getGrid(board, gridId);

  while (current?.parentCellId) {
    const parentGrid = findGridOfCell(board, current.parentCellId);
    if (!parentGrid || visited.has(parentGrid.id)) break; // 循環ガード
    ancestors.push(parentGrid.id);
    visited.add(parentGrid.id);
    current = parentGrid;
  }
  return ancestors;
}

/**
 * パンくずリスト: ルート → 指定Grid の順で
 * [{gridId, label}] を返す。labelは展開元セルのテキスト(ルートはBoardタイトル)。
 */
export function getBreadcrumb(board, gridId) {
  const path = [gridId, ...getAncestorGridIds(board, gridId)].reverse();
  return path.map((id) => {
    const grid = getGrid(board, id);
    if (!grid?.parentCellId) {
      return { gridId: id, label: board.title || "ルート" };
    }
    const parentCell = getCell(
      board,
      findGridOfCell(board, grid.parentCellId).id,
      grid.parentCellId
    );
    return { gridId: id, label: parentCell?.text || "(無題)" };
  });
}

/** 指定Grid以下のサブツリーの全GridID (自身を含む) */
export function collectSubtreeGridIds(board, gridId) {
  const result = [];
  const stack = [gridId];
  const visited = new Set();

  while (stack.length > 0) {
    const id = stack.pop();
    if (visited.has(id)) continue; // 循環ガード
    visited.add(id);
    const grid = getGrid(board, id);
    if (!grid) continue;
    result.push(id);
    for (const cellId of grid.cellIds) {
      const childId = grid.cells[cellId]?.childGridId;
      if (childId) stack.push(childId);
    }
  }
  return result;
}

// --- フラクタル操作 ---

/**
 * ズームイン: セルを中枢として子Gridを展開する。
 * - 中心セルは展開不可 (中心 = このGrid自身のテーマ)
 * - すでに子があれば既存の子Gridを返す (冪等)
 * @returns {Object|null} 子Grid
 */
export function expandCell(board, gridId, cellId, pattern = DEFAULT_PATTERN) {
  const grid = getGrid(board, gridId);
  const cell = getCell(board, gridId, cellId);
  if (!grid || !cell) return null;
  if (grid.centerCellId === cellId) return null;

  if (cell.childGridId) {
    return getGrid(board, cell.childGridId);
  }

  const childGrid = createGrid(pattern, { parentCellId: cellId });
  // 子の中心テキストは親セルを写す (親が正、二重データにしない)
  if (childGrid.centerCellId) {
    childGrid.cells[childGrid.centerCellId].text = cell.text;
  }
  cell.childGridId = childGrid.id;
  board.grids[childGrid.id] = childGrid;
  return childGrid;
}

/**
 * ズームアウト: 現在のルートを1マスとして含む親Gridを新設し、
 * それを新しいルートにする。
 * @param {Object} [options]
 * @param {string} [options.pattern] - 親Gridのパターン
 * @param {number} [options.slotIndex] - 現ルートを配置する周辺セルの位置
 * @returns {Object|null} 新しいルートGrid
 */
export function createParentGrid(board, options = {}) {
  const oldRoot = getGrid(board, board.rootGridId);
  if (!oldRoot) return null;

  const parentGrid = createGrid(options.pattern ?? DEFAULT_PATTERN);
  const perimeterIds = parentGrid.cellIds.filter(
    (id) => id !== parentGrid.centerCellId
  );
  const slot =
    perimeterIds[
      Math.min(options.slotIndex ?? 0, perimeterIds.length - 1)
    ];
  const slotCell = parentGrid.cells[slot];

  // 現ルートのテーマ (中心テキスト or Boardタイトル) を親のセルに写す
  const oldCenterText = oldRoot.centerCellId
    ? oldRoot.cells[oldRoot.centerCellId].text
    : "";
  slotCell.text = oldCenterText || board.title || "";
  slotCell.childGridId = oldRoot.id;
  oldRoot.parentCellId = slotCell.id;

  board.grids[parentGrid.id] = parentGrid;
  board.rootGridId = parentGrid.id;
  return parentGrid;
}

/**
 * セルのテキストを更新し、親子の中心同期を保つ。
 * - セルが子Gridを持つ → 子の中心セルに写す
 * - セルがGridの中心 かつ 親を持つ → 親セルに写す
 * 同値なら何もしないため再帰は必ず停止する。
 */
export function setCellText(board, gridId, cellId, text) {
  const grid = getGrid(board, gridId);
  const cell = getCell(board, gridId, cellId);
  if (!grid || !cell) return false;
  if (cell.text === text) return false;

  cell.text = text;

  // 下方向: 子Gridの中心へ
  if (cell.childGridId) {
    const child = getGrid(board, cell.childGridId);
    if (child?.centerCellId) {
      setCellText(board, child.id, child.centerCellId, text);
    }
  }

  // 上方向: 自分が中心なら親セルへ
  if (grid.centerCellId === cellId && grid.parentCellId) {
    const parentGrid = findGridOfCell(board, grid.parentCellId);
    if (parentGrid) {
      setCellText(board, parentGrid.id, grid.parentCellId, text);
    }
  }
  return true;
}

/**
 * サブツリーを削除する。ルートGridは削除不可。
 * 親セル側の childGridId も解除する (双方向整合の維持)。
 * @returns {string[]} 削除されたGridID
 */
export function removeGridSubtree(board, gridId) {
  if (gridId === board.rootGridId) return [];
  const grid = getGrid(board, gridId);
  if (!grid) return [];

  if (grid.parentCellId) {
    const parentGrid = findGridOfCell(board, grid.parentCellId);
    const parentCell = parentGrid?.cells[grid.parentCellId];
    if (parentCell) parentCell.childGridId = null;
  }

  const ids = collectSubtreeGridIds(board, gridId);
  for (const id of ids) {
    delete board.grids[id];
  }
  return ids;
}

// --- 整合性チェック ---

/**
 * Boardの構造整合性を検査し、問題の一覧を返す (空配列 = 正常)。
 * 双方向リンクの破れ・孤児Grid・循環を検出する。
 */
export function validateBoard(board) {
  const issues = [];
  if (!board || !isBoard(board)) {
    return ["NOT_A_BOARD"];
  }
  if (!board.grids[board.rootGridId]) {
    issues.push(`MISSING_ROOT_GRID: ${board.rootGridId}`);
    return issues;
  }

  for (const grid of Object.values(board.grids)) {
    // Cell.childGridId → Grid.parentCellId の整合
    for (const cellId of grid.cellIds) {
      const cell = grid.cells[cellId];
      if (!cell) {
        issues.push(`MISSING_CELL: ${grid.id}/${cellId}`);
        continue;
      }
      if (cell.childGridId) {
        const child = board.grids[cell.childGridId];
        if (!child) {
          issues.push(`DANGLING_CHILD_LINK: ${grid.id}/${cellId} -> ${cell.childGridId}`);
        } else if (child.parentCellId !== cellId) {
          issues.push(`BROKEN_BACKLINK: ${cell.childGridId}`);
        }
      }
    }
    // Grid.parentCellId → 所属Gridの存在
    if (grid.parentCellId && !findGridOfCell(board, grid.parentCellId)) {
      issues.push(`DANGLING_PARENT_LINK: ${grid.id} -> ${grid.parentCellId}`);
    }
  }

  // ルートから到達できないGrid (孤児) と循環
  const reachable = new Set(collectSubtreeGridIds(board, board.rootGridId));
  for (const gridId of Object.keys(board.grids)) {
    if (!reachable.has(gridId)) {
      issues.push(`ORPHAN_GRID: ${gridId}`);
    }
  }

  return issues;
}
