/**
 * Board Logic (schema v2) のユニットテスト
 * docs/MANDARA_EVOLUTION_PLAN.md §1-§3 の仕様を検証する
 */
import { describe, it, expect } from "vitest";
import {
  SCHEMA_VERSION,
  GRID_PATTERNS,
  createBoard,
  createGrid,
  isBoard,
  migrateMandaraToBoard,
  boardToLegacyMandara,
  getGrid,
  findGridOfCell,
  getAncestorGridIds,
  getBreadcrumb,
  collectSubtreeGridIds,
  expandCell,
  createParentGrid,
  setCellText,
  removeGridSubtree,
  validateBoard,
  projectRootCells,
  getGridDisplayCells,
  isGridEmpty,
} from "../js/board-logic.js";
import { createNewMandara } from "../js/mandara-logic.js";

// テスト用: ルートGridの周辺セル(中心以外)の先頭を返す
function firstPerimeterCellId(grid) {
  return grid.cellIds.find((id) => id !== grid.centerCellId);
}

describe("createGrid / createBoard", () => {
  it("creates a 3x3 grid with 9 cells and a center", () => {
    const grid = createGrid("3x3");
    expect(grid.cellIds).toHaveLength(9);
    expect(grid.centerCellId).toBe(grid.cellIds[4]);
    expect(grid.parentCellId).toBeNull();
  });

  it("creates pattern variants with correct cell counts", () => {
    expect(createGrid("2x2").cellIds).toHaveLength(4);
    expect(createGrid("4x4").cellIds).toHaveLength(16);
    expect(createGrid("radial8").cellIds).toHaveLength(9);
    expect(createGrid("1xN", { cellCount: 7 }).cellIds).toHaveLength(7);
  });

  it("2x2 and 4x4 have no center cell", () => {
    expect(createGrid("2x2").centerCellId).toBeNull();
    expect(createGrid("4x4").centerCellId).toBeNull();
  });

  it("throws on unknown pattern", () => {
    expect(() => createGrid("5x5")).toThrow("UNKNOWN_PATTERN");
  });

  it("creates a valid board with a root grid", () => {
    const board = createBoard("My Board");
    expect(isBoard(board)).toBe(true);
    expect(board.schemaVersion).toBe(SCHEMA_VERSION);
    expect(getGrid(board, board.rootGridId)).toBeTruthy();
    expect(validateBoard(board)).toEqual([]);
  });

  it("all defined patterns are creatable", () => {
    for (const pattern of Object.keys(GRID_PATTERNS)) {
      expect(createGrid(pattern).pattern).toBe(pattern);
    }
  });
});

describe("migrateMandaraToBoard (v1 -> v2)", () => {
  it("maps v1 cells 1..9 in order, cell 5 becomes the center", () => {
    const v1 = createNewMandara();
    v1.title = "2024年の目標";
    for (let i = 1; i <= 9; i++) v1.cells[i] = `cell-${i}`;
    v1.tags = ["health"];
    v1.todos = [{ id: "t1", text: "run", completed: false }];
    v1.linkedGarageId = "garage1";

    const board = migrateMandaraToBoard(v1);
    expect(isBoard(board)).toBe(true);
    expect(board.id).toBe(v1.id); // ID維持 (ストレージのdoc IDを変えない)
    expect(board.title).toBe("2024年の目標");
    expect(board.tags).toEqual(["health"]);
    expect(board.todos).toEqual(v1.todos);
    expect(board.linkedGarageIds).toEqual(["garage1"]);

    const root = getGrid(board, board.rootGridId);
    root.cellIds.forEach((cellId, index) => {
      expect(root.cells[cellId].text).toBe(`cell-${index + 1}`);
    });
    expect(root.cells[root.centerCellId].text).toBe("cell-5");
    expect(validateBoard(board)).toEqual([]);
  });

  it("is idempotent: migrating a board returns it unchanged", () => {
    const board = createBoard("x");
    expect(migrateMandaraToBoard(board)).toBe(board);
  });

  it("does not mutate the v1 input", () => {
    const v1 = createNewMandara();
    v1.cells[1] = "a";
    const snapshot = JSON.parse(JSON.stringify(v1));
    migrateMandaraToBoard(v1);
    expect(JSON.parse(JSON.stringify(v1))).toEqual(snapshot);
  });

  it("tolerates missing optional fields", () => {
    const board = migrateMandaraToBoard({ id: "m1", cells: { 1: "a" } });
    expect(isBoard(board)).toBe(true);
    expect(board.tags).toEqual([]);
    expect(board.todos).toEqual([]);
    expect(board.linkedGarageIds).toEqual([]);
    expect(validateBoard(board)).toEqual([]);
  });
});

