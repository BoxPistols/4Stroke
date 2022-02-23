document.addEventListener('DOMContentLoaded', function () {
    /**
     * 汎用関数
     * @_x = ターゲットエレメント
     */
    let qaAll = (_x) => document.querySelectorAll(_x)
    let strokeTexts = qaAll('.garage-strokes .mol_text')

    // メモ入力欄の設定　LocalStorageの取得
    const elmTexts = strokeTexts
    elmTexts.forEach((elm) => {
        index = [].slice.call(elmTexts).indexOf(elm)
        let strokeClass = qaAll('textarea.stroke')
        strokeClass[index].value = localStorage.getItem('stroke' + (index + 1))
    })

    // タイトルの設定　LocalStorageの取得
    let strokeTitles = qaAll('.garage .title')
    strokeTitles.forEach((elm) => {
        index = [].slice.call(strokeTitles).indexOf(elm)
        let strokeTitle = qaAll('input.title')
        strokeTitle[index].value = localStorage.getItem(
            'stroke-title' + (index + 1)
        )
        // $('.stroke-title' + index).val(
        //     localStorage.getItem('stroke-title' + index)
        // )
    })

    // 削除機能
    /**
     * FIXME! to Vanilla
     */
    $('input.clear').on('click', function () {
        let i = $('input.clear').index(this) + 1
        console.log($(this).data('clear') + i + 'が押された')

        var retVal = confirm('消しマンボ?')
        if (retVal == true) {
            alert('闇に葬りマンボ...')
            $('#stroke' + i).val('')
            localStorage.removeItem('stroke' + i)
            $('this').attr('disabled', true)
            document.querySelector('#stroke' + i).value = ''
            return true
        } else {
            alert('やっぱやめとくわ')
            return false
        }
        localStorage.removeItem('stroke' + i)
    })

    // メモ入力、リアルタイムでLocalStorageに保存
    $('textarea').on('keyup', function () {
        let i = $('textarea').index(this) + 1
        localStorage.setItem('stroke' + i, $('#stroke' + i).val())
        // console.log($(this).data('stroke') + i + 'が押された');
        $('#message').fadeIn(300).fadeOut(300)
    })

    // タイトル入力、リアルタイムでLocalStorageに保存
    $('input.title').on('keyup', function () {
        let i = $('.title').index(this) + 1
        console.log(i)
        localStorage.setItem('stroke-title' + i, $('.stroke-title' + i).val())
        console.log($(this).data('stroke') + i + 'が押された')
        $('#message').fadeIn(300).fadeOut(300)
    })
    //  テーマEnd
})

// Scroll
// https://sterfield.co.jp/designer/横スクロールを可能にできる「jquery-mousewheel」を使用して/
// window.onwheel = (e) => (e.preventDefault = false);
