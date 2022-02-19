# 4Stroke

- issue by Note App

## Dev from

- <https://codepen.io/agdg/pen/QWOEbRO>
- <https://codepen.io/agdg/project/editor/AbvGwm>

## Dev to

<https://github.com/BoxPistols/4Stroke>

---

## Pug

- 継承 追加

```pug
header.header
  block header

// 
extends _title.pug

block append header.header
  p xxx
```

- mixin

```pug
//
mixin section(_title, _className)
  section.section
    //- Clip
    div.copy-value(data-clipboard-text=_title) @include flex
      span &#40;
      span= _title
      span &#41;
    code.code
    code.code
    code.code.option
    div.bx(class!=attributes.class)= _className
      + buttons
//
include mixin/_section.pug
+ section("center")(class="box2")
```