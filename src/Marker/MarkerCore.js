import Cursor, { CursorType } from './Cursor';
import Mask from './Mask';
import Menu from './Menu';
import Highlight from './Highlight';
import NoteList from './NoteList';
import NoteInput from './NoteInput';
import TouchEvent, { EventType } from './TouchEvent';
import { 
  DeviceType, 
  SelectStatus, 
  MenuType,
} from './types';
import {
  error,
  isNumber,
  checkParaElement,
  getNextParaElement,
  getPrevParaElement,
  trimLine,
  searchLineFromPara,
  searchWordFromLine,
  getWordSibling,
  getParaRects,
  getDeviceType,
  getTouchPosition, 
  isElement, 
  hasClass,
  isIE9,
  getTouch,
  anyToPx,
  containSomeClass,
} from './utilities';
import { TEXTUAL_ITEM_TYPE_ARRAY } from './configs';
import './polyfill';


const defaultOptions = {
  menuItems: [
    {
      id: 'UNDERLINE_CREATE',
      text: '划线',
      type: 'select',
    },
    {
      id: 'UNDERLINE_DELETE',
      text: '删除划线',
      type: 'highlight',
    },
    {
      id: 'NOTE',
      text: '写笔记',
      type: 'note',
    },
    {
      id: 'COPY',
      text: '复制',
      type: 'copy'
    },
  ],
  noteListContainer: document.body,
  noteInputContainer: document.body,
  scrollOffsetTop: 100,
  scrollOffsetBottom: 100,
  scrollSpeedLevel: 4,
}

const preventDefaultCallback = e => e.preventDefault()



export default class MarkerCore {
  constructor(containerElement, options) {
    this.options = Object.assign({}, defaultOptions, options);
    this.deviceType = getDeviceType();
    this.windowHeight = null;
    this.container = null;
    this.scrollContainer = null;
    this.paraAndLinesMap = {};

    this.touchEvent = null;
    this.touchStartTime = 0;
    this.scrollHandler = () => { }
    this.selectEndHandler = () => { }
    this.selectStartHandler = () => { }
    this.touchEndHandler = () => { }
    this.tapHandler = () => { }
    this.longTapHandler = () => { }

    this.$selectStatus = SelectStatus.NONE;
    this.selectStatusChangeHandler = () => { }
    this.textNode = { start: null, end: null };
    this.cursor = { start: null, end: null };
    this.movingCursor = null;
    this.mask = null;
    this.highlight = null;
    this.markingSelectHandler = () => { }
    this.menu = null;
    this.menuClickHandler = () => { }
    this.noteInput = null;
    this.noteSubmitHandler = () => { }
    this.noteInputCloseHandler = () => { }
    this.noteList = null;
    this.noteListOpenHandler = () => { }
    this.noteRemoveHandler = () => { }
    this.scrollInterval = null;
    this.scrollOffsetTop = null;
    this.scrollOffsetBottom = null;
    this.scrollSpeedLevel = null;

    this.create(containerElement);
  }

  get screenRelativeOffset() {
    const { left,top } = this.container.getBoundingClientRect();
    return {
      x: left,
      y: top
    };
  }

  get maxBottom() {
    const target = this.container.querySelector('.layout-page-content');
    if (target) {
      return target.getBoundingClientRect().height;
    }
    return this.container.getBoundingClientRect().height;
  }

  get selectStatus() {
    return this.$selectStatus;
  }

  set selectStatus(val) {
    if (val !== this.$selectStatus) {
      this.selectStatusChangeHandler(val);
    }
    this.$selectStatus = val;
    if (val !== SelectStatus.FINISH) {
      this.menu.hide();
    }
  }


  isContains = (element) => {
    return this.container.contains(element);
  }


  handlePara = (paraEle) => {
    if (!isElement(paraEle)) { return null; }

    const checkEmptyPara = (data) => {
      // 空白段落处理
      if (
        data.lines.length === 1
        && data.index.top[0] === data.index.bottom[0]
      ) { return null; }
      return data;
    }

    const paraId = checkParaElement(paraEle);
    if (!paraId) { return null; }
    if (this.paraAndLinesMap[paraId]) {
      return checkEmptyPara(this.paraAndLinesMap[paraId]);
    }

    const item = getParaRects(
      paraEle,
      paraId,
      this.screenRelativeOffset
    );
    this.paraAndLinesMap[paraId] = item;
    return checkEmptyPara(item);
  }


