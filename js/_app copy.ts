document.addEventListener("DOMContentLoaded", function () {
  // https://tech.arms-soft.co.jp/entry/2020/01/29/090000

  // キーボード反応
  /*
  window.onload = function () {
    window.addEventListener("keydown", keydownfunc, true);
  };

  const keydownfunc = function (event) {
    const code = event.keyCode;
    switch (code) {
      case 37: // ←
      case 38: // ↑
      case 39: // →
      case 40: // ↓
        event.preventDefault();
        console.log(code);
    }
  };
  */

  /**
   * 汎用関数
   * @_x = ターゲットエレメント
   */
  let qsAll = (_x: string) => document.querySelectorAll(_x);
  let qs = (_x: string) => document.querySelector(_x);

  // auto save view
  let message = qs("#message");

  const autoSave = () => {
    message.classList.remove("is-hidden");
    setTimeout(function () {
      message.classList.add("is-hidden");
    }, 800);
  };

  // メモ入力欄の設定　LocalStorageの取得
  let strokeTexts = qsAll(".garage-strokes .garage-stroke-box");
  strokeTexts.forEach((elm) => {
    const index = [].slice.call(strokeTexts).indexOf(elm);
    let strokeClass = qsAll("textarea.stroke")[index];
    strokeClass[index].value = localStorage.getItem("stroke" + (index + 1));
  });

  // メモ入力、リアルタイムでLocalStorageに保存
  let handleTextArea = qsAll("textArea");
  for (let i = 0; i < handleTextArea.length; i++) {
    handleTextArea[i].addEventListener("keyup", (event) => {
      localStorage.setItem(
        "stroke" + (i + 1),
        (event.target as HTMLTextAreaElement).value
      );
      autoSave();
    });
  }

  // タイトルの設定　LocalStorageの取得
  let strokeTitles = qsAll(".stroke-title");
  strokeTitles.forEach((elm) => {
    const index = [].slice.call(strokeTitles).indexOf(elm);
    let strokeTitle = qsAll(".stroke-title")[index];
    strokeTitle[index].value = localStorage.getItem(
      "stroke-title" + (index + 1)
    );
  });

  // タイトル入力、リアルタイムでLocalStorageに保存
  let handleTitle = qsAll(".stroke-title");
  for (let i = 0; i < handleTitle.length; i++) {
    handleTitle[i].addEventListener("keyup", (event) => {
      localStorage.setItem(
        "stroke-title" + (i + 1),
        (event.target as HTMLTextAreaElement).value
      );
      autoSave();
    });
  }

  // 個別 テキストエリア削除機能
  let handleClear = qsAll("input.clear");

  for (let i = 0; i < handleClear.length; i++) {
    handleClear[i].addEventListener("click", (event) => {
      let targetRemoveText = qs("textarea.stroke" + (i + 1))[i];

      if (targetRemoveText.value === "") {
        alert("何も入力されてないわ");
        return false;
      } else {
        let confirmRemove = confirm("消しマンボ?");

        if (confirmRemove == true) {
          localStorage.removeItem("stroke" + (i + 1));
          targetRemoveText.value = "";
          // handleClear[i].setAttribute("disabled", true);
          alert("闇に葬りマンボ...");
          autoSave();
          return true;
        } else {
          alert("やっぱやめとくわ");
          return false;
        }
      }
    });
  }

  // 個別 タイトル削除機能
  let handleTitleClear = qsAll(".title-delete");

  for (let i = 0; i < handleTitleClear.length; i++) {
    handleTitleClear[i].addEventListener("click", (event) => {
      if (handleTitleClear[i].previousElementSibling[i].value == "") {
        alert("何も入力されてないわ");
        return false;
      }

      let confirmRemove = confirm(
        handleTitleClear[i].previousElementSibling[i].value + "を消しマンボ?"
      );

      if (confirmRemove == true) {
        localStorage.removeItem("stroke-title" + (i + 1));
        let targetRemoveTitle = qs(".stroke-title" + (i + 1));
        targetRemoveTitle[i].value = "";

        alert("闇に葬りマンボ...");
        autoSave();
        return true;
      } else {
        alert("やっぱやめとくわ");
        return false;
      }
    });
  }

  // Garageグループ 削除機能
  const handleGarageClear = (
    _qs: string,
    _numMin: number,
    _numTitle: number
  ) => {
    let el = qs(_qs);
    el.addEventListener("click", (event) => {
      let confirmRemove = confirm(
        // (event.target as HTMLElement).replace("Delete /", "") + "を消しマンボ?"
        "消しマンボ?"
      );
      if (confirmRemove == true) {
        alert("闇に葬りマンボ...");

        for (let i = _numMin; i < _numMin + 4; i++) {
          localStorage.removeItem("stroke" + (i + 1));
          let targetRemoveText = qs("textarea.stroke" + (i + 1));
          targetRemoveText[_qs].value = "";
        }
        // タイトルも消す
        /*
        localStorage.removeItem("stroke-title" + _numTitle);
        let targetRemoveTitle = qs(".stroke-title" + _numTitle);
        targetRemoveTitle.value = "";
        */
        autoSave();
        return true;
      } else {
        alert("やっぱやめとくわ");
        return false;
      }
    });
  };
  handleGarageClear("#clearA", 0, 1);
  handleGarageClear("#clearB", 4, 2);
  handleGarageClear("#clearC", 8, 3);
  handleGarageClear("#clearD", 12, 4);

  // Finished
});
