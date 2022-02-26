document.addEventListener("DOMContentLoaded", function () {
  // https://tech.arms-soft.co.jp/entry/2020/01/29/090000
  const init = function(){
    cssScrollSnapPolyfill()
  }
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
    }, 400);
  };

  // メモ入力欄の設定　LocalStorageの取得
  let strokeTexts = qsAll(".garage-strokes .mol_text");
  strokeTexts.forEach((elm) => {
    index = [].slice.call(strokeTexts).indexOf(elm);
    let strokeClass = qsAll("textarea.stroke");
    strokeClass[index].value = localStorage.getItem("stroke" + (index + 1));
  });

  // タイトルの設定　LocalStorageの取得
  let strokeTitles = qsAll(".garage .title");
  strokeTitles.forEach((elm) => {
    index = [].slice.call(strokeTitles).indexOf(elm);
    let strokeTitle = qsAll("input.title");
    strokeTitle[index].value = localStorage.getItem(
      "stroke-title" + (index + 1)
    );
  });

  // メモ入力、リアルタイムでLocalStorageに保存
  let handleTextArea = qsAll("textArea");
  for (let i = 0; i < handleTextArea.length; i++) {
    handleTextArea[i].addEventListener("keyup", (event) => {
      localStorage.setItem("stroke" + (i + 1), event.target.value);
      autoSave();
    });
  }

  // タイトル入力、リアルタイムでLocalStorageに保存
  let handleTitle = qsAll(".stroke-title");
  for (let i = 0; i < handleTitle.length; i++) {
    handleTitle[i].addEventListener("keyup", (event) => {
      localStorage.setItem("stroke-title" + (i + 1), event.target.value);
      autoSave();
    });
  }

  // 削除機能
  let handleClear = qsAll("input.clear");

  for (let i = 0; i < handleClear.length; i++) {
    handleClear[i].addEventListener("click", (event) => {
      let confirmRemove = confirm("消しマンボ?");
      if (confirmRemove == true) {
        alert("闇に葬りマンボ...");
        localStorage.removeItem("stroke" + (i + 1));
        let targetRemoveText = qs("textarea.stroke" + (i + 1));
        targetRemoveText.value = "";
        // handleClear[i].setAttribute("disabled", true);
        autoSave();
        return true;
      } else {
        alert("やっぱやめとくわ");
        return false;
      }
    });
  }
});