  getSelectNodeRectAndText = (startNode, endNode, startOffset, endOffset) => {
    let result = {
      rects: [],
      text: '',
      textArr: [],
    }
    const startPara = this.handlePara(startNode);
    const endPara = this.handlePara(endNode);
    const topBoundary = 0;
    const bottomBoundary = this.maxBottom;

    function findLine(para, offset, isFromStart) {
      let lineIndex = null;
      if (isFromStart) {
        lineIndex = 0;
        for (let i = 0, len = para.lines.length; i < len; i++) {
          const line = para.lines[i];
          if (offset <= line[line.length - 1].offset) {
            lineIndex = i;
            break;
          }
        }
      } else {
        const lineOffsets = para.index.offset;
        const totalLine = lineOffsets.length;
        lineIndex = totalLine - 1;
        for (let i = 0, len = totalLine; i < len; i++) {
          if (offset < lineOffsets[i]) {
            lineIndex = i - 1;
            break;
          }
        }
      }
      return lineIndex;
    }

    function findWord(para, lineIndex, offset) {
      const words = para.lines[lineIndex];
      let wordIndex = words.length - 1;
      for (let i = 0, len = words.length; i < len; i++) {
        const word = words[i];
        if (offset <= word.offset) {
          if (offset === word.offset) {
            wordIndex = i;
          } else if (offset < word.offset) {
            wordIndex = i - 1;
          }
          break;
        }
      }
      return wordIndex;
    }

    const concatLine = (line, isLineBreak) => {
      const trimedLine = line.filter(i => i.width !== 0);
      const firstWord = trimedLine[0];
      const endWord = trimedLine[trimedLine.length - 1];
      let item = {
        top: firstWord.top,
        left: firstWord.left,
        right: endWord.right,
        bottom: endWord.bottom,
        width: 0,
        height: firstWord.height,
        text: ''
      };
      line.forEach(i => {
        item.width += i.width;
        if (isLineBreak) {
          item.lineBreak = true;
        } else {
          item.text += i.text;
        }
      });
      if (firstWord.top >= topBoundary && firstWord.top <= bottomBoundary) {
        result.rects.push(item);
      }
      result.text += item.text;
      return item.text;
    }

    const sliceLine = (line, fromWord, toWord, isLineBreak) => {
      const fromIndex = isNumber(fromWord) ? fromWord : 0;
      const toIndex = isNumber(toWord) ? toWord : line.length - 1;
      const wordsOfLine = line.slice(fromIndex, toIndex + 1);
      return concatLine(wordsOfLine, isLineBreak);
    }

    const slicePara = (para, fromOffset, toOffset) => {
      if (!para) { return; }
      const startLineIndex = findLine(para, fromOffset, true);
      const endLineIndex = findLine(para, toOffset);
      if (endLineIndex === -1) { return ''; }
      const lastLine = para.lines[para.lines.length - 1];
      const startWordIndex = isNumber(fromOffset) ? findWord(
        para,
        startLineIndex,
        fromOffset
      ) : 0;
      const endWordIndex = isNumber(toOffset) ? findWord(
        para,
        endLineIndex,
        toOffset
      ) : lastLine.length - 1;

      if (startLineIndex === endLineIndex) {
        return sliceLine(para.lines[startLineIndex], startWordIndex, endWordIndex);
      } else {
        let text = '';
        text += sliceLine(para.lines[startLineIndex], startWordIndex);
        para.lines.slice(startLineIndex + 1, endLineIndex).forEach((line, index) => {
          if (para.index.lineBreak[startLineIndex + 1 + index]) {
            text += concatLine(line, true);
          } else {
            text += concatLine(line);
          }
        });
        text += sliceLine(
          para.lines[endLineIndex], 
          0, 
          endWordIndex,
          para.index.lineBreak[endLineIndex]
        );
        return text;
      }
    }


    if (startNode === endNode) {
      // 一段内的范围
      if (startOffset > endOffset) { return result; }
      result.textArr.push(slicePara(startPara, startOffset, endOffset));
      return result;
    }

    const nextNode = startNode.nextElementSibling;
    if (nextNode) {
      if (nextNode === endNode) {
        // 两段内的范围
        result.textArr.push(slicePara(startPara, startOffset));
        result.textArr.push(slicePara(endPara, 0, endOffset));
      } else {
        // 三段及以上的范围
        result.textArr.push(slicePara(startPara, startOffset));
        const { rects, text, textArr } = this.getSelectNodeRectAndText(nextNode, endNode, 0, endOffset);
        result.rects.push(...rects);
        result.text += text;
        result.textArr.push(...textArr);
      }
    }

    return result;
  }


  getSelectText = () => {
    try {
      return this.getSelectNodeRectAndText(
        this.textNode.start.node,
        this.textNode.end.node,
        this.textNode.start.offset,
        this.textNode.end.offset
      );
    } catch (error) {
      console.error(error);
      return {
        text: '',
        textArr: []
      };
    }
  }


  create = (containerElement, scrollContainerElement) => {
    if (!isElement(containerElement)) {
      error('container element must be specified.');
      return;
    }
    this.container = containerElement;
    this.container.oncontextmenu = e => { 
      e.returnValue = false; 
    }
    this.container.addEventListener('contextmenu', preventDefaultCallback);
    this.windowHeight = document.documentElement.clientHeight;
    this.scrollContainer = scrollContainerElement || document.body;
    if (this.scrollContainer === document.body) {
      this.scrollContainer.onscroll = this.handleScroll.bind(this)
    } else {
      this.containerScroll = () => {
        this.handleScroll()
      }
      this.scrollContainer.addEventListener('scroll', this.containerScroll)
    }

    if (isIE9()) {
      document.body.onselectstart = document.body.ondrag = function () {
        return false;
      } 
    }

    this.touchEvent = new TouchEvent(this.container);
    this.touchEvent.registerEvent(
      EventType.TOUCH_START, 
      this.handleTouchStart
    );
    this.touchEvent.registerEvent(
      EventType.TOUCH_MOVE,
      this.handleTouchMove
    );
    this.touchEvent.registerEvent(
      EventType.TOUCH_MOVE_THROTTLE, 
      this.handleTouchMoveThrottle
    );
    this.touchEvent.registerEvent(
      EventType.TOUCH_END, 
      this.handleTouchEnd
    );
    this.touchEvent.registerEvent(
      EventType.TAP,
      this.handleTap
    );
    this.touchEvent.registerEvent(
      EventType.LONG_TAP, 
      this.handleLongTap
    );

    this.cursor.start = new Cursor(
      this.container,
      CursorType.START
    );
    this.cursor.end = new Cursor(
      this.container,
      CursorType.END
    );
    this.movingCursor = this.cursor.end;
    this.mask = new Mask(this.container, this);
    this.menu = new Menu(this.container, {
      menuItems: this.options.menuItems
    }, this);
    this.highlight = new Highlight(this.container, this);
    this.noteList = new NoteList(this.options.noteListContainer, this);
    this.noteInput = new NoteInput(this.options.noteInputContainer, this);
    this.scrollOffsetTop = anyToPx(this.options.scrollOffsetTop);
    this.scrollOffsetBottom = anyToPx(this.options.scrollOffsetBottom);
    this.scrollSpeedLevel = this.options.scrollSpeedLevel;
  }

