/**
 * アプリケーション設定
 *
 * 環境変数の優先順位：
 * 1. window.__CONFIG__ グローバル変数（Vercelスクリプトタグから注入）
 * 2. ここで定義されたデフォルト値
 *
 * このファイルは .gitignore に登録されています
 * ローカル開発時は、このファイルに個人情報を記載してください
 */

const getEmailFromEnv = () => {
  // グローバル設定オブジェクトから読み込み
  if (typeof window !== 'undefined' && window.__CONFIG__?.ALLOWED_GOOGLE_EMAIL) {
    console.log('[INFO] Using email from global config:', window.__CONFIG__.ALLOWED_GOOGLE_EMAIL);
    return window.__CONFIG__.ALLOWED_GOOGLE_EMAIL;
  }

  // デフォルト値（ローカル開発用）
  console.log('[INFO] Using default email from config.js');
  return 'ito.atsu.mail@gmail.com';
};

export const CONFIG = {
  // Google ログイン許可メールアドレス
  // 他のメールアドレスでログインしようとするとエラーになります
  ALLOWED_GOOGLE_EMAIL: getEmailFromEnv(),
};
