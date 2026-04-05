// Firebase Authentication モジュール
import { auth } from './firebase-config.js';
import { CONFIG } from './config.js';

/**
 * Firebase 認証が利用可能かチェック (auth が null でないこと)
 * 未初期化の場合はわかりやすいエラーを投げる
 */
function requireAuth() {
  if (!auth) {
    const err = new Error('Firebase is not configured (FIREBASE_API_KEY missing)');
    err.code = 'auth/firebase-not-configured';
    throw err;
  }
  return auth;
}

export function isAuthAvailable() {
  return !!auth;
}
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signOut,
  onAuthStateChanged,
  linkWithCredential
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// デバッグ情報をログ出力
console.log('[DEBUG] auth.js loaded');
console.log('[DEBUG] CONFIG:', CONFIG);
console.log('[DEBUG] ALLOWED_GOOGLE_EMAIL:', CONFIG.ALLOWED_GOOGLE_EMAIL);

/**
 * iOS PWAスタンドアロンモードかどうかを検出
 * @returns {boolean}
 */
function isIOSStandalone() {
  const ua = navigator.userAgent || '';
  const isIOS = /iPhone|iPod/.test(ua) || (/iPad/.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua)));
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  return isIOS && isStandalone;
}

/**
 * ポップアップがブロックされる環境かどうかを検出
 * iOS PWAスタンドアロンではリダイレクトが動作しないためポップアップを使用
 * @returns {boolean}
 */
function shouldUseRedirect() {
  const ua = navigator.userAgent || '';
  // アプリ内ブラウザ（LINE, Instagram, Facebook, Twitter等）
  const isInAppBrowser = /Line|FBAN|FBAV|Instagram|Twitter/i.test(ua);
  // iPad Safari（iPadOS 13+はMacとして認識されるためタッチ判定も併用）
  const isIPad = /iPad/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua));
  // PWAスタンドアロンモード（iOS以外のみリダイレクト使用）
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  const isNonIOSStandalone = isStandalone && !isIOSStandalone();
  return isInAppBrowser || isIPad || isNonIOSStandalone;
}

/**
 * Googleログイン（ポップアップ失敗時はリダイレクトにフォールバック）
 * @returns {Promise<User>} ログインしたユーザー情報
 */
export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  // 毎回アカウント選択画面を表示
  provider.setCustomParameters({
    prompt: 'select_account'
  });

  // ポップアップがブロックされやすい環境ではリダイレクト方式を使用
  // ただしiOS PWAスタンドアロンではリダイレクトが動作しないためポップアップを使用
  if (shouldUseRedirect()) {
    console.log('[AUTH] リダイレクト方式でGoogleログインを開始');
    await signInWithRedirect(requireAuth(),provider);
    return; // リダイレクト後にページが再読み込みされる
  }

  try {
    const result = await signInWithPopup(requireAuth(),provider);
    const userEmail = result.user.email;

    // メールアドレスをチェック
    if (userEmail !== CONFIG.ALLOWED_GOOGLE_EMAIL) {
      // 許可されていないメールアドレスの場合はサインアウト
      await signOut(requireAuth());
      console.error('❌ このGoogleアカウントはアクセス権限がありません:', userEmail);
      throw new Error('auth/access-denied');
    }

    console.log('✅ Google ログイン成功:', result.user.email);
    return result.user;
  } catch (error) {
    // popup-blocked のみリダイレクトにフォールバック
    // ただしiOS PWAスタンドアロンではリダイレクトも動作しないため、エラーメッセージを表示
    if (error.code === 'auth/popup-blocked') {
      if (isIOSStandalone()) {
        console.error('[AUTH] iOS PWAスタンドアロンではポップアップもリダイレクトも使用できません');
        throw { code: 'auth/pwa-oauth-unsupported' };
      }
      console.log('[AUTH] ポップアップがブロックされたため、リダイレクト方式にフォールバック');
      await signInWithRedirect(requireAuth(),provider);
      return;
    }
    console.error('❌ Google ログイン失敗:', error.message);
    throw error;
  }
}

/**
 * GitHubログイン
 * @returns {Promise<User>} ログインしたユーザー情報
 */
export async function loginWithGitHub() {
  const provider = new GithubAuthProvider();

  // ポップアップがブロックされやすい環境ではリダイレクト方式を使用
  // ただしiOS PWAスタンドアロンではリダイレクトが動作しないためポップアップを使用
  if (shouldUseRedirect()) {
    console.log('[AUTH] リダイレクト方式でGitHubログインを開始');
    await signInWithRedirect(requireAuth(),provider);
    return;
  }

  try {
    const result = await signInWithPopup(requireAuth(),provider);
    console.log('✅ GitHub ログイン成功:', result.user.displayName || result.user.email);
    return result.user;
  } catch (error) {
    if (error.code === 'auth/popup-blocked') {
      if (isIOSStandalone()) {
        console.error('[AUTH] iOS PWAスタンドアロンではポップアップもリダイレクトも使用できません');
        throw { code: 'auth/pwa-oauth-unsupported' };
      }
      console.log('[AUTH] ポップアップがブロックされたため、リダイレクト方式にフォールバック');
      await signInWithRedirect(requireAuth(),provider);
      return;
    }
    // 同じメールで別プロバイダのアカウントが存在する場合、自動リンク
    if (error.code === 'auth/account-exists-with-different-credential') {
      const pendingCred = GithubAuthProvider.credentialFromError(error);
      if (pendingCred) {
        console.log('[AUTH] 既存アカウントにGitHub認証をリンク中...');
        // まずGoogleでログインしてからGitHub認証をリンク
        const googleProvider = new GoogleAuthProvider();
        const googleResult = await signInWithPopup(requireAuth(),googleProvider);
        const linkedResult = await linkWithCredential(googleResult.user, pendingCred);
        console.log('✅ GitHubアカウントをリンクしてログイン成功:', linkedResult.user.email);
        return linkedResult.user;
      }
    }
    console.error('❌ GitHub ログイン失敗:', error.message);
    throw error;
  }
}

