// Firestore CRUD操作モジュール
import { db } from './firebase-config.js';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

/**
 * ユーザーのガレージドキュメント参照を取得
 * @param {string} userId - ユーザーID
 * @param {string} garageId - ガレージID (garage1, garage2, garage3, garage4)
 * @returns {DocumentReference} ドキュメント参照
 */
function getUserDocRef(userId, garageId) {
  return doc(db, 'users', userId, 'garages', garageId);
}

/**
 * 単一のガレージデータを読み込み
 * @param {string} userId - ユーザーID
 * @param {string} garageId - ガレージID
 * @returns {Promise<Object>} ガレージデータ
 */
export async function loadGarageData(userId, garageId) {
  try {
    const docRef = getUserDocRef(userId, garageId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      console.log(`✅ ${garageId} 読み込み成功`);
      return docSnap.data();
    } else {
      // データが存在しない場合は空データを返す
      console.log(`ℹ️ ${garageId} データなし（空データを返す）`);
      return {
        title: '',
        stroke1: '',
        stroke2: '',
        stroke3: '',
        stroke4: '',
        updatedAt: new Date()
      };
    }
  } catch (error) {
    console.error(`❌ ${garageId} 読み込み失敗:`, error);
    throw error;
  }
}

/**
 * 全ガレージデータを読み込み（4つ）- 並列処理で高速化
 * @param {string} userId - ユーザーID
 * @returns {Promise<Object>} 全ガレージデータ
 */
export async function loadAllGarages(userId) {
  console.log('📖 全ガレージデータ読み込み開始...');

  try {
    // Promise.allで並列読み込み（高速化）
    const garagePromises = [
      loadGarageData(userId, 'garage1'),
      loadGarageData(userId, 'garage2'),
      loadGarageData(userId, 'garage3'),
      loadGarageData(userId, 'garage4'),
    ];

    const [garage1, garage2, garage3, garage4] = await Promise.all(garagePromises);

    console.log('✅ 全ガレージ読み込み完了');
    return { garage1, garage2, garage3, garage4 };
  } catch (error) {
    console.error('❌ 全ガレージ読み込み失敗:', error);
    throw error;
  }
}

/**
 * ストロークまたはタイトルを保存
 * { merge: true } で既存フィールドを保護しつつ更新
 * @param {string} userId - ユーザーID
 * @param {string} garageId - ガレージID
 * @param {string} fieldKey - フィールド名 (title, stroke1, stroke2, stroke3, stroke4)
 * @param {string} value - 保存する値
 * @returns {Promise<void>}
 */
export async function saveStroke(userId, garageId, fieldKey, value) {
  try {
    const docRef = getUserDocRef(userId, garageId);

    // { merge: true } を使うと、ドキュメントが存在しない場合は作成し、
    // 存在する場合は他のフィールドを上書きせずに更新します
    await setDoc(docRef, {
      [fieldKey]: value,
      updatedAt: new Date()
    }, { merge: true });

    console.log(`💾 ${garageId}.${fieldKey} 保存成功`);
  } catch (error) {
    console.error(`❌ ${garageId}.${fieldKey} 保存失敗:`, error);
    throw error;
  }
}

/**
 * タイトルを保存（saveStrokeのエイリアス）
 * @param {string} userId - ユーザーID
 * @param {string} garageId - ガレージID
 * @param {string} title - タイトル
 * @returns {Promise<void>}
 */
export async function saveTitle(userId, garageId, title) {
  return saveStroke(userId, garageId, 'title', title);
}

/**
 * ストロークを削除（空文字列で上書き）
 * @param {string} userId - ユーザーID
 * @param {string} garageId - ガレージID
 * @param {string} fieldKey - フィールド名
 * @returns {Promise<void>}
 */
export async function deleteStroke(userId, garageId, fieldKey) {
  try {
    await saveStroke(userId, garageId, fieldKey, '');
    console.log(`🗑️ ${garageId}.${fieldKey} 削除成功`);
  } catch (error) {
    console.error(`❌ ${garageId}.${fieldKey} 削除失敗:`, error);
    throw error;
  }
}

