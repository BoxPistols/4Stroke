import { describe, it, expect } from "vitest";
import { createNewMandara } from "../js/mandara-logic.js";
import {
  buildMandaraContext,
  countFilledCells,
  buildStructuralAnalysisPrompt,
  buildIssueExtractionPrompt,
  buildActionPlanPrompt,
  buildCrossAnalysisPrompt,
} from "../js/mandara-insight-prompts.js";

describe("Mandara Insight Prompts", () => {
  describe("countFilledCells", () => {
    it("should return 0 for empty mandara", () => {
      const mandara = createNewMandara();
      expect(countFilledCells(mandara)).toBe(0);
    });

    it("should count filled cells only", () => {
      const mandara = createNewMandara();
      mandara.cells[1] = "content";
      mandara.cells[5] = "center";
      mandara.cells[9] = "bottom";
      expect(countFilledCells(mandara)).toBe(3);
    });

    it("should treat whitespace-only cells as empty", () => {
      const mandara = createNewMandara();
      mandara.cells[1] = "   ";
      mandara.cells[2] = "\n\t ";
      mandara.cells[3] = "real content";
      expect(countFilledCells(mandara)).toBe(1);
    });

    it("should handle full mandara", () => {
      const mandara = createNewMandara();
      for (let i = 1; i <= 9; i++) {
        mandara.cells[i] = `cell${i}`;
      }
      expect(countFilledCells(mandara)).toBe(9);
    });
  });

  describe("buildMandaraContext", () => {
    it("should include title", () => {
      const mandara = createNewMandara();
      mandara.title = "My Goal";
      const ctx = buildMandaraContext(mandara);
      expect(ctx).toContain("【タイトル】My Goal");
    });

    it("should mark empty cells as (空)", () => {
      const mandara = createNewMandara();
      const ctx = buildMandaraContext(mandara);
      expect(ctx).toContain("(空)");
    });

    it("should include all 9 cell labels", () => {
      const mandara = createNewMandara();
      const ctx = buildMandaraContext(mandara);
      expect(ctx).toContain("セル1(左上)");
      expect(ctx).toContain("セル5(中心)");
      expect(ctx).toContain("セル9(右下)");
    });

    it("should include cell content", () => {
      const mandara = createNewMandara();
      mandara.cells[5] = "Main Theme";
      const ctx = buildMandaraContext(mandara);
      expect(ctx).toContain("Main Theme");
    });

    it("should format tags as comma-separated", () => {
      const mandara = createNewMandara();
      mandara.tags = ["foo", "bar", "baz"];
      const ctx = buildMandaraContext(mandara);
      expect(ctx).toContain("【タグ】foo, bar, baz");
    });

    it("should show (なし) for no tags", () => {
      const mandara = createNewMandara();
      const ctx = buildMandaraContext(mandara);
      expect(ctx).toContain("【タグ】(なし)");
    });

    it("should format todos with checkboxes", () => {
      const mandara = createNewMandara();
      mandara.todos = [
        { id: "t1", text: "Task 1", completed: false },
        { id: "t2", text: "Task 2", completed: true },
      ];
      const ctx = buildMandaraContext(mandara);
      expect(ctx).toContain("- [ ] Task 1");
      expect(ctx).toContain("- [x] Task 2");
    });

    it("should use (無題) for empty title", () => {
      const mandara = createNewMandara();
      const ctx = buildMandaraContext(mandara);
      expect(ctx).toContain("(無題)");
    });

    it("should include memo", () => {
      const mandara = createNewMandara();
      mandara.memo = "Important notes here";
      const ctx = buildMandaraContext(mandara);
      expect(ctx).toContain("Important notes here");
    });
  });

  describe("buildStructuralAnalysisPrompt", () => {
    it("should include mandara context", () => {
      const mandara = createNewMandara();
      mandara.title = "Test";
      const prompt = buildStructuralAnalysisPrompt(mandara);
      expect(prompt).toContain("Test");
    });

    it("should request JSON output", () => {
      const mandara = createNewMandara();
      const prompt = buildStructuralAnalysisPrompt(mandara);
      expect(prompt).toContain("JSON形式");
      expect(prompt).toContain("coherenceScore");
      expect(prompt).toContain("cellAnalysis");
      expect(prompt).toContain("coverage");
    });

    it("should specify analysis perspectives", () => {
      const mandara = createNewMandara();
      const prompt = buildStructuralAnalysisPrompt(mandara);
      expect(prompt).toContain("整合性");
      expect(prompt).toContain("カバレッジ");
    });
  });

  describe("buildIssueExtractionPrompt", () => {
    it("should request issue JSON structure", () => {
      const mandara = createNewMandara();
      const prompt = buildIssueExtractionPrompt(mandara);
      expect(prompt).toContain("issues");
      expect(prompt).toContain("severity");
      expect(prompt).toContain("overallRisk");
    });

    it("should specify issue types", () => {
      const mandara = createNewMandara();
      const prompt = buildIssueExtractionPrompt(mandara);
      expect(prompt).toContain("contradiction");
      expect(prompt).toContain("risk");
      expect(prompt).toContain("dependency");
    });
  });

  describe("buildActionPlanPrompt", () => {
    it("should include issues summary when provided", () => {
      const mandara = createNewMandara();
      const issues = [
        { severity: "high", title: "Issue1", description: "desc1" },
      ];
      const prompt = buildActionPlanPrompt(mandara, issues);
      expect(prompt).toContain("Issue1");
      expect(prompt).toContain("high");
    });

    it("should show (課題抽出なし) when no issues", () => {
      const mandara = createNewMandara();
      const prompt = buildActionPlanPrompt(mandara, []);
      expect(prompt).toContain("(課題抽出なし)");
    });

    it("should include GARAGE proposal structure", () => {
      const mandara = createNewMandara();
      const prompt = buildActionPlanPrompt(mandara, []);
      expect(prompt).toContain("garageProposal");
      expect(prompt).toContain("stroke1_key");
      expect(prompt).toContain("stroke2_issue");
      expect(prompt).toContain("stroke3_action");
      expect(prompt).toContain("stroke4_publish");
    });

    it("should include priority matrix quadrants", () => {
      const mandara = createNewMandara();
      const prompt = buildActionPlanPrompt(mandara, []);
      expect(prompt).toContain("urgent_important");
      expect(prompt).toContain("planned_important");
      expect(prompt).toContain("hold");
    });

    it("should handle null issues gracefully", () => {
      const mandara = createNewMandara();
      const prompt = buildActionPlanPrompt(mandara, null);
      expect(prompt).toContain("(課題抽出なし)");
    });
  });

  describe("buildCrossAnalysisPrompt", () => {
    it("should include all mandaras", () => {
      const m1 = createNewMandara();
      m1.title = "First";
      const m2 = createNewMandara();
      m2.title = "Second";
      const prompt = buildCrossAnalysisPrompt([m1, m2]);
      expect(prompt).toContain("First");
      expect(prompt).toContain("Second");
    });

    it("should number mandaras", () => {
      const m1 = createNewMandara();
      const m2 = createNewMandara();
      const prompt = buildCrossAnalysisPrompt([m1, m2]);
      expect(prompt).toContain("マンダラ 1");
      expect(prompt).toContain("マンダラ 2");
    });

    it("should request cross analysis JSON structure", () => {
      const m1 = createNewMandara();
      const m2 = createNewMandara();
      const prompt = buildCrossAnalysisPrompt([m1, m2]);
      expect(prompt).toContain("commonThemes");
      expect(prompt).toContain("dependencies");
      expect(prompt).toContain("overlaps");
      expect(prompt).toContain("strategicInsights");
    });
  });
});
