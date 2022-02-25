/*
const getCssProps = (_searchElm, _target, _styling) => { // (ボタングループ, 表示のターゲット要素, 取得スタイル)
    for (let i = 0; i < _searchElm.length; i++) { // for文で回す
        if (_searchElm[i] = !null) {
            _searchElm[i].addEventListener('click', function () {

                let tx = this.innerText; // ボタンのテキストを取得
                let para = document.querySelector(_target); // セレクターでクラスを取得

                let style = para.style[`${_styling}`]; // styleの中身を設定[CSSのプロパティ]
                style = tx; // ボタンのテキストを値としてセット
                para.style.setProperty(_styling, tx); // styleの中身を設定[CSSのプロパティ, <- ボタンのテキスト]

                // コードの可視化
                let codeAll = window.getComputedStyle(container);
                let codeAllselfElement = window.getComputedStyle(selfElement)


                resultCssCode.innerText = getCssResult + getCssResultSelf;

                // Debug
                let compStyles = window.getComputedStyle(para); // styleの中身を取得
                let result = compStyles[`${_styling}`]; // 最終styleの中身を取得
                console.log(style, result); // 当てにいっているスタイル, 最終styleの中身
            });
        }
    }
};

const getSelectorAll = (x) => {
    return document.querySelectorAll(`.buttons.${x} > button`);
};

const resProp = (_searchElm, _target, _styling) => { // (ボタングループ, 表示のターゲット要素, 取得スタイル)
    _res = getSelectorAll(_searchElm); // ボタングループを取得
    getCssProps(_res, _target, _styling); // ターゲットに値を当てる
};
*/

document.addEventListener("DOMContentLoaded", function () {
    /**
     * 汎用関数
     * @_x = ターゲットエレメント
     */
    let qsAll = (_x) => document.querySelectorAll(_x);
    // let qs = (_x) => document.querySelector(_x);

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
    let handleTextArea = qsAll("textArea")
    // // console.log(i)
    // handleTextArea.forEach((elm) => {
    //     index = [].slice.call(handleTextArea).indexOf(elm);
    //     console.log(index)
    for (let i = 0; i < handleTextArea.length; i++) {
        handleTextArea[i].addEventListener("keyup", event => {
            // console.log(("stroke" + (i + 1)))
            localStorage.setItem("stroke" + (i + 1), event.target.value);
            $("#message").fadeIn(300).fadeOut(300);
        });
    }

    // $("textarea").on("keyup", function () {
    //     let i = $("textarea").index(this) + 1;
    //     localStorage.setItem("stroke" + i, $("#stroke" + i).val());
    //     // console.log($(this).data('stroke') + i + 'が押された');
    //     $("#message").fadeIn(300).fadeOut(300);
    // });

    // // タイトル入力、リアルタイムでLocalStorageに保存
    // $("input.title").on("keyup", function () {
    //     let i = $(".title").index(this) + 1;
    //     console.log(i);
    //     localStorage.setItem("stroke-title" + i, $(".stroke-title" + i).val());
    //     console.log($(this).data("stroke") + i + "が押された");
    //     $("#message").fadeIn(300).fadeOut(300);
    // });
    //  テーマEnd

    // 削除機能
    let handleClear = qsAll("input.clear")
    handleClear.forEach((elm) => {
        strokeTitles.forEach((elm) => {
            index = [].slice.call(strokeTitles).indexOf(elm);
            // let handleClearTarget = qsAll("input.clear")
            // console.log(index + " / " + elm.dataset)
            // handleClearTarget[index].value = localStorage.getItem(
            //     "stroke" + (index + 1)
            // );
        });
    });

    /*
    $("input.clear").on("click", function () {
        let i = $("input.clear").index(this) + 1;
        // console.log($(this).data("clear") + i + "が押された");
 
        var retVal = confirm("消しマンボ?");
        if (retVal == true) {
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
    */

});

// Scroll
// https://sterfield.co.jp/designer/横スクロールを可能にできる「jquery-mousewheel」を使用して/
// window.onwheel = (e) => (e.preventDefault = false);