describe("boardToLegacyMandara (v2 -> v1 互換)", () => {
  it("round-trips root grid content back to v1 shape", () => {
    const v1 = createNewMandara();
    for (let i = 1; i <= 9; i++) v1.cells[i] = `c${i}`;
    const legacy = boardToLegacyMandara(migrateMandaraToBoard(v1));
    expect(legacy.id).toBe(v1.id);
    for (let i = 1; i <= 9; i++) expect(legacy.cells[i]).toBe(`c${i}`);
  });
});

describe("expandCell (ズームイン)", () => {
  it("creates a child grid whose center mirrors the parent cell", () => {
    const board = createBoard("root");
    const root = getGrid(board, board.rootGridId);
    const cellId = firstPerimeterCellId(root);
    setCellText(board, root.id, cellId, "健康");

    const child = expandCell(board, root.id, cellId);
    expect(child).toBeTruthy();
    expect(root.cells[cellId].childGridId).toBe(child.id);
    expect(child.parentCellId).toBe(cellId);
    expect(child.cells[child.centerCellId].text).toBe("健康");
    expect(validateBoard(board)).toEqual([]);
  });

  it("is idempotent: expanding twice returns the same child", () => {
    const board = createBoard("root");
    const root = getGrid(board, board.rootGridId);
    const cellId = firstPerimeterCellId(root);
    const first = expandCell(board, root.id, cellId);
    const second = expandCell(board, root.id, cellId);
    expect(second.id).toBe(first.id);
    expect(Object.keys(board.grids)).toHaveLength(2);
  });

  it("refuses to expand the center cell", () => {
    const board = createBoard("root");
    const root = getGrid(board, board.rootGridId);
    expect(expandCell(board, root.id, root.centerCellId)).toBeNull();
  });

  it("supports arbitrary depth", () => {
    const board = createBoard("root");
    let grid = getGrid(board, board.rootGridId);
    for (let depth = 0; depth < 5; depth++) {
      grid = expandCell(board, grid.id, firstPerimeterCellId(grid));
    }
    expect(Object.keys(board.grids)).toHaveLength(6);
    expect(getAncestorGridIds(board, grid.id)).toHaveLength(5);
    expect(validateBoard(board)).toEqual([]);
  });
});

describe("createParentGrid (ズームアウト)", () => {
  it("makes the old root a child cell of a new root", () => {
    const board = createBoard("成長戦略");
    const oldRootId = board.rootGridId;
    const oldRoot = getGrid(board, oldRootId);
    setCellText(board, oldRootId, oldRoot.centerCellId, "充実した人生");

    const newRoot = createParentGrid(board);
    expect(board.rootGridId).toBe(newRoot.id);
    expect(oldRoot.parentCellId).toBeTruthy();

    const slotCell = newRoot.cells[oldRoot.parentCellId];
    expect(slotCell.childGridId).toBe(oldRootId);
    expect(slotCell.text).toBe("充実した人生");
    expect(validateBoard(board)).toEqual([]);
  });

  it("falls back to board title when old root has no center text", () => {
    const board = createBoard("タイトル");
    createParentGrid(board);
    const newRoot = getGrid(board, board.rootGridId);
    const slotCell = Object.values(newRoot.cells).find((c) => c.childGridId);
    expect(slotCell.text).toBe("タイトル");
  });

  it("keeps the parent-cell/child-center mirror when falling back to title", () => {
    // 中心が空 + タイトルあり: スロットセルと旧ルート中心が一致すること
    const board = createBoard("大テーマ");
    const oldRootId = board.rootGridId;
    createParentGrid(board);
    const newRoot = getGrid(board, board.rootGridId);
    const slotCell = Object.values(newRoot.cells).find((c) => c.childGridId);
    const oldRoot = getGrid(board, oldRootId);
    expect(slotCell.text).toBe("大テーマ");
    expect(oldRoot.cells[oldRoot.centerCellId].text).toBe("大テーマ");
    // これで editing の同値ガードに阻まれずミラーが保たれる
    expect(slotCell.text).toBe(oldRoot.cells[oldRoot.centerCellId].text);
    expect(validateBoard(board)).toEqual([]);
  });

  it("clamps a negative slotIndex instead of crashing", () => {
    const board = createBoard("x");
    expect(() => createParentGrid(board, { slotIndex: -5 })).not.toThrow();
    const newRoot = getGrid(board, board.rootGridId);
    const slotCell = Object.values(newRoot.cells).find((c) => c.childGridId);
    expect(slotCell).toBeTruthy();
    expect(validateBoard(board)).toEqual([]);
  });

  it("can be applied repeatedly (parent of parent)", () => {
    const board = createBoard("x");
    const originalRootId = board.rootGridId;
    createParentGrid(board);
    createParentGrid(board);
    expect(Object.keys(board.grids)).toHaveLength(3);
    expect(getAncestorGridIds(board, originalRootId)).toHaveLength(2);
    expect(validateBoard(board)).toEqual([]);
  });
});