  handleTouchStart = (e) => {
    if (
      this.selectStatus === SelectStatus.FINISH
      && this.menu.isShow
      && this.menu.type !== MenuType.HIGHLIGHT
    ) {
      const position = this.getTouchRelativePosition(e);
      const startCursorRegion = this.cursor.start.inRegion(position);
      const endCursorRegion = this.cursor.end.inRegion(position);

      if (startCursorRegion.inRegion && endCursorRegion.inRegion) {
        this.selectStatus = SelectStatus.SELECTING;
        this.movingCursor = startCursorRegion.distance < endCursorRegion.distance ? this.cursor.start : this.cursor.end;
        this.selectStartHandler();
      } else if (endCursorRegion.inRegion) {
        this.selectStatus = SelectStatus.SELECTING;
        this.movingCursor = this.cursor.end;
        this.selectStartHandler();
      } else if (startCursorRegion.inRegion) {
        this.selectStatus = SelectStatus.SELECTING;
        this.movingCursor = this.cursor.start;
        this.selectStartHandler();
      }
    }

    if (this.deviceType === DeviceType.PC) {
      if (this.selectStatus === SelectStatus.FINISH) {
        const isMenuClick = this.menu.inRegion(e);

        const position = this.getTouchRelativePosition(e);
        const startCursorRegion = this.cursor.start.inRegion(position);
        const endCursorRegion = this.cursor.end.inRegion(position);
        if (
          !isMenuClick
          && !startCursorRegion.inRegion
          && !endCursorRegion.inRegion
        ) {
          this.reset();
        }
      }
      if (this.selectStatus === SelectStatus.NONE && this.isContains(e.target)) {
        const { x, y } = getTouchPosition(e);
        this.touchStartTime = Date.now();
        const element = document.elementFromPoint(x, y);
        let clickPosition = this.getClickPosition(
          element,
          x - this.screenRelativeOffset.x,
          y - this.screenRelativeOffset.y,
          this.movingCursor !== this.cursor.start
        );
        if (clickPosition) {
          clickPosition = this.getExactPosition(
            clickPosition,
            x - this.screenRelativeOffset.x,
            this.movingCursor !== this.cursor.start
          );
          this.textNode.start = {
            id: clickPosition.paraId,
            node: clickPosition.paraElement,
            offset: clickPosition.word.offset
          }
          if (this.textNode.start) {
            this.cursor.start.height = clickPosition.word.height;
            this.cursor.start.position = {
              x: clickPosition.x,
              y: clickPosition.y
            };
          }
        }
      }
    }
  }

  handleTouchMove = (e) => {
    if (this.selectStatus === SelectStatus.SELECTING) {
      e.preventDefault();
    }
  }

  handleTouchMoveThrottle = (e) => {
    if (this.deviceType === DeviceType.PC) {
      if (
        this.selectStatus === SelectStatus.NONE 
        && this.textNode.start 
        && !this.textNode.end
      ) {
        if (Date.now() - this.touchStartTime < 100) { return; }
        const { x, y } = getTouchPosition(e);
        const element = document.elementFromPoint(x, y);
        let clickPosition = this.getClickPosition(
          element,
          x - this.screenRelativeOffset.x,
          y - this.screenRelativeOffset.y,
          this.movingCursor !== this.cursor.start
        );
        if (clickPosition) {
          clickPosition = this.getExactPosition(
            clickPosition,
            x - this.screenRelativeOffset.x,
            this.movingCursor !== this.cursor.start
          );
          this.textNode.end = {
            id: clickPosition.paraId,
            node: clickPosition.paraElement,
            offset: clickPosition.word.offset
          }
          if (this.textNode.end) {
            this.cursor.end.height = clickPosition.word.height;
            this.cursor.end.position = {
              x: clickPosition.x,
              y: clickPosition.y
            }
            this.selectStatus = SelectStatus.SELECTING;
          }
        }
      }
    }

    if (this.selectStatus === SelectStatus.SELECTING) {
      const cursorOffset = this.deviceType === DeviceType.MOBILE ? this.movingCursor.height / 2 : 0
      const offset = this.movingCursor.offset || {
        x: 0,
        y: -cursorOffset,
      }
      const { x, y } = getTouchPosition(e, offset);
      const target = document.elementFromPoint(x, y);
      if (this.isContains(target)) {
        this.moveCursor(target, x, y);
      }
      const touch = getTouch(e);
      const targetY = e.clientY || touch.clientY;
      if (targetY >= this.windowHeight - this.scrollOffsetBottom) {
        if (this.scrollInterval !== null) { clearInterval(this.scrollInterval); }
        const rate = ((targetY - this.windowHeight + this.scrollOffsetBottom) * this.scrollSpeedLevel) / this.scrollOffsetBottom;
        if (this.isContains(target)) {
          this.scrollInterval = setInterval(() => {
            this.scrollHandler(rate);
          }, 10);
        }
      } else if (targetY <= this.scrollOffsetTop) {
        if (this.scrollInterval !== null) { clearInterval(this.scrollInterval); }
        const rate = ((this.scrollOffsetTop - targetY) * this.scrollSpeedLevel) / this.scrollOffsetTop;
        if (this.isContains(target)) {
          this.scrollInterval = setInterval(() => {
            this.scrollHandler(-rate);
          }, 10);
        }
      } else {
        if (this.scrollInterval) {
          clearInterval(this.scrollInterval)
          this.scrollInterval = null
        }
      }
    }
  }

