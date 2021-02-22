import BaseElement from './BaseElement';
import { addClass } from './utilities';
import { HighlightType } from './types';
import clamp from './clamp';


export default class NoteList extends BaseElement {
  constructor(container, marker) {
    super();
    this.container = container;
    this.marker = marker;

    this.list = null;
    this.createListElement();
  }


  createListElement = () => {
    const element = document.createElement('div');
    addClass(element, 'marker-note-list');
    element.style.display = 'none';

    this.container.appendChild(element);
    this.element = this.list = element;
  }


  /**
   * 
   * @param {array} data 
   * {
   *    id: 笔记id
   *    note: 笔记内容
   *    abstract: 摘要
   * }
   */
  openNoteList = (data) => {
    this.list.innerHTML = '';
    this.list.style.display = 'block';
    this.list.style.bottom = '20px';

    data.forEach(item => {
      const element = document.createElement('div');
      addClass(element, 'marker-note-list-item');
      element.setAttribute('data-id', item.id);
      this.list.appendChild(element);

      const note = document.createElement('p');
      note.innerText = item.note || '';
      element.appendChild(note);
      if (data.length > 1) {
        const abstract = document.createElement('div');
        addClass(abstract, 'marker-note-list-abstract');
        abstract.innerText = item.abstract;
        element.appendChild(abstract);
        clamp(abstract);
      }

      const del = document.createElement('button');
      addClass(del, 'marker-note-list-delete');
      del.innerHTML = '删除';
      del.onclick = () => {
        del.setAttribute('disabled', true);
        this.onRemoveNote(item.id);
      };
      element.appendChild(del);
    });

    const listRect = this.list.getBoundingClientRect();
    const listHeight = listRect.bottom - listRect.top;
    const containerRect = this.marker.container.getBoundingClientRect();
    const menuRect = this.marker.menu.element.getBoundingClientRect();
    const menuHeight = menuRect.bottom - menuRect.top;
    if (containerRect.bottom - menuRect.bottom <= listHeight) {
      if (menuRect.top - 10 >= listHeight) {
        this.list.style.bottom = `${containerRect.bottom - menuRect.bottom + menuHeight + 10}px`;
      }
    }
  }


  onRemoveNote = (id) => {
    this.marker.noteRemoveHandler(id);
  }


  removeNote = (id) => {
    let result = null;
    this.marker.highlight.lineMap.forEach((line, rootId) => {
      if (line.meta.type !== HighlightType.HIGHLIGHT) {
        return;
      }
      let notes = line.meta.notes;
      let noteIndex = null;
      const targetNote = notes.filter((item, index) => {
        if (id === item.id) {
          noteIndex = index;
          return true;
        }
        return false;
      })[0];

      if (targetNote) {
        notes.splice(noteIndex, 1);
        result = {
          rootId,
          newNotes: notes,
        }
        const element = this.list.querySelector(`[data-id="${id}"]`);
        if (element) {
          this.list.removeChild(element);
        }
        this.hide();
      }
    });

    if (result) {
      this.marker.highlight.lineMap.delete(result.rootId);
      result.newNotes.reverse().forEach(i => {
        this.marker.highlight.highlightNote(i.selection, i.id, i.meta);
      });
      this.marker.highlight.render();
      this.marker.reset();
      return true;
    }
    return false;
  }


  /**
   * 隐藏笔记列表：
   * - 笔记划线重置状态时；
   * - 打开笔记输入框时；
   * - 长按选中单词时；
   * - 删除最后列表内最后一条笔记时；
   */
  hide = () => {
    this.list.style.display = 'none';
  }
}