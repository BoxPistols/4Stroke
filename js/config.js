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

import { ENV_CONFIG } from './env-config.generated.js';

const getEmailFromEnv = () => {
  // 1. グローバル設定オブジェクト（Vercel等の注入用）
  if (typeof window !== 'undefined' && window.__CONFIG__?.ALLOWED_GOOGLE_EMAIL) {
    return window.__CONFIG__.ALLOWED_GOOGLE_EMAIL;
  }

  // 2. 生成された環境設定ファイルから取得
  if (ENV_CONFIG.APP.ALLOWED_GOOGLE_EMAIL) {
    return ENV_CONFIG.APP.ALLOWED_GOOGLE_EMAIL;
  }

  return '';
};

export const CONFIG = {
  // Google ログイン許可メールアドレス
  // 他のメールアドレスでログインしようとするとエラーになります
  ALLOWED_GOOGLE_EMAIL: getEmailFromEnv(),
};