  handleTouchEnd = (e) => {
    if (this.selectStatus === SelectStatus.SELECTING) {
      if (this.scrollInterval) {
        clearInterval(this.scrollInterval)
        this.scrollInterval = null
      }
    }
    if (this.selectStatus === SelectStatus.SELECTING) {
      this.selectStatus = SelectStatus.FINISH;
      this.menu.show();
      this.selectEndHandler();
    }
    if (this.deviceType === DeviceType.PC) {
      if (this.selectStatus === SelectStatus.NONE) {
        this.reset();
      }
    }
    this.touchEndHandler(e);
  }

  handleScroll() {
    // if (this.selectStatus === SelectStatus.FINISH) {
    //   this.menu.handleScroll()
    // }
  }

  handleLongTap = (e) => {
    if (this.deviceType === DeviceType.MOBILE) {
      if (this.isContains(e.target)) {
        const position = this.getTouchRelativePosition(e);
        const startCursorRegion = this.cursor.start.inRegion(position);
        const endCursorRegion = this.cursor.end.inRegion(position);
        if (
          this.selectStatus === SelectStatus.FINISH
          && (startCursorRegion.inRegion || endCursorRegion.inRegion)
        ) {
          return; 
        }
        this.longTapHandler(e);
      }
    }
  }

  handleTap = (e) => {
    if (e.type === 'mouseleave') {
      const element = e.toElement || e.relatedTarget;
      if (!this.container.contains(element)) { return; }
    }

    if (this.selectStatus === SelectStatus.FINISH) {
      // 菜单操作 或 取消选区
      const isNoteTap = this.menu.handleTap(e);
      if (isNoteTap === null) { return; }

      const position = this.getTouchRelativePosition(e);
      const startCursorRegion = this.cursor.start.inRegion(position);
      const endCursorRegion = this.cursor.end.inRegion(position);
      if (startCursorRegion.inRegion || endCursorRegion.inRegion) {
        return; 
      }
      this.reset();
    } else if (this.selectStatus === SelectStatus.NONE) {
      if (hasClass(e.target, 'mark')) {
        this.tapHandler(e);
        return;
      }
      // tap 或 笔记划线选中
      const inHighlightLine = this.highlight.handleTap(e);
      if (
        !inHighlightLine
        && this.deviceType === DeviceType.MOBILE
        && this.isContains(e.target)
      ) {
        this.tapHandler(e);
      }
    }
  }

  getTouchRelativePosition = (e) => {
    const cursorOffset = this.deviceType === DeviceType.MOBILE ? this.movingCursor.height / 2 : 0
    const offset = {
      x: 0,
      y: -cursorOffset,
    }
    const position = getTouchPosition(e, offset)
    position.x -= this.screenRelativeOffset.x
    position.y -= this.screenRelativeOffset.y
    return position
  }




  getClickPosition = (element, x, y, isStartCursor) => {
    let paraElement = element;
    if (!containSomeClass(element, TEXTUAL_ITEM_TYPE_ARRAY)) {
      paraElement = element.parentElement;
    }
    const para = this.handlePara(paraElement);
    if (!para) { return null; }

    const lineIndex = searchLineFromPara(para.index, y, this.maxBottom);
    if (lineIndex !== null && lineIndex > -1) {
      /**
       * 行内处理
       */
      const line = trimLine(para.lines[lineIndex]);
      const wordIndex = searchWordFromLine(para.lines[lineIndex], x);

      if (wordIndex !== null) {
        const word = line[wordIndex];
        const sibling = getWordSibling(line, wordIndex);
        let posX;
        if (isStartCursor) {
          // 头游标默认在单词左侧
          posX = word.left;
        } else {
          // 尾游标默认在单词右侧
          posX = word.right;
        }
        return {
          x: posX,
          y: word.top,
          word,
          prevWord: sibling.prev,
          nextWord: sibling.next,
          line,
          paraElement,
          paraId: para.id,
        }
      } else {
        /**
         * 首尾行空白处理
         */
        const firstWord = line[0];
        const lastWordIndex = line.length - 1;
        const lastWord = line[lastWordIndex];
        if (lineIndex === 0 && x < firstWord.left) {
          const sibling = getWordSibling(line, 0);
          return {
            x: firstWord.left,
            y: firstWord.top,
            word: firstWord,
            prevWord: null,
            nextWord: sibling.next,
            line,
            paraElement,
            paraId: para.id,
            beforeStartOfLine: true,
          }
        } else if (lineIndex === para.lines.length - 1 && x > lastWord.right) {
          const sibling = getWordSibling(line, lastWordIndex);
          return {
            x: lastWord.right,
            y: lastWord.top,
            word: lastWord,
            prevWord: sibling.prev,
            nextWord: null,
            line,
            paraElement,
            paraId: para.id,
            afterEndOfLine: true,
          }
        }
      }
    }

    return null;
  }


