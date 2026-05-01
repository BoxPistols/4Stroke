// Keyboard / IME helpers
//
// IME (Input Method Editor) を使う日本語・中国語・韓国語などの入力中、
// Enter キーは「変換確定」のために使われる。素朴に keydown.Enter で submit
// を発火させると、ユーザーが文字を確定しただけで意図せず送信されてしまう。
//
// クロスブラウザ・クロス IME の安全策として、以下を併用する:
//   - KeyboardEvent.isComposing (現代的な標準)
//   - keyCode === 229          (Safari / 一部 IME のフォールバック)

/**
 * KeyboardEvent が IME 変換中かどうか。
 * isComposing が true、または keyCode が 229 のいずれかで判定する。
 */
export function isImeComposing(event) {
  if (!event) return false;
  return event.isComposing === true || event.keyCode === 229;
}
