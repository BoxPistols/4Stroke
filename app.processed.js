$((function(){$(".org_text .mol_text").each((function(t){let e=$(".org_text .mol_text").index(this)+1;$("#kioku"+e).val(localStorage.getItem("kioku"+e))})),$("#kioku-title1").val(localStorage.getItem("kioku-title1")),$("#kioku-title2").val(localStorage.getItem("kioku-title2")),$("input.clear").on("click",(function(){let t=$("input.clear").index(this)+1;return console.log($(this).data("clear")+t+"が押された"),1==confirm("消しマンボ?")?(alert("闇に葬りマンボ..."),$("#kioku"+t).val(""),localStorage.removeItem("kioku"+t),$("this").attr("disabled",!0),document.querySelector("#kioku"+t).value="",!0):(alert("やっぱやめとくわ"),!1)})),$("textarea").on("keyup",(function(){let t=$("textarea").index(this)+1;localStorage.setItem("kioku"+t,$("#kioku"+t).val()),$("#message").fadeIn(300).fadeOut(300)})),$("input").on("keyup",(function(){localStorage.setItem("kioku-title1",$("#kioku-title1").val()),localStorage.setItem("kioku-title2",$("#kioku-title2").val())}))})),$((function(){var t=$(".container"),e=$(".container").outerWidth(!0)*$("div",t).length;t.css("width",e);$("html").mousewheel((function(t,e){$(this).scrollLeft($(this).scrollLeft()-10*e),$("body").scrollLeft($("body").scrollLeft()-10*e)}))}));