  getExactPosition = (clickPosition, x, isStartCursor) => {
    let pos = clickPosition;
    const isRight = x >= (pos.word.left + pos.word.right) / 2;

    if (isStartCursor) {
      if (pos.afterEndOfLine && pos.y < this.cursor.end.position.y) {
        // 头游标移动到前段落结尾
        const nextParaEle = getNextParaElement(pos.paraElement);
        const para = this.handlePara(nextParaEle);
        if (para) {
          const firstWord = para.lines[0][0];
          pos.x = firstWord.left;
          pos.y = firstWord.top;
          pos.word = firstWord;
          const sibling = getWordSibling(para.lines[0], 0);
          pos.prevWord = sibling.prev;
          pos.nextWord = sibling.next;
          pos.line = para.lines[0];
          pos.paraElement = nextParaEle;
          pos.paraId = para.id;
          pos.beforeStartOfLine = true;
          pos.afterEndOfLine = undefined;
        }
      } else if (
        isRight 
        && pos.nextWord 
        && !pos.beforeStartOfLine
      ) {
        // 当前单词未选中
        pos.x = pos.nextWord.left;
        pos.y = pos.nextWord.top;
        pos.word = pos.nextWord;
        const sibling = getWordSibling(
          pos.line,
          pos.nextWord.indexOfLine
        );
        pos.prevWord = sibling.prev;
        pos.nextWord = sibling.next;
      }
    } else {
      if (pos.beforeStartOfLine && pos.y > this.cursor.start.position.y) {
        // 尾游标移动到后段落开头
        const prevParaEle = getPrevParaElement(pos.paraElement);
        const para = this.handlePara(prevParaEle);
        if (para) {
          const lastLine = para.lines[para.lines.length - 1];
          const lastWord = lastLine[lastLine.length - 1];
          pos.x = lastWord.right;
          pos.y = lastWord.top;
          pos.word = lastWord;
          const sibling = getWordSibling(lastLine, lastLine[lastLine.length - 1]);
          pos.prevWord = sibling.prev;
          pos.nextWord = sibling.next;
          pos.line = lastLine;
          pos.paraElement = prevParaEle;
          pos.paraId = para.id;
          pos.afterEndOfLine = true;
          pos.beforeStartOfLine = undefined;
        }
      } else if (
        !isRight 
        && pos.prevWord 
        && !pos.afterEndOfLine
      ) {
        // 当前单词未选中
        pos.x = pos.prevWord.right;
        pos.y = pos.prevWord.top;
        pos.word = pos.prevWord;
        const sibling = getWordSibling(
          pos.line,
          pos.prevWord.indexOfLine
        );
        pos.prevWord = sibling.prev;
        pos.nextWord = sibling.next;
      }
    }

    return pos;
  }