describe("setCellText (中心同期: 親が正)", () => {
  it("propagates parent cell edits down to the child center", () => {
    const board = createBoard("root");
    const root = getGrid(board, board.rootGridId);
    const cellId = firstPerimeterCellId(root);
    const child = expandCell(board, root.id, cellId);

    setCellText(board, root.id, cellId, "新テーマ");
    expect(child.cells[child.centerCellId].text).toBe("新テーマ");
  });

  it("propagates child center edits up to the parent cell", () => {
    const board = createBoard("root");
    const root = getGrid(board, board.rootGridId);
    const cellId = firstPerimeterCellId(root);
    const child = expandCell(board, root.id, cellId);

    setCellText(board, child.id, child.centerCellId, "子から編集");
    expect(root.cells[cellId].text).toBe("子から編集");
  });

  it("syncs across 3 levels without infinite recursion", () => {
    const board = createBoard("root");
    const root = getGrid(board, board.rootGridId);
    const cellId = firstPerimeterCellId(root);
    const child = expandCell(board, root.id, cellId);
    const grandChild = expandCell(
      board,
      child.id,
      firstPerimeterCellId(child)
    );

    // 孫の中心を編集 → 子の周辺セルに伝播 (孫中心⇄子セルの1ホップ)
    setCellText(board, grandChild.id, grandChild.centerCellId, "深い編集");
    expect(child.cells[grandChild.parentCellId].text).toBe("深い編集");
    // ルートのセルは孫と直接リンクしていないので変わらない
    expect(root.cells[cellId].text).not.toBe("深い編集");
  });

  it("returns false for unchanged text or missing cell", () => {
    const board = createBoard("root");
    const root = getGrid(board, board.rootGridId);
    const cellId = firstPerimeterCellId(root);
    setCellText(board, root.id, cellId, "a");
    expect(setCellText(board, root.id, cellId, "a")).toBe(false);
    expect(setCellText(board, root.id, "nope", "a")).toBe(false);
  });
});

describe("removeGridSubtree", () => {
  it("removes a subtree and clears the parent link", () => {
    const board = createBoard("root");
    const root = getGrid(board, board.rootGridId);
    const cellId = firstPerimeterCellId(root);
    const child = expandCell(board, root.id, cellId);
    expandCell(board, child.id, firstPerimeterCellId(child));

    const removed = removeGridSubtree(board, child.id);
    expect(removed).toHaveLength(2);
    expect(root.cells[cellId].childGridId).toBeNull();
    expect(Object.keys(board.grids)).toHaveLength(1);
    expect(validateBoard(board)).toEqual([]);
  });

  it("refuses to remove the root grid", () => {
    const board = createBoard("root");
    expect(removeGridSubtree(board, board.rootGridId)).toEqual([]);
    expect(getGrid(board, board.rootGridId)).toBeTruthy();
  });
});

describe("breadcrumb / traversal", () => {
  it("builds a breadcrumb from root to the focused grid", () => {
    const board = createBoard("人生設計");
    const root = getGrid(board, board.rootGridId);
    const cellId = firstPerimeterCellId(root);
    setCellText(board, root.id, cellId, "健康");
    const child = expandCell(board, root.id, cellId);

    const crumbs = getBreadcrumb(board, child.id);
    expect(crumbs.map((c) => c.label)).toEqual(["人生設計", "健康"]);
    expect(crumbs[0].gridId).toBe(root.id);
    expect(crumbs[1].gridId).toBe(child.id);
  });

  it("findGridOfCell locates the owning grid", () => {
    const board = createBoard("root");
    const root = getGrid(board, board.rootGridId);
    const child = expandCell(board, root.id, firstPerimeterCellId(root));
    expect(findGridOfCell(board, child.centerCellId).id).toBe(child.id);
    expect(findGridOfCell(board, "missing")).toBeNull();
  });

  it("getBreadcrumb does not crash on a broken parent back-link", () => {
    const board = createBoard("root");
    const rootId = board.rootGridId;
    // 破損: 親セルの所属Gridが存在しないIDを指す孤児Gridを差し込む
    const orphan = createGrid("3x3", { parentCellId: "cell_ghost" });
    board.grids[orphan.id] = orphan;
    expect(() => getBreadcrumb(board, orphan.id)).not.toThrow();
    const crumbs = getBreadcrumb(board, orphan.id);
    expect(crumbs[crumbs.length - 1].label).toBe("(無題)");
    expect(() => getBreadcrumb(board, rootId)).not.toThrow();
  });
});

