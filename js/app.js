$(function () {
  // メモ入力欄の設定　LocalStorageの取得
  $(".garage-strokes .mol_text").each(function (i) {
    let num = $(".garage-strokes .mol_text").index(this) + 1;
    $("#stroke" + num).val(localStorage.getItem("stroke" + num));
  });
  // タイトルの設定　LocalStorageの取得
  $(".garages input.title").each(function (i) {
    let num = $(".title").index(this) + 1;
    $(".stroke-title" + num).val(localStorage.getItem("stroke-title" + num));
  });
  // テーマの設定
  // $("#stroke-title1").val(localStorage.getItem("stroke-title1"));
  // $("#stroke-title5").val(localStorage.getItem("stroke-title5"));
  // $("#stroke-title3").val(localStorage.getItem("stroke-title3"));

  // 削除機能
  $("input.clear").on("click", function () {
    let i = $("input.clear").index(this) + 1;
    console.log($(this).data("clear") + i + "が押された");

    var retVal = confirm("消しマンボ?");
    if(retVal == true) {
      alert("闇に葬りマンボ...");
      $("#stroke" + i).val("");
      localStorage.removeItem("stroke" + i);
      $("this").attr("disabled", true);
      document.querySelector("#stroke" + i).value = "";
      return true;
    } else {
      alert("やっぱやめとくわ");
      return false;
    }
    localStorage.removeItem("stroke" + i);
  });

  // メモ入力、リアルタイムでLocalStorageに保存
  $("textarea").on("keyup", function () {
    let i = $("textarea").index(this) + 1;
    localStorage.setItem("stroke" + i, $("#stroke" + i).val());
    // console.log($(this).data('stroke') + i + 'が押された');
    $("#message").fadeIn(300).fadeOut(300);
  });
  
  // タイトル入力、リアルタイムでLocalStorageに保存
  $("input.title").on("keyup", function () {
    let i = $(".title").index(this) + 1;
    console.log(i)
    localStorage.setItem("stroke-title" + i, $(".stroke-title" + i).val());
    console.log($(this).data('stroke') + i + 'が押された');
    $("#message").fadeIn(300).fadeOut(300);
  });
  //  テーマEnd
});

// Scroll
// https://sterfield.co.jp/designer/横スクロールを可能にできる「jquery-mousewheel」を使用して/
$(function () {
  // window.onwheel = (e) => (e.preventDefault = false);

  //コンテンツの横サイズ
  var cont = $(".garages-container")
  var contW = $(".garages").outerWidth(true) * $("div", cont).length;
  cont.css("width", contW);
  //スクロールスピード
  var speed = 4;
  //マウスホイールで横移動
  $(".garages-container").mousewheel(function (event, mov) {
    //ie firefox
    $(this).scrollLeft($(this).scrollLeft() - mov * speed);
    //webkit
    $("body").scrollLeft($("body").scrollLeft() - mov * speed);
    // return false; //縦スクロール不可
  });
});