  swapCursor = (clickPosition, x, y, isStartCursor) => {
    const pos = clickPosition;

    if (isStartCursor) {
      const endPosition = this.cursor.end.position;
      if (
        pos.y > endPosition.y
        || (
          pos.y === endPosition.y
          && pos.x >= endPosition.x
        )
      ) {
        /**
         * ==========
         * 同行交换游标
         * ==========
         */
        if (
          pos.y === endPosition.y
          && this.cursor.start.position.y === endPosition.y
        ) {
          if (pos.x === endPosition.x) {
            /**
             * 游标重叠：
             * - 行尾空白处
             * - 当前单词 < 1|2
             * - 下一个单词 < 1|2
             */
            if (pos.afterEndOfLine) { return false; }
            const isRight = x >= (pos.word.left + pos.word.right) / 2;
            if (x > endPosition.x && isRight) {
              // 特殊处理：段落结尾倒数第二个单词
              this.cursor.start.position = this.cursor.end.position;
              this.movingCursor = this.cursor.end;
              this.movingCursor.position = {
                x: pos.word.right,
                y: pos.word.top
              }
              this.textNode.start = this.textNode.end = {
                id: pos.paraId,
                node: pos.paraElement,
                offset: pos.word.offset,
              }
              return true;
            }
            return false;
          } else {
            // 未产生游标重叠
            this.cursor.start.position = this.cursor.end.position;
            this.movingCursor = this.cursor.end;
            this.movingCursor.position = {
              x: pos.x,
              y: pos.y,
            }

            const para = this.paraAndLinesMap[pos.paraId];
            const offsets = Object.keys(para.offsetsMap);
            const offsetIndex = offsets.indexOf("" + this.textNode.end.offset);
            this.textNode.start = {
              id: pos.paraId,
              node: pos.paraElement,
              offset: +offsets[offsetIndex + 1],
            }
            this.textNode.end = {
              id: pos.paraId,
              node: pos.paraElement,
              offset: pos.prevWord.offset,
            }
          }
        }
        /**
         * ==========
         * 错行交换游标
         * ==========
         */
        else {
          if (pos.x === endPosition.x && pos.y === endPosition.y) {
            return; // 错行时的游标重叠
          }

          const para = this.paraAndLinesMap[this.textNode.end.id];
          const endOffset = this.textNode.end.offset;
          const rightOffsets = para.lines.map(line => {
            const trimedLine = trimLine(line);
            return trimedLine[trimedLine.length - 1].offset;
          });
          const endLineIndex = rightOffsets.indexOf(endOffset);

          const startPara = this.paraAndLinesMap[pos.paraId];
          const startOffset = pos.word.offset;
          const startLineIndex = startPara.index.offset.indexOf(startOffset);

          if (endLineIndex > -1) {
            /**
             * ==================
             * 偏移处理：向下偏移一行
             * ==================
             */
            if (pos.beforeStartOfLine) { return; }

            this.cursor.start.position = this.cursor.end.position;
            this.movingCursor = this.cursor.end;
            this.movingCursor.height = pos.word.height;
            this.movingCursor.position = { x: pos.x, y: pos.y };

            if (endLineIndex === para.index.offset.length - 1) {
              // textNode.end 在段尾时的偏移
              const nextParaEle = getNextParaElement(this.textNode.end.node);
              const nextPara = this.handlePara(nextParaEle);
              if (!nextPara) { return; }
              const firstLine = trimLine(nextPara.lines[0]);
              const firstWord = firstLine[0];
              this.cursor.start.height = firstWord.height;
              this.cursor.start.position = {
                x: firstWord.left,
                y: firstWord.top,
              }
              this.textNode.start = {
                id: nextPara.id,
                node: nextParaEle,
                offset: firstWord.offset
              }
            } else {
              // textNode.end 在行尾时的偏移
              const nextLine = trimLine(para.lines[endLineIndex + 1]);
              const firstWord = nextLine[0];
              this.cursor.start.position = {
                x: firstWord.left,
                y: firstWord.top,
              }
              this.textNode.start.offset = firstWord.offset;
            }

            if (pos.prevWord) {
              this.textNode.end = {
                id: pos.paraId,
                node: pos.paraElement,
                offset: pos.prevWord.offset,
              }
            } else {
              // 段落只有一个单词时，调整到当前单词
              this.textNode.end = {
                id: pos.paraId,
                node: pos.paraElement,
                offset: pos.word.offset,
              }
              this.cursor.end.position = {
                x: pos.word.right,
                y: pos.word.top,
              }
            }
          } else if (startLineIndex > -1) {
            /**
             * ===============
             * 偏移处理：定位行尾
             * ===============
             */
            this.cursor.start.position = this.cursor.end.position;
            this.movingCursor = this.cursor.end;
            this.movingCursor.height = pos.word.height;
            this.movingCursor.position = { x: pos.x, y: pos.y };

            const offsets = Object.keys(para.offsetsMap);
            const offsetIndex = offsets.indexOf("" + this.textNode.end.offset);
            this.textNode.start = {
              id: this.textNode.end.id,
              node: this.textNode.end.node,
              offset: +offsets[offsetIndex + 1],
            }

            if (startLineIndex === 0) {
              // 移动到段首时的偏移
              const prevParaEle = getPrevParaElement(pos.paraElement);
              const prevPara = this.handlePara(prevParaEle);
              const lastLine = trimLine(prevPara.lines[prevPara.lines.length - 1]);
              const lastWord = lastLine[lastLine.length - 1];
              this.movingCursor.height = lastWord.height;
              this.movingCursor.position = {
                x: lastWord.right,
                y: lastWord.top,
              }
              this.textNode.end = {
                id: prevPara.id,
                node: prevParaEle,
                offset: lastWord.offset,
              }
            } else {
              // 移动到行首时的偏移
              const prevLine = trimLine(startPara.lines[startLineIndex - 1]);
              const lastWord = prevLine[prevLine.length - 1];
              this.movingCursor.position = {
                x: lastWord.right,
                y: lastWord.top,
              }
              this.textNode.end = {
                id: pos.paraId,
                node: pos.paraElement,
                offset: lastWord.offset,
              }
            }
          } else {
            /**
             * ===============
             * 非行首行尾时的交换（默认）
             * ===============
             */
            if (!pos.prevWord) { return; }

            this.cursor.start.position = this.cursor.end.position;
            this.movingCursor = this.cursor.end;
            this.movingCursor.height = pos.word.height;
            this.movingCursor.position = { x: pos.x, y: pos.y };

            const offsets = Object.keys(para.offsetsMap);
            const offsetIndex = offsets.indexOf("" + this.textNode.end.offset);
            this.textNode.start = {
              id: this.textNode.end.id,
              node: this.textNode.end.node,
              offset: +offsets[offsetIndex + 1],
            }
            this.textNode.end = {
              id: pos.paraId,
              node: pos.paraElement,
              offset: pos.prevWord.offset,
            }
          }
        }
      } else {
        // 未交换
        this.movingCursor.height = pos.word.height;
        this.movingCursor.position = {
          x: pos.x,
          y: pos.y,
        }
        this.textNode.start = {
          id: pos.paraId,
          node: pos.paraElement,
          offset: pos.word.offset,
        }
      }
    } else {
      const startPosition = this.cursor.start.position;
      if (
        pos.y < startPosition.y
        || (
          pos.y === startPosition.y 
          && pos.x <= startPosition.x
        )
      ) {
        /**
         * ==========
         * 同行交换游标
         * ==========
         */
        if (
          pos.y === startPosition.y
          && startPosition.y === this.cursor.end.position.y
        ) {
          if (pos.x === startPosition.x) {
            /**
             * 游标重叠：
             * - 行首空白处
             * - 当前单词 < 1|2
             * - 上一个单词 < 1|2
             */
            if (pos.beforeStartOfLine) { return false; }
            const isRight = x >= (pos.word.left + pos.word.right) / 2;
            if (x < startPosition.x && !isRight) {
              // 特殊处理：段落开头第二个单词
              this.cursor.end.position = this.cursor.start.position;
              this.movingCursor = this.cursor.start;
              this.movingCursor.position = {
                x: pos.word.left,
                y: pos.word.top
              }
              this.textNode.start = this.textNode.end = {
                id: pos.paraId,
                node: pos.paraElement,
                offset: pos.word.offset,
              }
              return true;
            }
            return false;
          } else {
            // 未产生游标重叠
            this.cursor.end.position = this.cursor.start.position;
            this.movingCursor = this.cursor.start;
            this.movingCursor.position = {
              x: pos.x,
              y: pos.y
            }

            const para = this.paraAndLinesMap[pos.paraId];
            const offsets = Object.keys(para.offsetsMap);
            const offsetIndex = offsets.indexOf("" + this.textNode.start.offset);
            this.textNode.end = {
              id: pos.paraId,
              node: pos.paraElement,
              offset: +offsets[offsetIndex - 1],
            }
            this.textNode.start = {
              id: pos.paraId,
              node: pos.paraElement,
              offset: pos.nextWord.offset,
            }
          }
        }
        /**
         * ==========
         * 错行交换游标
         * ==========
         */
        else {
          if (pos.x === startPosition.x && pos.y === startPosition.y) {
            return; // 错行时的游标重叠
          }

          const para = this.paraAndLinesMap[this.textNode.start.id];
          const startOffset = this.textNode.start.offset;
          const startLineIndex = para.index.offset.indexOf(startOffset);

          const endPara = this.paraAndLinesMap[pos.paraId];
          const endOffset = pos.word.offset;
          const endLineIndex = endPara.lines.map(line => {
            const trimedLine = trimLine(line);
            return trimedLine[trimedLine.length - 1].offset;
          }).indexOf(endOffset);

          if (startLineIndex > -1) {
            /**
             * ==================
             * 偏移处理：向上偏移一行
             * ==================
             */
            if (pos.afterEndOfLine) { return; }

            this.cursor.end.position = this.cursor.start.position;
            this.movingCursor = this.cursor.start;
            this.movingCursor.height = pos.word.height;
            this.movingCursor.position = { x: pos.x, y: pos.y };

            if (startLineIndex === 0) {
              // textNode.start 在段首时的偏移
              const prevParaEle = getPrevParaElement(this.textNode.start.node);
              const prevPara = this.handlePara(prevParaEle);
              if (!prevPara) { return; }
              const lastLine = trimLine(prevPara.lines[prevPara.lines.length - 1]);
              const lastWord = lastLine[lastLine.length - 1];
              this.cursor.end.height = lastWord.height;
              this.cursor.end.position = {
                x: lastWord.right,
                y: lastWord.top,
              }
              this.textNode.end = {
                id: prevPara.id,
                node: prevParaEle,
                offset: lastWord.offset,
              }
            } else {
              // textNode.start 在行首时的偏移
              const prevLine = trimLine(para.lines[startLineIndex - 1]);
              const lastWord = prevLine[prevLine.length - 1];
              this.cursor.end.position = {
                x: lastWord.right,
                y: lastWord.top,
              };
              this.textNode.end.offset = lastWord.offset;
            }

            if (pos.nextWord) {
              this.textNode.start = {
                id: pos.paraId,
                node: pos.paraElement,
                offset: pos.nextWord.offset,
              }
            } else {
              // 段落只有一个单词时，调整到当前单词
              this.textNode.start = {
                id: pos.paraId,
                node: pos.paraElement,
                offset: pos.word.offset,
              }
              this.cursor.start.position = {
                x: pos.word.left,
                y: pos.word.top
              }
            }
          } else if (endLineIndex > -1) {
            /**
             * ===============
             * 偏移处理：定位行首
             * ===============
             */
            this.cursor.end.position = this.cursor.start.position;
            this.movingCursor = this.cursor.start;
            this.movingCursor.height = pos.word.height;
            this.movingCursor.position = { x: pos.x, y: pos.y };

            const offsets = Object.keys(para.offsetsMap);
            const offsetIndex = offsets.indexOf("" + this.textNode.start.offset);
            this.textNode.end = {
              id: this.textNode.start.id,
              node: this.textNode.start.node,
              offset: +offsets[offsetIndex - 1]
            }

            if (endLineIndex === endPara.lines.length - 1) {
              // 移动到段尾时的偏移
              const nextParaEle = getNextParaElement(pos.paraElement);
              const nextPara = this.handlePara(nextParaEle);
              const firstWord = nextPara.lines[0][0];
              this.movingCursor.height = firstWord.height;
              this.movingCursor.position = {
                x: firstWord.left,
                y: firstWord.top
              }
              this.textNode.start = {
                id: nextPara.id,
                node: nextParaEle,
                offset: firstWord.offset
              }
            } else {
              // 移动到行尾时的偏移
              const nextLine = trimLine(endPara.lines[endLineIndex + 1]);
              const firstWord = nextLine[0];
              this.movingCursor.position = {
                x: firstWord.left,
                y: firstWord.top
              }
              this.textNode.start = {
                id: pos.paraId,
                node: pos.paraElement,
                offset: firstWord.offset,
              }
            }
          } else {
            /**
             * ===============
             * 非行首行尾时的交换（默认）
             * ===============
             */
            if (!pos.nextWord) { return; }

            this.cursor.end.position = this.cursor.start.position;
            this.movingCursor = this.cursor.start;
            this.movingCursor.height = pos.word.height;
            this.movingCursor.position = { x: pos.x, y: pos.y };

            const offsets = Object.keys(para.offsetsMap);
            const offsetIndex = offsets.indexOf("" + this.textNode.start.offset);
            this.textNode.end = {
              id: this.textNode.start.id,
              node: this.textNode.start.node,
              offset: +offsets[offsetIndex - 1]
            }
            this.textNode.start = {
              id: pos.paraId,
              node: pos.paraElement,
              offset: pos.nextWord.offset,
            }
          }
        }
      } else {
        // 未产生游标交换
        this.movingCursor.height = pos.word.height;
        this.movingCursor.position = {
          x: pos.x,
          y: pos.y
        }
        this.textNode.end = {
          id: pos.paraId,
          node: pos.paraElement,
          offset: pos.word.offset,
        }
      }
    }
    return true;
  }


