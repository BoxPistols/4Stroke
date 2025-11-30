// Firebase Authentication モジュール
import { auth } from './firebase-config.js';
import { CONFIG } from './config.js';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// デバッグ情報をログ出力
console.log('[DEBUG] auth.js loaded');
console.log('[DEBUG] CONFIG:', CONFIG);
console.log('[DEBUG] ALLOWED_GOOGLE_EMAIL:', CONFIG.ALLOWED_GOOGLE_EMAIL);

/**
 * Googleログイン
 * @returns {Promise<User>} ログインしたユーザー情報
 */
export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  // 毎回アカウント選択画面を表示
  provider.setCustomParameters({
    prompt: 'select_account'
  });
  try {
    const result = await signInWithPopup(auth, provider);
    const userEmail = result.user.email;

    // メールアドレスをチェック
    if (userEmail !== CONFIG.ALLOWED_GOOGLE_EMAIL) {
      // 許可されていないメールアドレスの場合はサインアウト
      await signOut(auth);
      console.error('❌ このGoogleアカウントはアクセス権限がありません:', userEmail);
      throw new Error('auth/access-denied');
    }

    console.log('✅ Google ログイン成功:', result.user.email);
    return result.user;
  } catch (error) {
    console.error('❌ Google ログイン失敗:', error.message);
    throw error;
  }
}

/**
 * メール+パスワードでログイン
 * @param {string} email - メールアドレス
 * @param {string} password - パスワード
 * @returns {Promise<User>} ログインしたユーザー情報
 */
export async function loginWithEmail(email, password) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ メールログイン成功:', result.user.email);
    return result.user;
  } catch (error) {
    console.error('❌ メールログイン失敗:', error.message);
    throw error;
  }
}

/**
 * 新規ユーザー登録（メール+パスワード）
 * @param {string} email - メールアドレス
 * @param {string} password - パスワード（6文字以上）
 * @returns {Promise<User>} 登録したユーザー情報
 */
export async function registerWithEmail(email, password) {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    console.log('✅ 新規登録成功:', result.user.email);
    return result.user;
  } catch (error) {
    console.error('❌ 新規登録失敗:', error.message);
    throw error;
  }
}

/**
 * ログアウト
 * @returns {Promise<void>}
 */
export async function logout() {
  try {
    await signOut(auth);
    console.log('✅ ログアウト成功');
  } catch (error) {
    console.error('❌ ログアウト失敗:', error.message);
    throw error;
  }
}

/**
 * 認証状態の変化を監視
 * @param {Function} callback - 認証状態が変わった時に実行される関数
 * @returns {Function} 監視を解除する関数
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log('🔐 ログイン中:', user.email);
    } else {
      console.log('🔓 未ログイン');
    }
    callback(user);
  });
}

/**
 * 現在ログインしているユーザーを取得
 * @returns {User|null} ユーザー情報（未ログインの場合はnull）
 */
export function getCurrentUser() {
  return auth.currentUser;
}

/**
 * エラーメッセージを日本語に変換
 * @param {Error} error - Firebaseエラー
 * @returns {string} 日本語のエラーメッセージ
 */
export function getErrorMessage(error) {
  const errorMessages = {
    'auth/invalid-email': 'メールアドレスの形式が正しくありません',
    'auth/user-disabled': 'このアカウントは無効化されています',
    'auth/user-not-found': 'このメールアドレスは登録されていません',
    'auth/wrong-password': 'パスワードが間違っています',
    'auth/email-already-in-use': 'このメールアドレスは既に使用されています',
    'auth/weak-password': 'パスワードは6文字以上にしてください',
    'auth/popup-closed-by-user': 'ログインがキャンセルされました',
    'auth/network-request-failed': 'ネットワークエラーが発生しました',
    'auth/access-denied': 'このGoogleアカウントではログインできません。許可されたアカウントでログインしてください。',
  };

  return errorMessages[error.code] || `エラーが発生しました: ${error.message}`;
}
