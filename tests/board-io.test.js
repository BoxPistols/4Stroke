/**
 * Board IO (JSONバックアップ) のユニットテスト
 */
import { describe, it, expect } from "vitest";
import {
  BACKUP_TYPE,
  BACKUP_VERSION,
  exportMandarasToJson,
  parseMandarasJson,
  mergeMandaras,
  buildBackupFilename,
} from "../js/board-io.js";
import { createNewMandara } from "../js/mandara-logic.js";
import { createBoard } from "../js/board-logic.js";

function sampleMandara(overrides = {}) {
  const m = createNewMandara();
  m.title = "sample";
  m.cells[1] = "a";
  m.updatedAt = "2026-01-01T00:00:00.000Z";
  return { ...m, ...overrides };
}

describe("exportMandarasToJson / parseMandarasJson round-trip", () => {
  it("round-trips v1 mandaras and order", () => {
    const mandaras = [sampleMandara({ id: "m1" }), sampleMandara({ id: "m2" })];
    const json = exportMandarasToJson(mandaras, ["m2", "m1"]);

    const envelope = JSON.parse(json);
    expect(envelope.type).toBe(BACKUP_TYPE);
    expect(envelope.version).toBe(BACKUP_VERSION);
    expect(envelope.count).toBe(2);

    const parsed = parseMandarasJson(json);
    expect(parsed.mandaras.map((m) => m.id)).toEqual(["m1", "m2"]);
    expect(parsed.mandaraOrder).toEqual(["m2", "m1"]);
    expect(parsed.mandaras[0].cells[1]).toBe("a");
  });

  it("passes v2 boards through untouched", () => {
    const board = createBoard("v2");
    const parsed = parseMandarasJson(exportMandarasToJson([board]));
    expect(parsed.mandaras[0].schemaVersion).toBe(2);
    expect(parsed.mandaras[0].rootGridId).toBe(board.rootGridId);
  });

  it("accepts a raw mandara array (localStorage direct copy)", () => {
    const raw = JSON.stringify([sampleMandara({ id: "m1" })]);
    const parsed = parseMandarasJson(raw);
    expect(parsed.mandaras).toHaveLength(1);
    expect(parsed.mandaraOrder).toEqual([]);
  });

  it("fills missing v1 fields with defaults", () => {
    const raw = JSON.stringify([{ id: "m1" }]);
    const [m] = parseMandarasJson(raw).mandaras;
    expect(m.cells[9]).toBe("");
    expect(m.tags).toEqual([]);
    expect(m.todos).toEqual([]);
  });
});

describe("parseMandarasJson validation", () => {
  it("rejects broken JSON", () => {
    expect(() => parseMandarasJson("{oops")).toThrow("INVALID_JSON");
  });

  it("rejects unrelated objects", () => {
    expect(() => parseMandarasJson('{"hello":1}')).toThrow("INVALID_FORMAT");
  });

  it("rejects items without an id", () => {
    expect(() => parseMandarasJson('[{"title":"no id"}]')).toThrow(
      "INVALID_FORMAT"
    );
  });

  it("rejects future backup versions", () => {
    const json = JSON.stringify({
      type: BACKUP_TYPE,
      version: BACKUP_VERSION + 1,
      mandaras: [],
    });
    expect(() => parseMandarasJson(json)).toThrow("UNSUPPORTED_VERSION");
  });
});

describe("mergeMandaras", () => {
  it("adds unknown ids", () => {
    const existing = [sampleMandara({ id: "m1" })];
    const incoming = [sampleMandara({ id: "m2" })];
    const result = mergeMandaras(existing, incoming);
    expect(result.added).toEqual(["m2"]);
    expect(result.merged).toHaveLength(2);
  });

  it("replaces only when the import is newer", () => {
    const existing = [
      sampleMandara({ id: "m1", title: "old", updatedAt: "2026-01-01T00:00:00Z" }),
      sampleMandara({ id: "m2", title: "current", updatedAt: "2026-06-01T00:00:00Z" }),
    ];
    const incoming = [
      sampleMandara({ id: "m1", title: "newer", updatedAt: "2026-05-01T00:00:00Z" }),
      sampleMandara({ id: "m2", title: "stale", updatedAt: "2026-02-01T00:00:00Z" }),
    ];
    const result = mergeMandaras(existing, incoming);
    expect(result.updated).toEqual(["m1"]);
    expect(result.skipped).toEqual(["m2"]);
    expect(result.merged.find((m) => m.id === "m1").title).toBe("newer");
    expect(result.merged.find((m) => m.id === "m2").title).toBe("current");
  });

  it("does not mutate its inputs", () => {
    const existing = [sampleMandara({ id: "m1" })];
    const incoming = [sampleMandara({ id: "m1", updatedAt: "2027-01-01T00:00:00Z" })];
    mergeMandaras(existing, incoming);
    expect(existing[0].updatedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("handles Firestore Timestamp-like updatedAt", () => {
    const ts = { toDate: () => new Date("2026-06-01T00:00:00Z") };
    const existing = [sampleMandara({ id: "m1", updatedAt: ts })];
    const incoming = [sampleMandara({ id: "m1", updatedAt: "2026-01-02T00:00:00Z" })];
    expect(mergeMandaras(existing, incoming).skipped).toEqual(["m1"]);
  });
});

describe("buildBackupFilename", () => {
  it("formats a timestamped filename", () => {
    const name = buildBackupFilename(new Date(2026, 6, 10, 9, 5));
    expect(name).toBe("4strokes-backup-20260710-0905.json");
  });
});
