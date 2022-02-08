// function disableScroll(event) {
//  event.preventDefault();
// }
// // スクロール禁止
// document.querySelectorAll("body").onclick = function () {
//  // イベントと関数を紐付け
//  document.addEventListener("touchmove", disableScroll, { passive: false });
//  document.addEventListener("mousewheel", disableScroll, { passive: false });
// };

// $(function () {
//  $(".mol_text").draggable();
// });
// if (localStorage.getItem("kioku" + num )) {};

$(function () {
  $(".org_text .mol_text").each(function (i) {
    let num = $(".org_text .mol_text").index(this) + 1;
    $("#kioku" + num).val(localStorage.getItem("kioku" + num));
  });
  // テーマの設定
  $("#kioku-title1").val(localStorage.getItem("kioku-title1"));
  $("#kioku-title2").val(localStorage.getItem("kioku-title2"));
  $("#kioku-title3").val(localStorage.getItem("kioku-title3"));

  $("input.clear").on("click", function () {
    let i = $("input.clear").index(this) + 1;
    console.log($(this).data("clear") + i + "が押された");

    var retVal = confirm("消しマンボ?");
    if(retVal == true) {
      alert("闇に葬りマンボ...");
      $("#kioku" + i).val("");
      localStorage.removeItem("kioku" + i);
      $("this").attr("disabled", true);
      document.querySelector("#kioku" + i).value = "";
      return true;
    } else {
      alert("やっぱやめとくわ");
      return false;
    }
    localStorage.removeItem("kioku" + i);
  });

  $("textarea").on("keyup", function () {
    let i = $("textarea").index(this) + 1;
    localStorage.setItem("kioku" + i, $("#kioku" + i).val());
    // console.log($(this).data('kioku') + i + 'が押された');
    $("#message").fadeIn(300).fadeOut(300);
  });

  // テーマの設定

  // $(".title").each(function (i) {
  //  let num = $(".title").index(this) + 1;
  //  $("#kioku-title" + num).val(localStorage.getItem("kioku-title" + num));
  // });


  $("input").on("keyup", function () {
    // let j = $("input").index(this) + 1;
    localStorage.setItem("kioku-title1", $("#kioku-title1").val());
    localStorage.setItem("kioku-title2", $("#kioku-title2").val());
    localStorage.setItem("kioku-title3", $("#kioku-title3").val());
  });
  //  テーマEnd
});

// Scroll
// https://sterfield.co.jp/designer/横スクロールを可能にできる「jquery-mousewheel」を使用して/
$(function () {
  // window.onwheel = (e) => (e.preventDefault = false);

  //コンテンツの横サイズ
  var cont = $(".container");
  var contW = $(".container").outerWidth(true) * $("div", cont).length;

  cont.css("width", contW);
  //スクロールスピード
  var speed = 10;
  //マウスホイールで横移動
  $("html").mousewheel(function (event, mov) {
    //ie firefox
    $(this).scrollLeft($(this).scrollLeft() - mov * speed);
    //webkit
    $("body").scrollLeft($("body").scrollLeft() - mov * speed);
    // return false; //縦スクロール不可
  });
  // $("a[href^=#]").click(function () {
  //  var speed = 400; // ミリ秒
  //  var href = $(this).attr("href");
  //  var target = $(href == "#" || href == "" ? "html" : href);
  //  var position = target.offset().left; //targetの位置を取得
  //  $("html, body").animate({ scrollLeft: position }, speed, "swing");
  //  return false;
  // });
});
