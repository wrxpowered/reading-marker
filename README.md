# reading-marker
use it to add a underline or comment a note, make the text content with marker feature. work with [reading-pagination](https://github.com/wrxpowered/reading-pagination).

## Usage
here is a html template like this:
```html
<div class="layout-page-wrapper" style="width:487px;height:800px;">
  <div class="layout-page-content" style="height:776px;">
    <div class="paragraph-xs" data-id="8" style="margin-top:-128px;">
      《小王子》是圣埃克苏佩里生前创作的短篇小说，于1943年首次出版。迄今为止，这部作品已经被翻译成两百多种文字，各种译文版本更是数不胜数。因其通俗易懂的语言和充满浪漫色彩的故事情节，《小王子》被视为“孩子们应该知道的”经典童话书。但它不只是一本儿童书，也是一部值得每个人阅读的经典文学作品。书中描述了小王子与玫瑰的爱情、可怕的猴面包树、专制的国王、痴迷于加法的红脸先生、执着的点灯人、小王子与狐狸的友情、沙漠中的水井与歌声……每个故事简单却富有哲理，每段对话质朴却引人深思。故事中传达的重要讯息What is essential is invisible to theeye。（重要的东西用眼睛是看不见的。）触动了很多读者的心灵，是否也会引起你的共鸣呢？
    </div>
    <div class="paragraph-xs" data-id="9" style="">
      本书配有精美的原版手绘插图，一起来欣赏住在童话里的小王子、玫瑰和狐狸吧。另外，我们特别邀请了新东方20周年功勋教师，《多纳亲子英文》双语教学节目作者及主持人杨小元老师分角色朗读全文，扫描每章前的二维码即可聆听英语声优级名师为你倾情演绎。
    </div>
    <div class="paragraph-xs" data-id="10" style="">
      Once when I was six years old I saw amagnificent picture in a book, called TrueStories from Nature, about the primevalforest. It was a picture of a boa constrictor inthe act of swallowing an animal. Here is acopy of the drawing.
    </div>
    <div class="paragraph-xs" data-id="11" style="">
      In the book it said, “Boa constrictors swallowtheir prey whole, without chewing it. Afterthat they are not able to move, and they sleepthrough the six months that they need fordigestion.”
    </div>
    <div class="paragraph-xs" data-id="12" style="">
      I pondered deeply, then, over the adventuresof the jungle. And after some work with acolored pencil I succeeded in making my firstdrawing. My Drawing Number One. It lookedlike this:
    </div>
  </div>
</div>
```

you can use with it:
```js
// init
var marker = new Marker(document.querySelector('.layout-page-content'));

// when select some content, you can add underlines or notes by menu.
marker.onMenuClick((menuId, data) => {
  switch (menuId) {
    case 'UNDERLINE_CREATE':
      marker.addUnderline(data);
      break;
    case 'UNDERLINE_DELETE':
      marker.removeUnderline(data.id);
      break;
    case 'NOTE':
      marker.openNoteInput();
      break;
    case 'COPY':
      marker.copyText(data.abstract);
      break;
    default: break;
  }
});

// destroy
marker.destroy();
```

you can also render underlines or notes in content.
```js
const notes = [
  {
    id: 'a',
    type: 'note',
    startParaId: '3',
    startOffset: 0,
    endParaId: '3',
    endOffset: 11,
    abstract: `“你能帮我画只绵羊吗？”`,
    note: 'this is content'
  },
];

const underlines = [
  {
    id: 'b',
    type: 'underline',
    startParaId: '7',
    startOffset: 45,
    endParaId: '8',
    endOffset: 20,
    abstract: `那位奇特而可爱的小王子游历六个星球之后来到地球，最后和他的绵羊一起消失在沙漠的夜空中。《小王子》是圣埃克苏佩里生前创作的短篇小说`,
  },
];

marker.addUnderlines(underlines);
marker.addNotes(notes);
```



# API
event listener in lifecycle.
* `onScroll()`
* `onSelectStart()`
* `onSelectEnd()`
* `onTouchEnd()`
* `onTap()`
* `onLongTap()`
<br>

useful utilities.
* `copyText(text)`
* `selectWord(event)`
useful in mobile, can choose a specific word with long tap.
<br>

switch.
* `enable()`
* `disable()`
<br>

related to underline and note both.
* `onSelectStatusChange()`
* `onMarkingSelect()`
* `onMenuClick()`
* `addMarking()`
* `addMarkings()`
* `removeMarking()`
* `clearMarkings()`
* `replaceMarkingId(id, newId)`
<br>

underline api.
* `getUnderline(id)`
* `addUnderline(data)`
* `addUnderlines(dataGroup)`
* `removeUnderline(id)`
* `removeUnderlines(ids)`
<br>

note api.
* `onNoteSubmit()`
* `onNoteRemove()`
* `onNoteListOpen()`
* `onNoteInputClose()`
* `openNoteInput()`
* `getNote(id)`
* `addNote(data)`
* `addNotes(dataGroup)`
* `removeNote(id)`
* `removeNotes(ids)`