// Firebase 可用性チェック (Firebase CDN を読まない軽量モジュール)
//
// env-config.generated.js のみを参照して apiKey の有無を判定する。
// テスト環境でも安全に import できる。

let _available = false;
let _loadPromise = null;

/**
 * env-config.generated.js を動的 import して apiKey の有無を判定
 */
async function loadAndCheck() {
  if (_loadPromise) return _loadPromise;
  _loadPromise = (async () => {
    try {
      // @vite-ignore: env-config.generated.js はビルド時生成ファイル
      const mod = await import(/* @vite-ignore */ './env-config.generated.js');
      _available = !!(mod.ENV_CONFIG?.FIREBASE?.apiKey);
    } catch {
      _available = false;
    }
    return _available;
  })();
  return _loadPromise;
}

// ブラウザ環境でのみ即時ロード開始
if (typeof window !== 'undefined') {
  loadAndCheck();
}

/**
 * Firebase が利用可能か (apiKey が設定されているか) — 同期
 * ロード完了前は false を返すため、確実性が必要な場合は waitForCheck() を await すること
 */
export function isFirebaseAvailable() {
  return _available;
}

/**
 * 可用性チェックの完了を待つ (アプリ初期化時に一度 await する)
 */
export function waitForFirebaseCheck() {
  return _loadPromise || Promise.resolve(_available);
}

/**
 * テスト用: Firebase 可用性を手動で設定
 */
export function __setFirebaseAvailable(value) {
  _available = !!value;
  _loadPromise = Promise.resolve(_available);
}
