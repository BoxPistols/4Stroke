/******/ (function() { // webpackBootstrap
var __webpack_exports__ = {};
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
  var qsAll = function (_x) {
    return document.querySelectorAll(_x);
  };

  var qs = function (_x) {
    return document.querySelector(_x);
  }; // auto save view


  var message = qs("#message");

  var autoSave = function () {
    message.classList.remove("is-hidden");
    setTimeout(function () {
      message.classList.add("is-hidden");
    }, 800);
  }; // メモ入力欄の設定　LocalStorageの取得


  var strokeTexts = qsAll(".garage-strokes .garage-stroke-box");
  strokeTexts.forEach(function (elm) {
    var index = [].slice.call(strokeTexts).indexOf(elm);
    var strokeClass = qsAll("textarea.stroke");
    strokeClass[index].value = localStorage.getItem("stroke" + (index + 1));
  }); // メモ入力、リアルタイムでLocalStorageに保存

  var handleTextArea = qsAll("textArea");

  var _loop_1 = function (i) {
    handleTextArea[i].addEventListener("keyup", function (event) {
      localStorage.setItem("stroke" + (i + 1), event.target.value);
      autoSave();
    });
  };

  for (var i = 0; i < handleTextArea.length; i++) {
    _loop_1(i);
  } // タイトルの設定　LocalStorageの取得


  var strokeTitles = qsAll(".stroke-title");
  strokeTitles.forEach(function (elm) {
    var index = [].slice.call(strokeTitles).indexOf(elm);
    var strokeTitle = qsAll(".stroke-title");
    strokeTitle[index].value = localStorage.getItem("stroke-title" + (index + 1));
  }); // タイトル入力、リアルタイムでLocalStorageに保存

  var handleTitle = qsAll(".stroke-title");

  var _loop_2 = function (i) {
    handleTitle[i].addEventListener("keyup", function (event) {
      localStorage.setItem("stroke-title" + (i + 1), event.target.value);
      autoSave();
    });
  };

  for (var i = 0; i < handleTitle.length; i++) {
    _loop_2(i);
  } // 個別 テキストエリア削除機能


  var handleClear = qsAll("input.clear");

  var _loop_3 = function (i) {
    handleClear[i].addEventListener("click", function (event) {
      var targetRemoveText = qs("textarea.stroke" + (i + 1));

      if (targetRemoveText.value === "") {
        alert("何も入力されてないわ");
        return false;
      } else {
        var confirmRemove = confirm("消しマンボ?");

        if (confirmRemove == true) {
          localStorage.removeItem("stroke" + (i + 1));
          targetRemoveText.value = ""; // handleClear[i].setAttribute("disabled", true);

          alert("闇に葬りマンボ...");
          autoSave();
          return true;
        } else {
          alert("やっぱやめとくわ");
          return false;
        }
      }
    });
  };

  for (var i = 0; i < handleClear.length; i++) {
    _loop_3(i);
  } // 個別 タイトル削除機能


  var handleTitleClear = qsAll(".title-delete");

  var _loop_4 = function (i) {
    handleTitleClear[i].addEventListener("click", function (event) {
      if (handleTitleClear[i].previousElementSibling.value == "") {
        alert("何も入力されてないわ");
        return false;
      }

      var confirmRemove = confirm(handleTitleClear[i].previousElementSibling.value + "を消しマンボ?");

      if (confirmRemove == true) {
        localStorage.removeItem("stroke-title" + (i + 1));
        var targetRemoveTitle = qs(".stroke-title" + (i + 1));
        targetRemoveTitle.value = "";
        alert("闇に葬りマンボ...");
        autoSave();
        return true;
      } else {
        alert("やっぱやめとくわ");
        return false;
      }
    });
  };

  for (var i = 0; i < handleTitleClear.length; i++) {
    _loop_4(i);
  } // Garageグループ 削除機能


  var handleGarageClear = function (_qs, _numMin, _numTitle) {
    var el = qs(_qs);
    el.addEventListener("click", function (event) {
      var confirmRemove = confirm(event.target.value.replace("Delete /", "") + "を消しマンボ?");

      if (confirmRemove == true) {
        alert("闇に葬りマンボ...");

        for (var i = _numMin; i < _numMin + 4; i++) {
          localStorage.removeItem("stroke" + (i + 1));
          var targetRemoveText = qs("textarea.stroke" + (i + 1));
          targetRemoveText.value = "";
        } // タイトルも消す

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
  handleGarageClear("#clearD", 12, 4); // Finished
});
/******/ })()
;