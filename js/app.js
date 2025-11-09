// Firebase関連のインポート
import { onAuthChange, getCurrentUser, logout } from './auth.js';
import {
  loadAllGarages,
  saveStroke,
  saveTitle,
  deleteStroke,
  deleteGarage,
  migrateFromLocalStorage
} from './firestore-crud.js';

// デバウンス用のタイマー
let saveTimer = null;
const DEBOUNCE_DELAY = 500; // 500ms待ってから保存

document.addEventListener("DOMContentLoaded", function () {
  // 認証状態チェック - ログインしていない場合はログイン画面へ
  onAuthChange(async (user) => {
    if (!user) {
      // 未ログインの場合はログイン画面へリダイレクト
      window.location.href = '/login.html';
      return;
    }

    console.log('✅ ログイン中:', user.email);

    // ユーザー情報を表示
    const userEmailElement = document.getElementById('user-email');
    if (userEmailElement) {
      userEmailElement.textContent = user.email;
    }

    // localStorage → Firestore 移行（初回のみ）
    await migrateFromLocalStorage(user.uid);

    // Firestoreからデータ読み込み
    await loadDataFromFirestore(user.uid);

    // イベントリスナーを設定
    setupEventListeners(user.uid);
  });

  // CSS Scroll Snap Polyfill
  const init = function () {
    cssScrollSnapPolyfill();
  };
  init();

  /**
   * 汎用関数
   * @_x = ターゲットエレメント
   */
  let qsAll = (_x) => document.querySelectorAll(_x);
  let qs = (_x) => document.querySelector(_x);

  // auto save view
  let message = qs("#message");

  const autoSave = () => {
    message.classList.remove("is-hidden");
    setTimeout(function () {
      message.classList.add("is-hidden");
    }, 800);
  };

  /**
   * Firestoreからデータを読み込んで画面に表示
   */
  async function loadDataFromFirestore(userId) {
    try {
      console.log('📖 Firestoreからデータ読み込み中...');
      const garages = await loadAllGarages(userId);

      // 4つのガレージをループ
      for (let i = 1; i <= 4; i++) {
        const garage = garages[`garage${i}`];

        // タイトルを設定
        const titleInput = qs(`.stroke-title${i}`);
        if (titleInput) {
          titleInput.value = garage.title || '';
        }

        // ストローク（4つ）を設定
        for (let j = 1; j <= 4; j++) {
          const strokeIndex = (i - 1) * 4 + j;
          const textarea = qs(`textarea.stroke${strokeIndex}`);
          if (textarea) {
            textarea.value = garage[`stroke${j}`] || '';
          }
        }
      }

      console.log('✅ データ読み込み完了');
    } catch (error) {
      console.error('❌ データ読み込みエラー:', error);
      alert('データの読み込みに失敗しました。ページを再読み込みしてください。');
    }
  }

  /**
   * 全てのイベントリスナーを設定
   */
  function setupEventListeners(userId) {
    // テキストエリアの入力イベント
    let handleTextArea = qsAll("textArea");
    for (let i = 0; i < handleTextArea.length; i++) {
      handleTextArea[i].addEventListener("keyup", (event) => {
        // デバウンス処理（連続入力時に500ms待ってから保存）
        clearTimeout(saveTimer);
        saveTimer = setTimeout(async () => {
          const garageNum = Math.floor(i / 4) + 1;
          const strokeNum = (i % 4) + 1;
          const garageId = `garage${garageNum}`;
          const strokeKey = `stroke${strokeNum}`;

          try {
            await saveStroke(userId, garageId, strokeKey, event.target.value);
            autoSave();
          } catch (error) {
            console.error('❌ 保存エラー:', error);
          }
        }, DEBOUNCE_DELAY);
      });
    }

    // タイトルの入力イベント
    let handleTitle = qsAll(".stroke-title");
    for (let i = 0; i < handleTitle.length; i++) {
      handleTitle[i].addEventListener("keyup", (event) => {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(async () => {
          const garageId = `garage${i + 1}`;

          try {
            await saveTitle(userId, garageId, event.target.value);
            autoSave();
          } catch (error) {
            console.error('❌ タイトル保存エラー:', error);
          }
        }, DEBOUNCE_DELAY);
      });
    }

    // 個別テキストエリア削除機能
    let handleClear = qsAll("input.clear");
    for (let i = 0; i < handleClear.length; i++) {
      handleClear[i].addEventListener("click", async (event) => {
        let targetRemoveText = qs("textarea.stroke" + (i + 1));

        if (targetRemoveText.value === "") {
          alert("何も入力されてないわ");
          return false;
        } else {
          let confirmRemove = confirm("消しマンボ?");

          if (confirmRemove == true) {
            const garageNum = Math.floor(i / 4) + 1;
            const strokeNum = (i % 4) + 1;
            const garageId = `garage${garageNum}`;
            const strokeKey = `stroke${strokeNum}`;

            try {
              await deleteStroke(userId, garageId, strokeKey);
              targetRemoveText.value = "";
              alert("闇に葬りマンボ...");
              autoSave();
              return true;
            } catch (error) {
              console.error('❌ 削除エラー:', error);
              alert('削除に失敗しました');
              return false;
            }
          } else {
            alert("やっぱやめとくわ");
            return false;
          }
        }
      });
    }

    // 個別タイトル削除機能
    let handleTitleClear = qsAll(".title-delete");
    for (let i = 0; i < handleTitleClear.length; i++) {
      handleTitleClear[i].addEventListener("click", async (event) => {
        if (handleTitleClear[i].previousElementSibling.value == "") {
          alert("何も入力されてないわ");
          return false;
        }

        let confirmRemove = confirm(
          handleTitleClear[i].previousElementSibling.value + "を消しマンボ?"
        );

        if (confirmRemove == true) {
          const garageId = `garage${i + 1}`;

          try {
            await saveTitle(userId, garageId, '');
            let targetRemoveTitle = qs(".stroke-title" + (i + 1));
            targetRemoveTitle.value = "";
            alert("闇に葬りマンボ...");
            autoSave();
            return true;
          } catch (error) {
            console.error('❌ タイトル削除エラー:', error);
            alert('削除に失敗しました');
            return false;
          }
        } else {
          alert("やっぱやめとくわ");
          return false;
        }
      });
    }

    // Garageグループ削除機能
    const handleGarageClear = (_qs, _garageNum) => {
      let el = qs(_qs);
      el.addEventListener("click", async (event) => {
        let confirmRemove = confirm(
          event.target.value.replace("Delete /", "") + "を消しマンボ?"
        );

        if (confirmRemove == true) {
          const garageId = `garage${_garageNum}`;

          try {
            await deleteGarage(userId, garageId);

            // 画面もクリア
            const startIndex = (_garageNum - 1) * 4;
            for (let i = startIndex; i < startIndex + 4; i++) {
              let targetRemoveText = qs("textarea.stroke" + (i + 1));
              if (targetRemoveText) {
                targetRemoveText.value = "";
              }
            }

            alert("闇に葬りマンボ...");
            autoSave();
            return true;
          } catch (error) {
            console.error('❌ ガレージ削除エラー:', error);
            alert('削除に失敗しました');
            return false;
          }
        } else {
          alert("やっぱやめとくわ");
          return false;
        }
      });
    };

    handleGarageClear("#clearA", 1);
    handleGarageClear("#clearB", 2);
    handleGarageClear("#clearC", 3);
    handleGarageClear("#clearD", 4);

    // ログアウトボタン
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        if (confirm('ログアウトしますか？')) {
          try {
            await logout();
            window.location.href = '/login.html';
          } catch (error) {
            console.error('❌ ログアウトエラー:', error);
            alert('ログアウトに失敗しました');
          }
        }
      });
    }
  }

  // Finished
});