/**
 * ガレージ全体を削除（Firestoreからドキュメントを完全削除）
 * @param {string} userId - ユーザーID
 * @param {string} garageId - ガレージID
 * @returns {Promise<void>}
 */
export async function deleteGarage(userId, garageId) {
  try {
    const docRef = getUserDocRef(userId, garageId);
    await deleteDoc(docRef);
    console.log(`🗑️ ${garageId} 削除成功`);
  } catch (error) {
    // ドキュメントが存在しない場合はエラーにならないようにする
    if (error.code === 'not-found') {
      console.log(`ℹ️ ${garageId} はすでに削除されています`);
    } else {
      console.error(`❌ ${garageId} 削除失敗:`, error);
      throw error;
    }
  }
}

/**
 * localStorage → Firestore へ移行（初回ログイン時のみ実行）
 * writeBatchを使用してアトミックに実行
 * @param {string} userId - ユーザーID
 * @returns {Promise<void>}
 */
export async function migrateFromLocalStorage(userId) {
  const migrationKey = 'firestore_migrated';

  // すでに移行済みかチェック
  if (localStorage.getItem(migrationKey)) {
    console.log('ℹ️ すでにFirestoreへ移行済み');
    return;
  }

  console.log('🔄 localStorageからFirestoreへ移行開始...');

  try {
    const batch = writeBatch(db);
    let hasData = false;

    // 4つのガレージをループ
    for (let garageNum = 1; garageNum <= 4; garageNum++) {
      const garageId = `garage${garageNum}`;

      // localStorageからデータを取得
      // 既存のストレージ構造: stroke1-16, stroke-title1-4
      const title = localStorage.getItem(`stroke-title${garageNum}`) || '';
      const stroke1 = localStorage.getItem(`stroke${(garageNum - 1) * 4 + 1}`) || '';
      const stroke2 = localStorage.getItem(`stroke${(garageNum - 1) * 4 + 2}`) || '';
      const stroke3 = localStorage.getItem(`stroke${(garageNum - 1) * 4 + 3}`) || '';
      const stroke4 = localStorage.getItem(`stroke${(garageNum - 1) * 4 + 4}`) || '';

      // データがある場合のみバッチに追加
      if (title || stroke1 || stroke2 || stroke3 || stroke4) {
        hasData = true;

        const garageData = {
          title,
          stroke1,
          stroke2,
          stroke3,
          stroke4,
          updatedAt: new Date()
        };

        // バッチに書き込み操作を追加
        const docRef = getUserDocRef(userId, garageId);
        batch.set(docRef, garageData);
        console.log(`📝 ${garageId} をバッチに追加`);
      }
    }

    // バッチをコミット（アトミックに実行）
    if (hasData) {
      await batch.commit();
      console.log('✅ localStorage → Firestore 移行完了！');
    } else {
      console.log('ℹ️ 移行するデータがありませんでした');
    }

    // 移行完了フラグを保存
    localStorage.setItem(migrationKey, 'true');
  } catch (error) {
    console.error('❌ データ移行失敗:', error);
    throw error;
  }
}

/**
 * Firestore → localStorage へバックアップ（オプション）
 * @param {string} userId - ユーザーID
 * @returns {Promise<void>}
 */
export async function backupToLocalStorage(userId) {
  console.log('💾 Firestore → localStorage バックアップ開始...');

  try {
    const garages = await loadAllGarages(userId);

    for (let garageNum = 1; garageNum <= 4; garageNum++) {
      const garage = garages[`garage${garageNum}`];

      // タイトルを保存
      localStorage.setItem(`stroke-title${garageNum}`, garage.title || '');

      // ストロークを保存
      localStorage.setItem(`stroke${(garageNum - 1) * 4 + 1}`, garage.stroke1 || '');
      localStorage.setItem(`stroke${(garageNum - 1) * 4 + 2}`, garage.stroke2 || '');
      localStorage.setItem(`stroke${(garageNum - 1) * 4 + 3}`, garage.stroke3 || '');
      localStorage.setItem(`stroke${(garageNum - 1) * 4 + 4}`, garage.stroke4 || '');
    }

    console.log('✅ バックアップ完了');
  } catch (error) {
    console.error('❌ バックアップ失敗:', error);
    throw error;
  }
}