  moveCursor = (element, x, y) => {
    const isStartCursor = this.movingCursor === this.cursor.start;
    x = x - this.screenRelativeOffset.x;
    y = y - this.screenRelativeOffset.y;

    // 确认选词
    let clickPosition = this.getClickPosition(
      element,
      x,
      y,
      isStartCursor,
    );
    if (clickPosition === null) { return; }
    if (!clickPosition.word) { return; }

    // 修正选词（不处理游标交换情况）
    clickPosition = this.getExactPosition(
      clickPosition,
      x,
      isStartCursor
    );

    // 处理游标与选区
    const isCursorOverlap = this.swapCursor(
      clickPosition,
      x,
      y,
      isStartCursor
    );
    if (!isCursorOverlap) {return;}

    this.cursor.start.show();
    this.cursor.end.show();
    this.mask.render(this.textNode.start, this.textNode.end);
  }


  showHighlightMenu = (selection, type) => {
    this.textNode.start = {
      id: selection.start.id,
      node: selection.start.node,
      offset: selection.start.offset
    }
    this.textNode.end = {
      id: selection.end.id,
      node: selection.end.node,
      offset: selection.end.offset
    }
    this.selectStatus = SelectStatus.FINISH;
    this.menu.type = type;
    this.menu.show();
  }


