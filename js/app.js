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
// if (localStorage.getItem("stroke" + num )) {};

$(function () {
  $(".org_text .mol_text").each(function (i) {
    let num = $(".org_text .mol_text").index(this) + 1;
    $("#stroke" + num).val(localStorage.getItem("stroke" + num));
  });
  // テーマの設定
  $("#stroke-title1").val(localStorage.getItem("stroke-title1"));
  $("#stroke-title5").val(localStorage.getItem("stroke-title5"));
  $("#stroke-title3").val(localStorage.getItem("stroke-title3"));

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

  $("textarea").on("keyup", function () {
    let i = $("textarea").index(this) + 1;
    localStorage.setItem("stroke" + i, $("#stroke" + i).val());
    // console.log($(this).data('stroke') + i + 'が押された');
    $("#message").fadeIn(300).fadeOut(300);
  });

  // テーマの設定

  // $(".title").each(function (i) {
  //  let num = $(".title").index(this) + 1;
  //  $("#stroke-title" + num).val(localStorage.getItem("stroke-title" + num));
  // });


  $("input").on("keyup", function () {
    // let j = $("input").index(this) + 1;
    localStorage.setItem("stroke-title1", $("#stroke-title1").val());
    localStorage.setItem("stroke-title5", $("#stroke-title5").val());
    localStorage.setItem("stroke-title3", $("#stroke-title3").val());
  });
  //  テーマEnd
});

// Scroll
// https://sterfield.co.jp/designer/横スクロールを可能にできる「jquery-mousewheel」を使用して/
$(function () {
  // window.onwheel = (e) => (e.preventDefault = false);

  //コンテンツの横サイズ
  var cont = $(".garages");
  var contW = $(".garages").outerWidth(true) * $("div", cont).length;

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