/**
 * リダイレクト認証の結果を処理
 * @returns {Promise<User|null>} ユーザー情報（リダイレクト結果がない場合はnull）
 */
export async function handleRedirectResult() {
  try {
    const result = await getRedirectResult(requireAuth());
    if (result) {
      const user = result.user;
      // Google認証の場合、メールアドレスをチェック
      const isGoogle = result.providerId === 'google.com' ||
        user.providerData.some(p => p.providerId === 'google.com');
      if (isGoogle && user.email !== CONFIG.ALLOWED_GOOGLE_EMAIL) {
        await signOut(requireAuth());
        console.error('❌ このGoogleアカウントはアクセス権限がありません:', user.email);
        throw { code: 'auth/access-denied' };
      }
      console.log('✅ リダイレクトログイン成功:', user.displayName || user.email);
      return user;
    }
    return null;
  } catch (error) {
    console.error('❌ リダイレクト認証失敗:', error.message || error);
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
    const result = await signInWithEmailAndPassword(requireAuth(),email, password);
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
    const result = await createUserWithEmailAndPassword(requireAuth(),email, password);
    console.log('✅ 新規登録成功:', result.user.email);
    return result.user;
  } catch (error) {
    console.error('❌ 新規登録失敗:', error.message);
    throw error;
  }
}

/**
 * メールリンクを送信（パスワードなしログイン）
 * @param {string} email - メールアドレス
 */
export async function sendEmailLink(email) {
  const actionCodeSettings = {
    // メールリンクをクリックした後のリダイレクト先
    url: window.location.origin + '/login.html',
    handleCodeInApp: true,
  };

  try {
    await sendSignInLinkToEmail(requireAuth(),email, actionCodeSettings);
    // メールアドレスをlocalStorageに保存（リンククリック後に使用）
    window.localStorage.setItem('emailForSignIn', email);
    console.log('✅ ログインリンクを送信しました:', email);
  } catch (error) {
    console.error('❌ メールリンク送信失敗:', error.message);
    throw error;
  }
}

/**
 * メールリンクでログインを完了
 * @returns {Promise<User|null>} ユーザー情報（リンクでない場合はnull）
 */
export async function completeEmailLinkSignIn() {
  if (!isSignInWithEmailLink(requireAuth(),window.location.href)) {
    return null;
  }

  let email = window.localStorage.getItem('emailForSignIn');
  if (!email) {
    // 別のデバイスでリンクを開いた場合、メールアドレスを入力してもらう
    email = window.prompt('ログインリンクの確認のため、メールアドレスを入力してください');
  }
  if (!email) return null;

  try {
    const result = await signInWithEmailLink(requireAuth(),email, window.location.href);
    window.localStorage.removeItem('emailForSignIn');
    console.log('✅ メールリンクログイン成功:', result.user.email);
    return result.user;
  } catch (error) {
    console.error('❌ メールリンクログイン失敗:', error.message);
    throw error;
  }
}

/**
 * ログアウト
 * @returns {Promise<void>}
 */
export async function logout() {
  try {
    await signOut(requireAuth());
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
  if (!auth) {
    // Firebase 未設定: 即座に null を返して監視解除用noopを返す
    console.warn('[AUTH] Firebase not configured, user will be null');
    callback(null);
    return () => {};
  }
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
  if (!auth) return null;
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
    'auth/popup-blocked': 'ポップアップがブロックされました。リダイレクト方式で再試行します。',
    'auth/unauthorized-domain': 'このドメインは認証に許可されていません。localhost:8888 でアクセスしてください。',
    'auth/invalid-action-code': 'ログインリンクが無効または期限切れです。もう一度送信してください。',
    'auth/network-request-failed': 'ネットワークエラーが発生しました',
    'auth/access-denied': 'このGoogleアカウントではログインできません。許可されたアカウントでログインしてください。',
    'auth/account-exists-with-different-credential': 'このメールアドレスは別のログイン方法で登録済みです。元の方法でログインしてください。',
    'auth/pwa-oauth-unsupported': 'ホーム画面アプリではGoogle/GitHubログインが利用できません。メールリンクまたはパスワードでログインしてください。',
    'auth/firebase-not-configured': 'この環境ではログイン機能が利用できません。ローカルモードでアプリを利用してください。',
  };

  return errorMessages[error.code] || `エラーが発生しました: ${error.message}`;
}
