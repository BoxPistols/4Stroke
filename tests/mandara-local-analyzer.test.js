import { describe, it, expect } from "vitest";
import { createNewMandara } from "../js/mandara-logic.js";
import { analyzeLocally } from "../js/mandara-local-analyzer.js";

describe("Mandara Local Analyzer", () => {
  describe("analyzeLocally - basic stats", () => {
    it("should calculate 0% completeness for empty mandara", () => {
      const mandara = createNewMandara();
      const result = analyzeLocally(mandara);
      expect(result.completeness).toBe(0);
      expect(result.filledCount).toBe(0);
      expect(result.emptyCount).toBe(9);
    });

    it("should calculate 100% for fully filled mandara", () => {
      const mandara = createNewMandara();
      for (let i = 1; i <= 9; i++) {
        mandara.cells[i] = "content";
      }
      const result = analyzeLocally(mandara);
      expect(result.completeness).toBe(100);
      expect(result.filledCount).toBe(9);
      expect(result.emptyCount).toBe(0);
    });

    it("should calculate correct partial completeness", () => {
      const mandara = createNewMandara();
      mandara.cells[1] = "a";
      mandara.cells[2] = "b";
      mandara.cells[3] = "c";
      const result = analyzeLocally(mandara);
      expect(result.completeness).toBe(33);
      expect(result.filledCount).toBe(3);
    });

    it("should calculate total char count", () => {
      const mandara = createNewMandara();
      mandara.cells[1] = "abc";
      mandara.cells[2] = "de";
      const result = analyzeLocally(mandara);
      expect(result.stats.totalChars).toBe(5);
    });

    it("should calculate average chars per filled cell", () => {
      const mandara = createNewMandara();
      mandara.cells[1] = "aaaa"; // 4
      mandara.cells[2] = "bb"; // 2
      const result = analyzeLocally(mandara);
      expect(result.stats.avgCharsPerCell).toBe(3);
    });
  });

  describe("analyzeLocally - cell overview", () => {
    it("should list all 9 cells", () => {
      const mandara = createNewMandara();
      const result = analyzeLocally(mandara);
      expect(result.cellsOverview).toHaveLength(9);
    });

    it("should mark center cell (5)", () => {
      const mandara = createNewMandara();
      const result = analyzeLocally(mandara);
      const center = result.cellsOverview.find((c) => c.cellNumber === 5);
      expect(center.isCenter).toBe(true);
      expect(center.position).toBe("中心");
    });

    it("should include position labels", () => {
      const mandara = createNewMandara();
      const result = analyzeLocally(mandara);
      const labels = result.cellsOverview.map((c) => c.position);
      expect(labels).toEqual([
        "左上", "上", "右上",
        "左", "中心", "右",
        "左下", "下", "右下",
      ]);
    });

    it("should mark empty cells", () => {
      const mandara = createNewMandara();
      mandara.cells[1] = "filled";
      const result = analyzeLocally(mandara);
      const cell1 = result.cellsOverview.find((c) => c.cellNumber === 1);
      const cell2 = result.cellsOverview.find((c) => c.cellNumber === 2);
      expect(cell1.isEmpty).toBe(false);
      expect(cell2.isEmpty).toBe(true);
    });
  });

  describe("analyzeLocally - issue detection", () => {
    it("should detect missing center cell as high severity", () => {
      const mandara = createNewMandara();
      mandara.cells[1] = "a";
      mandara.cells[2] = "b";
      mandara.cells[3] = "c";
      const result = analyzeLocally(mandara);
      const centerIssue = result.issues.find((i) =>
        i.title.includes("中心テーマ")
      );
      expect(centerIssue).toBeDefined();
      expect(centerIssue.severity).toBe("high");
      expect(centerIssue.relatedCells).toContain(5);
    });

    it("should not flag center when filled", () => {
      const mandara = createNewMandara();
      mandara.cells[5] = "Main Theme";
      const result = analyzeLocally(mandara);
      const centerIssue = result.issues.find((i) =>
        i.title.includes("中心テーマが未設定")
      );
      expect(centerIssue).toBeUndefined();
    });

    it("should flag 6+ empty cells as medium/high severity", () => {
      const mandara = createNewMandara();
      mandara.cells[5] = "center";
      mandara.cells[1] = "one";
      // 7 empty surrounding
      const result = analyzeLocally(mandara);
      const gapIssue = result.issues.find((i) => i.type === "gap" && i.severity === "high");
      expect(gapIssue).toBeDefined();
    });

    it("should flag short cell content as ambiguity", () => {
      const mandara = createNewMandara();
      mandara.cells[5] = "center";
      mandara.cells[1] = "a"; // 1 char
      mandara.cells[2] = "abc"; // 3 chars
      mandara.cells[3] = "longer content here";
      const result = analyzeLocally(mandara);
      const ambiguityIssue = result.issues.find((i) => i.type === "ambiguity");
      expect(ambiguityIssue).toBeDefined();
      expect(ambiguityIssue.relatedCells).toContain(1);
      expect(ambiguityIssue.relatedCells).toContain(2);
    });

    it("should flag missing tags when enough content", () => {
      const mandara = createNewMandara();
      mandara.cells[1] = "content1";
      mandara.cells[2] = "content2";
      mandara.cells[5] = "center";
      const result = analyzeLocally(mandara);
      const tagIssue = result.issues.find((i) => i.title.includes("タグ"));
      expect(tagIssue).toBeDefined();
    });

    it("should not flag missing tags when tags exist", () => {
      const mandara = createNewMandara();
      mandara.cells[1] = "content1";
      mandara.cells[5] = "center";
      mandara.tags = ["tag1"];
      const result = analyzeLocally(mandara);
      const tagIssue = result.issues.find((i) => i.title === "タグが未設定");
      expect(tagIssue).toBeUndefined();
    });

    it("should flag all-completed todos", () => {
      const mandara = createNewMandara();
      mandara.cells[5] = "center";
      mandara.cells[1] = "one";
      mandara.todos = [
        { id: "t1", text: "done1", completed: true },
        { id: "t2", text: "done2", completed: true },
      ];
      const result = analyzeLocally(mandara);
      const todoIssue = result.issues.find((i) =>
        i.title.includes("未完了TODOなし")
      );
      expect(todoIssue).toBeDefined();
    });

    it("should not flag when active todos exist", () => {
      const mandara = createNewMandara();
      mandara.cells[5] = "center";
      mandara.todos = [
        { id: "t1", text: "done", completed: true },
        { id: "t2", text: "active", completed: false },
      ];
      const result = analyzeLocally(mandara);
      const todoIssue = result.issues.find((i) =>
        i.title.includes("未完了TODOなし")
      );
      expect(todoIssue).toBeUndefined();
    });
  });

  describe("analyzeLocally - suggested todos", () => {
    it("should suggest filling center when empty", () => {
      const mandara = createNewMandara();
      const result = analyzeLocally(mandara);
      const centerTodo = result.suggestedTodos.find((t) =>
        t.text.includes("中心セル")
      );
      expect(centerTodo).toBeDefined();
      expect(centerTodo.priority).toBe("urgent");
    });

    it("should suggest filling empty surrounding cells (max 3)", () => {
      const mandara = createNewMandara();
      mandara.cells[5] = "theme";
      const result = analyzeLocally(mandara);
      const cellFillTodos = result.suggestedTodos.filter((t) =>
        t.text.includes("に関連する観点を追加")
      );
      expect(cellFillTodos.length).toBeLessThanOrEqual(3);
      expect(cellFillTodos.length).toBeGreaterThan(0);
    });
  });

  describe("analyzeLocally - markdown output", () => {
    it("should not contain bold markdown syntax", () => {
      const mandara = createNewMandara();
      mandara.cells[5] = "theme";
      const result = analyzeLocally(mandara);
      expect(result.markdown).not.toContain("**");
    });

    it("should not contain italic markdown syntax", () => {
      const mandara = createNewMandara();
      const result = analyzeLocally(mandara);
      expect(result.markdown).not.toMatch(/_\([^)]+\)_/);
    });

    it("should not contain backticks for tags", () => {
      const mandara = createNewMandara();
      mandara.tags = ["tag1", "tag2"];
      const result = analyzeLocally(mandara);
      expect(result.markdown).not.toContain("`tag1`");
    });

    it("should include title line", () => {
      const mandara = createNewMandara();
      mandara.title = "MyTitle";
      const result = analyzeLocally(mandara);
      expect(result.markdown).toContain("タイトル: MyTitle");
    });

    it("should use (空) for empty cells", () => {
      const mandara = createNewMandara();
      const result = analyzeLocally(mandara);
      expect(result.markdown).toContain("(空)");
    });

    it("should use 読点 for tags separator", () => {
      const mandara = createNewMandara();
      mandara.tags = ["tag1", "tag2", "tag3"];
      const result = analyzeLocally(mandara);
      expect(result.markdown).toContain("tag1、tag2、tag3");
    });

    it("should include completed TODOs with 済 marker", () => {
      const mandara = createNewMandara();
      mandara.todos = [{ id: "t1", text: "done", completed: true }];
      const result = analyzeLocally(mandara);
      expect(result.markdown).toContain("済 done");
    });

    it("should include active TODOs with ・ marker", () => {
      const mandara = createNewMandara();
      mandara.todos = [{ id: "t1", text: "active", completed: false }];
      const result = analyzeLocally(mandara);
      expect(result.markdown).toContain("・ active");
    });
  });

  describe("analyzeLocally - summary", () => {
    it("should generate summary with status", () => {
      const mandara = createNewMandara();
      mandara.title = "Test";
      mandara.cells[5] = "Main";
      const result = analyzeLocally(mandara);
      expect(result.summary).toContain("Test");
      expect(result.summary).toContain("Main");
    });

    it("should describe status for nearly complete mandara", () => {
      const mandara = createNewMandara();
      mandara.title = "Done";
      for (let i = 1; i <= 9; i++) {
        mandara.cells[i] = "content";
      }
      const result = analyzeLocally(mandara);
      expect(result.summary).toContain("ほぼ完成");
    });

    it("should describe status for empty mandara", () => {
      const mandara = createNewMandara();
      const result = analyzeLocally(mandara);
      expect(result.summary).toContain("初期段階");
    });
  });
});
