import MarkerCore from './MarkerCore';
import {
  isElement,
  isArray,
  containSomeClass,
  log,
  checkMarkingData,
  getTouchPosition,
} from './utilities';
import {
  SelectStatus, 
  HighlightType, 
  MarkingType 
} from './types';
import { TEXTUAL_ITEM_TYPE_ARRAY } from './configs';



export default class MarkerHandler extends MarkerCore {
  constructor(...args) {
    super(...args);
  }

  // 文本复制
  copyText = (text) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'absolute';
    textarea.style.left = '-99999'
    document.body.appendChild(textarea);
    textarea.select();
    if (document.execCommand('copy')) {
      document.execCommand('copy');
    }
    document.body.removeChild(textarea);
  }

  onScroll = (callback) => {
    if (typeof callback !== 'function') { return; }
    this.scrollHandler = callback;
  }

  onSelectStart = (callback) => {
    if (typeof callback !== 'function') { return; }
    this.selectStartHandler = callback;
  }

  onSelectEnd = (callback) => {
    if (typeof callback !== 'function') { return; }
    this.selectEndHandler = callback;
  }

  onTouchEnd = (callback) => {
    if (typeof callback !== 'function') { return; }
    this.touchEndHandler = callback;
  }

  // 单击
  onTap = (callback) => {
    if (typeof callback !== 'function') { return; }
    this.tapHandler = callback;
  }

  // 长按
  onLongTap = (callback) => {
    if (typeof callback !== 'function') { return; }
    this.longTapHandler = callback;
  }

  // 选中单词
  selectWord = (e) => {
    const element = e.target;
    if (!isElement(element)) {
      log('invalid parameter.');
      return false;
    }
    if (!this.isContains(element)) {
      log('element is out of boundary.');
      return false;
    }

    let paraElement = element;
    if (!containSomeClass(element, TEXTUAL_ITEM_TYPE_ARRAY)) {
      paraElement = element.parentElement;
    }
    const para = this.handlePara(paraElement);
    if (!para) { return false; }

    const { x, y } = getTouchPosition(e);
    const wordPos = this.getClickPosition(
      paraElement,
      x - this.screenRelativeOffset.x,
      y - this.screenRelativeOffset.y
    );

    const offset = wordPos.word.offset;
    const { rects } = this.getSelectNodeRectAndText(
      paraElement,
      paraElement,
      offset,
      offset
    );
    if (rects.length === 0) { return false; }

    const startRect = rects[0];
    const endRect = rects[rects.length - 1];

    this.textNode.start = {
      id: para.id,
      node: paraElement,
      offset: offset
    }
    this.cursor.start.height = startRect.height;
    this.cursor.start.position = {
      x: startRect.left,
      y: startRect.top,
    }

    this.textNode.end = {
      id: para.id,
      node: paraElement,
      offset: offset
    }
    this.cursor.end.height = endRect.height;
    this.cursor.end.position = {
      x: endRect.left + endRect.width,
      y: endRect.top
    }

    this.noteList.hide();
    this.cursor.start.show();
    this.cursor.end.show();
    this.mask.renderRectsLine(rects);
    this.menu.reset();
    this.selectStatus = SelectStatus.FINISH;
    this.menu.show();
    return true;
  }

  // 禁用
  disable = () => {
    this.touchEvent.disable();
  }

  // 启用
  enable = () => {
    this.touchEvent.enable();
  }

  // 选中状态变化
  onSelectStatusChange = (callback) => {
    if (typeof callback !== 'function') { return; }
    this.selectStatusChangeHandler = callback;
  }

  // 笔记划线选中监听
  onMarkingSelect = (callback) => {
    if (typeof callback !== 'function') { return; }
    this.markingSelectHandler = callback;
  }

  // 菜单点击
  onMenuClick = (callback) => {
    if (typeof callback !== 'function') { return; }
    this.menuClickHandler = callback;
  }

  // 添加笔记划线
  addMarking = (data) => {
    if (data) {
      if (data.type === MarkingType.UNDERLINE) {
        return this.addUnderline(data);
      } else if (data.type === MarkingType.NOTE) {
        return this.addNote(data);
      }
      log(`method 'addMarking' parameter is not valid marking data`);
      return null;
    }
    log(`method 'addMarking' parameter is not detected.`);
    return null;
  }

  // 批量添加笔记划线
  addMarkings = (dataGroup) => {
    if (!isArray(dataGroup)) {
      log(`method 'addMarkings' parameter should be an array.`)
      return null;
    }
    const underlinesData = dataGroup.filter(i => i.type === MarkingType.UNDERLINE);
    const notesData = dataGroup.filter(i => i.type === MarkingType.NOTE);
    const underlines = this.addUnderlines(underlinesData);
    const notes = this.addNotes(notesData);
    return {
      underlines,
      notes
    }
  }

  // 删除笔记划线
  removeMarking = (id) => {
    if (this.highlight.lineMap.has(id)) {
      this.removeUnderline(id);
      return true;
    } else {
      return this.removeNote(id);
    }
  }

  // 清空笔记划线
  clearMarkings = () => {
    this.highlight.clear();
    this.paraAndLinesMap = {};
  }


  // 笔记划线 id 更换
  replaceMarkingId = (id, newId) => {
    let isComplete = false;
    const data = this.highlight.lineMap.get(id);
    if (data) {
      // 划线
      this.highlight.lineMap.set(newId, data);
      this.highlight.lineMap.delete(id);
      isComplete = true;
    } else {
      this.highlight.lineMap.forEach((line) => {
        if (line.meta.type === HighlightType.HIGHLIGHT) {
          let result = line.meta.notes.filter(item => id === item.id)[0];
          if (result) {
            // 笔记
            result.id = newId;
            isComplete = true;
          }
        }
      });
    }
    return isComplete;
  }



  /**
   * ================================
   * ============ 划线API ============
   * ================================
   */
  // 获取划线
  getUnderline = (id) => {
    const result = this.highlight.lineMap.get(id);
    if (result) {
      return {
        id,
        type: MarkingType.UNDERLINE,
        startParaId: result.selection.start.id,
        startOffset: result.selection.start.offset,
        endParaId: result.selection.end.id,
        endOffset: result.selection.end.offset,
        abstract: result.abstract,
      }
    }
    log('underline not found.');
    return null;
  }

  // 添加划线
  addUnderline = (data) => {
    if (!data || data.type !== MarkingType.UNDERLINE) { return null; }
    const range = checkMarkingData(this.container, data);
    if (!range) { return null; }

    const selection = {
      start: {
        id: range.start.id,
        node: range.start.node,
        offset: range.start.offset,
      },
      end: {
        id: range.end.id,
        node: range.end.node,
        offset: range.end.offset,
      }
    }

    let meta = { type: HighlightType.UNDERLINE };
    if (range.start.untouchable) {
      meta.originalStart = range.start.source;
    }
    if (range.end.untouchable) {
      meta.originalEnd = range.end.source;
    }

    return this.highlight.highlightLine(
      selection,
      data.id,
      meta
    );
  }

  // 批量添加划线
  addUnderlines = (dataGroup) => {
    if (!isArray(dataGroup)) {
      log(`method 'addUnderlines' parameter should be an array.`);
      return null;
    }
    const results = dataGroup.map(data => this.addUnderline(data));

    let add = [];
    let merge = [];
    let temp = [];
    let remove = [];
    results.forEach(i => {
      if (!i) { return; }
      add.push(...i.add);
      merge.push(...i.merge);
      remove.push(...i.remove);
    });
    add = add.filter(i => remove.indexOf(i.id) === -1);
    merge = merge.filter(i => {
      if (remove.indexOf(i.id) === -1) {
        return true;
      } else {
        temp.push(i.id);
      }
    });
    remove = remove.filter(i => temp.indexOf(i) === -1);

    return {
      add,
      merge,
      remove,
    }
  }

  // 删除划线
  removeUnderline = (id) => {
    return this.highlight.cancelHighlightLine(id);
  }

  // 批量删除划线
  removeUnderlines = (ids) => {
    if (!isArray(ids)) {
      log(`method 'removeUnderlines' parameter should be an array.`);
      return null;
    }
    return ids.map(id => this.removeUnderline(id));
  }



  /**
   * ================================
   * ============ 笔记API ============
   * ================================
   */
  onNoteSubmit = (callback) => {
    if (typeof callback !== 'function') { return; }
    this.noteSubmitHandler = callback;
  }
  onNoteRemove = (callback) => {
    if (typeof callback !== 'function') { return; }
    this.noteRemoveHandler = callback;
  }
  onNoteListOpen = (callback) => {
    if (typeof callback !== 'function') { return; }
    this.noteListOpenHandler = callback;
  }
  onNoteInputClose = (callback) => {
    if (typeof callback !== 'function') { return; }
    this.noteInputCloseHandler = callback;
  }

  // 打开笔记输入框
  openNoteInput = () => {
    this.noteInput.open();
  }

  // 获取笔记
  getNote = (id) => {
    let note = null;
    this.highlight.lineMap.forEach((line) => {
      if (line.meta.type === HighlightType.HIGHLIGHT) {
        const result = line.meta.notes.filter(item => id === item.id)[0];
        if (result) {
          note = {
            id,
            type: MarkingType.NOTE,
            startParaId: result.selection.start.id,
            startOffset: result.selection.start.offset,
            endParaId: result.selection.end.id,
            endOffset: result.selection.end.offset,
            abstract: result.abstract,
            note: result.meta.note,
          }
        }
      }
    });
    return note;
  }

  // 添加笔记
  addNote = (data) => {
    if (!data || data.type !== MarkingType.NOTE) { return null; }
    const range = checkMarkingData(this.container, data);
    if (!range) { return null; }

    const selection = {
      start: {
        id: range.start.id,
        node: range.start.node,
        offset: range.start.offset,
      },
      end: {
        id: range.end.id,
        node: range.end.node,
        offset: range.end.offset,
      }
    }

    let meta = {
      type: HighlightType.HIGHLIGHT, 
      note: data.note 
    }
    if (range.start.untouchable) {
      meta.originalStart = range.start.source;
    }
    if (range.end.untouchable) {
      meta.originalEnd = range.end.source;
    }

    if (this.noteInput.isOpen) {
      this.noteInput.close();
    }

    return this.highlight.highlightLine(
      selection,
      data.id,
      meta
    );
  }

  // 批量添加笔记
  addNotes = (dataGroup) => {
    if (!isArray(dataGroup)) {
      log(`method 'addNotes' parameter should be an array.`);
      return null;
    }
    return dataGroup.map(data => this.addNote(data));
  }

  // 删除笔记
  removeNote = (id) => {
    return this.noteList.removeNote(id);
  }

  // 批量删除笔记
  removeNotes = (ids) => {
    if (!isArray(ids)) {
      log(`method 'removeNotes' parameter should be an array.`);
      return null;
    }
    return ids.map(id => this.removeNote(id));
  }
}