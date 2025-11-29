import { describe, it, expect, beforeEach } from "vitest";
import {
  createNewMandara,
  addTag,
  editTag,
  removeTag,
  addTodo,
  editTodo,
  toggleTodo,
  removeTodo,
} from "../js/mandara-logic.js";

describe("Mandara Logic", () => {
  let mandara;

  beforeEach(() => {
    mandara = createNewMandara();
  });

  describe("createNewMandara", () => {
    it("should create a new mandara with default values", () => {
      expect(mandara.id).toBeDefined();
      expect(mandara.title).toBe("");
      expect(mandara.cells).toBeDefined();
      expect(mandara.tags).toEqual([]);
      expect(mandara.todos).toEqual([]);
    });
  });

  describe("Tags", () => {
    it("should add a valid tag", () => {
      const result = addTag(mandara, "Tag1");
      expect(result).toBe(true);
      expect(mandara.tags).toContain("Tag1");
    });

    it("should trim tag whitespace", () => {
      addTag(mandara, "  Tag1  ");
      expect(mandara.tags).toContain("Tag1");
    });

    it("should not add empty tag", () => {
      const result = addTag(mandara, "   ");
      expect(result).toBe(false);
      expect(mandara.tags.length).toBe(0);
    });

    it("should not add duplicate tag", () => {
      addTag(mandara, "Tag1");
      const result = addTag(mandara, "Tag1");
      expect(result).toBe(false);
      expect(mandara.tags.length).toBe(1);
    });

    it("should edit a tag", () => {
      addTag(mandara, "OldTag");
      const result = editTag(mandara, 0, "NewTag");
      expect(result).toBe(true);
      expect(mandara.tags[0]).toBe("NewTag");
    });

    it("should throw error on duplicate edit", () => {
      addTag(mandara, "Tag1");
      addTag(mandara, "Tag2");
      expect(() => editTag(mandara, 1, "Tag1")).toThrow("DUPLICATE_TAG");
    });

    it("should remove a tag", () => {
      addTag(mandara, "Tag1");
      const result = removeTag(mandara, "Tag1");
      expect(result).toBe(true);
      expect(mandara.tags).not.toContain("Tag1");
    });
  });

  describe("Todos", () => {
    it("should add a todo", () => {
      const todo = addTodo(mandara, "Buy milk");
      expect(todo).toBeDefined();
      expect(todo.text).toBe("Buy milk");
      expect(todo.completed).toBe(false);
      expect(mandara.todos.length).toBe(1);
    });

    it("should edit a todo", () => {
      const todo = addTodo(mandara, "Buy milk");
      const result = editTodo(mandara, todo.id, "Buy almond milk");
      expect(result).toBe(true);
      expect(mandara.todos[0].text).toBe("Buy almond milk");
    });

    it("should toggle a todo", () => {
      const todo = addTodo(mandara, "Buy milk");
      const result = toggleTodo(mandara, todo.id);
      expect(result).toBe(true);
      expect(mandara.todos[0].completed).toBe(true);

      toggleTodo(mandara, todo.id);
      expect(mandara.todos[0].completed).toBe(false);
    });

    it("should remove a todo", () => {
      const todo = addTodo(mandara, "Buy milk");
      const result = removeTodo(mandara, todo.id);
      expect(result).toBe(true);
      expect(mandara.todos.length).toBe(0);
    });
  });
});