  destroy = () => {
    this.container.oncontextmenu = null;
    this.container.removeEventListener('contextmenu', preventDefaultCallback);
    if (isIE9()) {
      document.body.onselectstart = document.body.ondrag = null;
    }
    if (this.containerScroll !== null) {
      this.scrollContainer.removeEventListener('scroll', this.containerScroll)
      this.containerScroll = null
    }
    this.scrollContainer.onscroll = null

    this.touchEvent.destroy();
    this.cursor.start.destroy();
    this.cursor.end.destroy();
    this.mask.destroy();
    this.highlight.destroy();
    this.menu.destroy();
    this.noteInput.destroy();
    this.noteList.destroy();

    this.container = null;
    this.paraAndLinesMap = {};

    this.touchEvent = null;
    this.touchStartTime = 0;
    this.scrollHandler = () => { }
    this.selectStartHandler = () => { }
    this.selectEndHandler = () => { }
    this.touchEndHandler = () => { }
    this.tapHandler = () => { }
    this.longTapHandler = () => { }

    this.$selectStatus = SelectStatus.NONE;
    this.selectStatusChangeHandler = () => { }
    this.textNode = { start: null, end: null };
    this.cursor = { start: null, end: null };
    this.movingCursor = null;
    this.mask = null;
    this.highlight = null;
    this.markingSelectHandler = () => { }
    this.menu = null;
    this.menuClickHandler = () => { }
    this.noteInput = null;
    this.noteSubmitHandler = () => { }
    this.noteInputCloseHandler = () => { }
    this.noteList = null;
    this.noteListOpenHandler = () => { }
    this.noteRemoveHandler = () => { }
    this.windowHeight = null;
    this.scrollContainer = null
    this.scrollInterval = null;
    this.scrollOffsetTop = null;
    this.scrollOffsetBottom = null;
    this.scrollSpeedLevel = null;
  }

  reset = () => {
    this.selectStatus = SelectStatus.NONE;
    this.cursor.start.hide();
    this.cursor.end.hide();
    this.mask.reset();
    this.menu.hide();
    this.textNode = { start: null, end: null }
    this.noteList.hide();
    this.noteInput.reset();
  }
}