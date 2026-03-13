// Vitest セットアップファイル
// Node.js 25+ の組み込み localStorage が happy-dom と競合する問題を修正

if (typeof localStorage !== 'undefined' && typeof localStorage.clear !== 'function') {
  // Node.js の不完全な localStorage を完全な実装で置き換え
  const store = new Map();
  const localStorageMock = {
    getItem: (key) => store.has(key) ? store.get(key) : null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
    get length() { return store.size; },
    key: (index) => [...store.keys()][index] ?? null,
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });
}
