/**
 * Mandara Logic Module
 * Contains pure functions for manipulating Mandara data structure.
 * Decoupled from DOM/UI logic for easier testing.
 */

// Generate unique ID (helper)
export function generateId() {
  return `mandara_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create new mandara
export function createNewMandara() {
  return {
    id: generateId(),
    title: "",
    cells: {
      1: "",
      2: "",
      3: "",
      4: "",
      5: "",
      6: "",
      7: "",
      8: "",
      9: "",
    },
    memo: "",
    tags: [],
    todos: [],
    linkedGarageId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// --- Tags Logic ---

export function addTag(mandara, tag) {
  if (!mandara || !tag) return false;

  const trimmedTag = tag.trim();
  if (!trimmedTag) return false;

  if (!mandara.tags) {
    mandara.tags = [];
  }

  if (!mandara.tags.includes(trimmedTag)) {
    mandara.tags.push(trimmedTag);
    return true;
  }

  return false; // Already exists
}

export function editTag(mandara, index, newTag) {
  if (!mandara || !mandara.tags || index < 0 || index >= mandara.tags.length)
    return false;
  if (newTag === null) return false; // Cancelled

  const trimmedTag = newTag.trim();
  const oldTag = mandara.tags[index];

  if (trimmedTag === "") {
    // Empty tag means delete (handled by caller usually, but logic-wise we could return a specific code or just false)
    // For this logic, we'll assume empty means "do nothing" or "invalid update"
    // The UI handles the "empty -> delete?" confirmation.
    return false;
  }

  if (trimmedTag === oldTag) return false; // No change

  // Check for duplicates
  if (
    mandara.tags.includes(trimmedTag) &&
    mandara.tags.indexOf(trimmedTag) !== index
  ) {
    throw new Error("DUPLICATE_TAG");
  }

  mandara.tags[index] = trimmedTag;
  return true;
}

export function removeTag(mandara, tag) {
  if (!mandara || !mandara.tags) return false;

  const initialLength = mandara.tags.length;
  mandara.tags = mandara.tags.filter((t) => t !== tag);

  return mandara.tags.length !== initialLength;
}

// --- Todos Logic ---

export function addTodo(mandara, text) {
  if (!mandara || !text) return null;

  const trimmedText = text.trim();
  if (!trimmedText) return null;

  if (!mandara.todos) {
    mandara.todos = [];
  }

  const todo = {
    id: `todo_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    text: trimmedText,
    completed: false,
  };

  mandara.todos.push(todo);
  return todo;
}

export function editTodo(mandara, id, newText) {
  if (!mandara || !mandara.todos) return false;

  const todo = mandara.todos.find((t) => t.id === id);
  if (!todo) return false;

  if (newText === null) return false;

  const trimmedText = newText.trim();
  if (trimmedText === "" || trimmedText === todo.text) return false;

  todo.text = trimmedText;
  return true;
}

export function toggleTodo(mandara, id) {
  if (!mandara || !mandara.todos) return false;

  const todo = mandara.todos.find((t) => t.id === id);
  if (!todo) return false;

  todo.completed = !todo.completed;
  return true;
}

export function removeTodo(mandara, id) {
  if (!mandara || !mandara.todos) return false;

  const initialLength = mandara.todos.length;
  mandara.todos = mandara.todos.filter((t) => t.id !== id);

  return mandara.todos.length !== initialLength;
}