describe("isGridEmpty", () => {
  it("treats a fresh grid as empty and a filled one as non-empty", () => {
    const board = createBoard("");
    const root = getGrid(board, board.rootGridId);
    expect(isGridEmpty(root)).toBe(true);
    setCellText(board, root.id, firstPerimeterCellId(root), "何か");
    expect(isGridEmpty(root)).toBe(false);
  });

  it("treats a grid with a child link as non-empty even if text is blank", () => {
    const board = createBoard("");
    const root = getGrid(board, board.rootGridId);
    expandCell(board, root.id, firstPerimeterCellId(root));
    expect(isGridEmpty(root)).toBe(false);
  });

  it("returns true for null", () => {
    expect(isGridEmpty(null)).toBe(true);
  });
});

describe("projectRootCells (レガシー互換シャドウ)", () => {
  it("projects the root grid into cells{1..9}", () => {
    const board = createBoard("root");
    const root = getGrid(board, board.rootGridId);
    root.cellIds.forEach((cellId, i) => {
      root.cells[cellId].text = `c${i + 1}`;
    });
    const cells = projectRootCells(board);
    for (let i = 1; i <= 9; i++) expect(cells[i]).toBe(`c${i}`);
  });

  it("reflects only the root grid, not child grids", () => {
    const board = createBoard("root");
    const root = getGrid(board, board.rootGridId);
    const cellId = firstPerimeterCellId(root);
    setCellText(board, root.id, cellId, "健康");
    const child = expandCell(board, root.id, cellId);
    // 子の周辺セルを埋めても、ルート射影には出てこない
    setCellText(board, child.id, firstPerimeterCellId(child), "運動");
    const cells = projectRootCells(board);
    expect(Object.values(cells)).toContain("健康");
    expect(Object.values(cells)).not.toContain("運動");
  });

  it("returns empty strings for an empty board", () => {
    const cells = projectRootCells(createBoard(""));
    for (let i = 1; i <= 9; i++) expect(cells[i]).toBe("");
  });
});

describe("getGridDisplayCells", () => {
  it("returns 9 positioned cells with center flagged", () => {
    const board = createBoard("root");
    const display = getGridDisplayCells(board, board.rootGridId);
    expect(display).toHaveLength(9);
    expect(display[0].position).toBe(1);
    expect(display[4].isCenter).toBe(true);
    expect(display.filter((c) => c.isCenter)).toHaveLength(1);
  });

  it("flags cells that have a child grid", () => {
    const board = createBoard("root");
    const root = getGrid(board, board.rootGridId);
    const cellId = firstPerimeterCellId(root);
    expandCell(board, root.id, cellId);
    const display = getGridDisplayCells(board, root.id);
    const expanded = display.find((c) => c.cellId === cellId);
    expect(expanded.hasChild).toBe(true);
    expect(display.filter((c) => c.hasChild)).toHaveLength(1);
  });

  it("returns the focused child grid's cells, not the root's", () => {
    const board = createBoard("root");
    const root = getGrid(board, board.rootGridId);
    const child = expandCell(board, root.id, firstPerimeterCellId(root));
    setCellText(board, child.id, firstPerimeterCellId(child), "子の内容");
    const display = getGridDisplayCells(board, child.id);
    expect(display.map((c) => c.text)).toContain("子の内容");
  });

  it("returns [] for an unknown grid", () => {
    expect(getGridDisplayCells(createBoard(""), "missing")).toEqual([]);
  });
});

describe("validateBoard", () => {
  it("detects dangling child links", () => {
    const board = createBoard("root");
    const root = getGrid(board, board.rootGridId);
    root.cells[root.cellIds[0]].childGridId = "grid_missing";
    expect(validateBoard(board)).toContain(
      `DANGLING_CHILD_LINK: ${root.id}/${root.cellIds[0]} -> grid_missing`
    );
  });

  it("detects orphan grids", () => {
    const board = createBoard("root");
    const orphan = createGrid("3x3");
    board.grids[orphan.id] = orphan;
    expect(validateBoard(board)).toContain(`ORPHAN_GRID: ${orphan.id}`);
  });

  it("detects broken backlinks", () => {
    const board = createBoard("root");
    const root = getGrid(board, board.rootGridId);
    const child = expandCell(board, root.id, firstPerimeterCellId(root));
    child.parentCellId = root.centerCellId; // わざと不整合に
    expect(validateBoard(board)).toContain(`BROKEN_BACKLINK: ${child.id}`);
  });
});
