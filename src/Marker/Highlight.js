import BaseElement from './BaseElement';
import { HighlightType, MarkingType, MenuType } from './types';
import {
  log,
  addClass,
  getTouchPosition, 
  inRectangle, 
  rectToPointArray,
  getRandomString,
} from './utilities';
import diff from './diff';


export default class Highlight extends BaseElement {
  constructor(container, marker) {
    super();
    this.marker = marker;
    this.container = container;
    this.option = {
      highlightColor: 'rgba(255, 195, 75, 0.3)',
      underlineColor: '#ff9b93',
      underlineWidth: 1,
      tagBackground: '#af8978',
      tagColor: '#fff',
      opacity: 1,
      type: 'underline',
      margin: 0,
    }
    this.lineMap = new Map();
    this.createElement();
    this.mount();
  }


  get screenRelativeOffset() {
    if (!this.marker) {
      return {
        x: 0,
        y: 0,
      }
    }
    return this.marker.screenRelativeOffset
  }


  /**
   * 
   * @param {object} selection 
   * {
   *    start: { id, node, offset },
   *    end: { id, node, offset },
   * }
   * @param {string=} id 
   * @param {object=} meta 
   */
  highlight = (selection, id, meta = {}) => {
    let highlightId = id;
    let rects;
    let text;
    ({ rects, text } = this.marker.getSelectNodeRectAndText(
      selection.start.node,
      selection.end.node,
      selection.start.offset,
      selection.end.offset
    ));
    if (rects.length === 0) { return; }

    const startRect = rects[0];
    const endRect = rects[rects.length - 1];
    let data = {
      merge: false,
      todo: [],
      untouchableStart: null,
      untouchableEnd: null,
      start: {
        id: selection.start.id,
        node: selection.start.node,
        offset: selection.start.offset
      },
      end: {
        id: selection.end.id,
        node: selection.end.node,
        offset: selection.end.offset
      }
    };


    const check = (line) => {
      if (line.meta.originalStart) {
        const abstract = diff(text, line.meta.originalStart.abstract).map(i => i[1]).join('');
        if (meta.originalStart) {
          const paraNum1 = parseInt(meta.originalStart.id);
          const paraOffset1 = parseInt(meta.originalStart.offset);
          const paraNum2 = parseInt(line.meta.originalStart.id);
          const paraOffset2 = parseInt(line.meta.originalStart.offset);
          if ((paraNum1 + paraOffset1) > (paraNum2 + paraOffset2)) {
            meta.originalStart = Object.assign({}, line.meta.originalStart);
            meta.originalStart.abstract = abstract;
          }
        } else {
          meta.originalStart = Object.assign({}, line.meta.originalStart);
          meta.originalStart.abstract = abstract;
        }
      }
      if (line.meta.originalEnd) {
        const abstract = diff(text, line.meta.originalEnd.abstract).map(i => i[1]).join('');
        if (meta.originalEnd) {
          const paraNum1 = parseInt(meta.originalEnd.id);
          const paraOffset1 = parseInt(meta.originalEnd.offset);
          const paraNum2 = parseInt(line.meta.originalEnd.id);
          const paraOffset2 = parseInt(line.meta.originalEnd.offset);
          if ((paraNum1 + paraOffset1) < (paraNum2 + paraOffset2)) {
            meta.originalEnd = Object.assign({}, line.meta.originalEnd);
            meta.originalEnd.abstract = abstract;
          }
        } else {
          meta.originalEnd = Object.assign({}, line.meta.originalEnd);
          meta.originalEnd.abstract = abstract;
        }
      }
    }

    this.lineMap.forEach((line, id) => {
      if (meta.type !== line.meta.type) { return; }
      const start = line.rects[0];
      const end = line.rects[line.rects.length - 1];
      if (
        (
          (endRect.top === end.top && endRect.right > end.right)
          || (endRect.top > end.top)
        ) && (
          (startRect.top === start.top && startRect.left > start.left && startRect.left <= start.right)
          || (startRect.top > start.top && (
            (startRect.top === end.top && startRect.left <= end.right)
            || (startRect.top < end.top)
          ))
        )
      ) {
        // 开头交集
        data.merge = true;
        data.todo.push(id);
        check(line);
        data.start.id = line.selection.start.id;
        data.start.node = line.selection.start.node;
        data.start.offset = line.selection.start.offset;
      } else if (
        (
          (startRect.top === start.top && startRect.left < start.left)
          || (startRect.top < start.top)
        ) && (
          (endRect.top === end.top && endRect.right < end.right && endRect.right >= end.left)
          || (endRect.top < end.top && (
            (endRect.top === start.top && endRect.right >= start.left)
            || (endRect.top > start.top)
          ))
        )
      ) {
        // 结尾交集
        data.merge = true;
        data.todo.push(id);
        check(line);
        data.end.id = line.selection.end.id;
        data.end.node = line.selection.end.node;
        data.end.offset = line.selection.end.offset;
      } else if (
        (
          (start.top === startRect.top && start.left >= startRect.left)
          || (start.top > startRect.top && start.top <= endRect.top)
        ) && (
          (end.top === endRect.top && end.right <= endRect.right)
          || (end.top < endRect.top && end.top >= start.top)
        )
      ) {
        // 子集（是当前划线的子集）
        data.merge = true;
        data.todo.push(id);
        check(line);
      } else if (
        (
          (start.top === startRect.top && start.left <= startRect.left)
          || (start.top < startRect.top && end.top >= endRect.top)
        ) && (
          (end.top === endRect.top && end.right >= endRect.right)
          || (end.top > endRect.top && start.top <= startRect.top)
        )
      ) {
        // 子集（当前划线为子集）
        data.merge = true;
        data.todo.push(id);
        check(line);
        data.start.id = line.selection.start.id;
        data.start.node = line.selection.start.node;
        data.start.offset = line.selection.start.offset;
        data.end.id = line.selection.end.id;
        data.end.node = line.selection.end.node;
        data.end.offset = line.selection.end.offset;
      }
    });

    if (data.merge) {
      ({ rects, text } = this.marker.getSelectNodeRectAndText(
        data.start.node,
        data.end.node,
        data.start.offset,
        data.end.offset
      ));

      data.todo.forEach(i => {
        this.lineMap.delete(i)
      });
      data.todo.push(highlightId);
      highlightId = getRandomString();
    }


    let points;
    const offset = {x: 0, y: 0}
    points = rects.map((rect) => {
      const margin = 0;
      return rectToPointArray(rect, offset, margin)
    });

    this.lineMap.set(highlightId, {
      selection: {
        start: data.start,
        end: data.end
      },
      meta,
      points,
      rects,
      abstract: text,
    });

    let result = {
      sourceId: id,
      add: [],
      merge: [],
      remove: data.todo,
    }

    const underline = {
      id: highlightId,
      type: MarkingType.UNDERLINE,
      startParaId: data.start.id,
      startOffset: data.start.offset,
      endParaId: data.end.id,
      endOffset: data.end.offset,
      abstract: text
    }
    if (data.merge) {
      result.merge.push(underline);
    } else {
      result.add.push(underline);
    }

    return result;
  }


  /**
   * 
   * @param {object} selection 
   * {
   *    start: { id, node, offset }
   *    end: { id, node, offset }
   * }
   * @param {string} id
   * @param {object} meta
   */
  highlightNote = (selection, id, meta) => {
    let notes = [];
    let note = {};
    let rects;
    let text;
    ({ rects, text } = this.marker.getSelectNodeRectAndText(
      selection.start.node,
      selection.end.node,
      selection.start.offset,
      selection.end.offset
    ));
    if (rects.length === 0) { return null; }

    let highlightId = getRandomString();
    let noteGroupMeta = {
      originalStart: meta.originalStart && Object.assign({}, meta.originalStart),
      originalEnd: meta.originalEnd && Object.assign({}, meta.originalEnd),
    }
    note.id = id;
    note.selection = selection;
    note.rects = rects;
    note.abstract = text;
    note.points = rects.map((rect) => {
      return rectToPointArray(rect, {x: 0, y: 0}, 0)
    });
    note.meta = meta;
    notes.push(note);

    const startRect = rects[0];
    const endRect = rects[rects.length - 1];
    let data = {
      merge: false,
      todo: [],
      untouchableStart: null,
      untouchableEnd: null,
      start: {
        id: selection.start.id,
        node: selection.start.node,
        offset: selection.start.offset
      },
      end: {
        id: selection.end.id,
        node: selection.end.node,
        offset: selection.end.offset
      }
    };
    const check = (line) => {
      if (line.meta.originalStart) {
        const abstract = diff(text, line.meta.originalStart.abstract).map(i => i[1]).join('');
        if (meta.originalStart) {
          const paraNum1 = parseInt(meta.originalStart.id);
          const paraOffset1 = parseInt(meta.originalStart.offset);
          const paraNum2 = parseInt(line.meta.originalStart.id);
          const paraOffset2 = parseInt(line.meta.originalStart.offset);
          if ((paraNum1 + paraOffset1) > (paraNum2 + paraOffset2)) {
            noteGroupMeta.originalStart = Object.assign({}, line.meta.originalStart);
            noteGroupMeta.originalStart.abstract = abstract;
          }
        } else {
          noteGroupMeta.originalStart = Object.assign({}, line.meta.originalStart);
          noteGroupMeta.originalStart.abstract = abstract;
        }
      }
      if (line.meta.originalEnd) {
        const abstract = diff(text, line.meta.originalEnd.abstract).map(i => i[1]).join('');
        if (meta.originalEnd) {
          const paraNum1 = parseInt(meta.originalEnd.id);
          const paraOffset1 = parseInt(meta.originalEnd.offset);
          const paraNum2 = parseInt(line.meta.originalEnd.id);
          const paraOffset2 = parseInt(line.meta.originalEnd.offset);
          if ((paraNum1 + paraOffset1) < (paraNum2 + paraOffset2)) {
            noteGroupMeta.originalEnd = Object.assign({}, line.meta.originalEnd);
            noteGroupMeta.originalEnd.abstract = abstract;
          }
        } else {
          noteGroupMeta.originalEnd = Object.assign({}, line.meta.originalEnd);
          noteGroupMeta.originalEnd.abstract = abstract;
        }
      }
    }
    this.lineMap.forEach((line, id) => {
      if (line.meta.type !== HighlightType.HIGHLIGHT) { return; }
      const start = line.rects[0];
      const end = line.rects[line.rects.length - 1];
      if (
        (
          (endRect.top === end.top && endRect.right > end.right)
          || (endRect.top > end.top)
        ) && (
          (startRect.top === start.top && startRect.left > start.left && startRect.left <= start.right)
          || (startRect.top > start.top && (
            (startRect.top === end.top && startRect.left <= end.right)
            || (startRect.top < end.top)
          ))
        )
      ) {
        // 开头交集
        data.merge = true;
        data.todo.push(id);
        check(line);
        data.start.id = line.selection.start.id;
        data.start.node = line.selection.start.node;
        data.start.offset = line.selection.start.offset;
      } else if (
        (
          (startRect.top === start.top && startRect.left < start.left)
          || (startRect.top < start.top)
        ) && (
          (endRect.top === end.top && endRect.right < end.right && endRect.right >= end.left)
          || (endRect.top < end.top && (
            (endRect.top === start.top && endRect.right >= start.left)
            || (endRect.top > start.top)
          ))
        )
      ) {
        // 结尾交集
        data.merge = true;
        data.todo.push(id);
        check(line);
        data.end.id = line.selection.end.id;
        data.end.node = line.selection.end.node;
        data.end.offset = line.selection.end.offset;
      } else if (
        (
          (start.top === startRect.top && start.left >= startRect.left)
          || (start.top > startRect.top && start.top <= endRect.top)
        ) && (
          (end.top === endRect.top && end.right <= endRect.right)
          || (end.top < endRect.top && end.top >= start.top)
        )
      ) {
        // 子集（是当前笔记的子集）
        data.merge = true;
        data.todo.push(id);
        check(line);
      } else if (
        (
          (start.top === startRect.top && start.left <= startRect.left)
          || (start.top < startRect.top && end.top >= endRect.top)
        ) && (
          (end.top === endRect.top && end.right >= endRect.right)
          || (end.top > endRect.top && start.top <= startRect.top)
        )
      ) {
        // 子集（当前笔记为子集）
        data.merge = true;
        data.todo.push(id);
        check(line);
        data.start.id = line.selection.start.id;
        data.start.node = line.selection.start.node;
        data.start.offset = line.selection.start.offset;
        data.end.id = line.selection.end.id;
        data.end.node = line.selection.end.node;
        data.end.offset = line.selection.end.offset;
      }
    });

    if (data.merge) {
      ({ rects, text } = this.marker.getSelectNodeRectAndText(
        data.start.node,
        data.end.node,
        data.start.offset,
        data.end.offset
      ));

      data.todo.forEach(id => {
        notes.push(...this.lineMap.get(id).meta.notes);
        this.lineMap.delete(id);
      })
    }

    const points = rects.map((rect) => {
      return rectToPointArray(rect, {x: 0, y: 0}, 0)
    });

    this.lineMap.set(highlightId, {
      selection: {
        start: data.start,
        end: data.end
      },
      meta: Object.assign({}, {
        type: HighlightType.HIGHLIGHT,
        notes: notes,
      }, noteGroupMeta),
      points,
      rects,
      abstract: text,
    });

    return note.id;
  }


  render = () => {
    this.removeAllRectangle()
    this.lineMap.forEach((line) => {
      const type = line.meta.type;
      line.points.forEach((points, index) => {
        if (type === HighlightType.UNDERLINE) {
          this.element.appendChild(this.createLine(points))
        } else {
          this.element.appendChild(this.createRectangle(points))
        }
        if (line.points.length - 1 === index && line.meta && line.meta.tag) {
          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
          text.setAttribute('x', points[2][0] - 5)
          text.setAttribute('y', points[2][1] + 4)
          text.setAttribute('dominant-baseline', 'hanging')
          text.setAttribute('text-anchor', 'end')
          text.setAttribute('font-size', '10')
          text.setAttribute('fill', this.option.tagColor)
          text.textContent = line.meta.tag
          addClass(text, 'em-highlight-tag-text');
          this.element.appendChild(text)
          // setTimeout(() => {
          // 异步获取位置在某些情况无法正常渲染
          // 同步执行在某些时候无法取到getBox
          // const textRect = text.getBBox()
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
          // rect.setAttribute('x', textRect.x - 5)
          // rect.setAttribute('y', textRect.y - 1)
          rect.setAttribute('x', points[2][0] - 25 - 5)
          rect.setAttribute('y', points[2][1] - 0)
          rect.setAttribute('rx', 2)
          rect.setAttribute('ry', 2)
          rect.setAttribute('width', 20 + 10)
          rect.setAttribute('height', 14 + 2)
          rect.setAttribute('fill', this.option.tagBackground)
          this.element.insertBefore(rect, text)
          // }, 10)
        }
      })
    })
  }


  highlightLine = (selection, id, meta) => {
    let result = null;
    if (meta.type === HighlightType.UNDERLINE) {
      // 划线
      result = this.highlight(selection, id, meta);
    } else {
      // 笔记
      result = this.highlightNote(selection, id, meta);
    }
    this.render();
    return result
  }


  cancelHighlightLine = (id) => {
    const result = this.lineMap.delete(id);
    if (result) {
      this.render();
    } else {
      log('delete failed, id not found.');
    }
    return result;
  }


  createElement = () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    addClass(svg, 'marker-highlight');
    this.element = svg;
  }

  createLine = (pointList) => {
    const x1 = pointList[2][0]
    const y1 = pointList[2][1] + 1
    const x2 = pointList[3][0]
    const y2 = pointList[3][1] + 1
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.style.stroke = this.option.underlineColor
    line.style.strokeWidth = this.option.underlineWidth
    line.setAttribute('x1', x1)
    line.setAttribute('y1', y1)
    line.setAttribute('x2', x2)
    line.setAttribute('y2', y2)
    return line
  }

  createRectangle = (pointList) => {
    const points = pointList.reduce((acc, [x, y]) => (acc === '' ? `${x},${y}` : `${acc} ${x},${y}`), '')
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
    polygon.style.fill = this.option.highlightColor
    polygon.style.strokeWidth = 0
    polygon.style.strokeOpacity = this.option.opacity
    polygon.style.opacity = this.option.opacity
    polygon.setAttribute('points', points)
    return polygon
  }


  handleTap = (e) => {
    const { x, y } = getTouchPosition(e);
    const { x: left, y: top } = this.screenRelativeOffset;
    let noteIds = [];
    let underlineIds = [];
    this.lineMap.forEach((line, id) => {
      for (let i = 0; i < line.rects.length; i++) {
        const rect = line.rects[i]
        const margin = 0;
        if (inRectangle(x - left, y - top, rect, margin)) {
          if (line.meta.type === HighlightType.UNDERLINE) {
            underlineIds.push(id);
          } else if (line.meta.type === HighlightType.HIGHLIGHT) {
            noteIds.push(id);
          }
          break;
        }
      }
    });

    if (noteIds.length === 0 && underlineIds.length === 0) {
      return false;
    }

    // 处理笔记
    const handleNote = (id, noteData, bothUnderline) => {
      this.marker.textNode.start = noteData.selection.start;
      this.marker.textNode.end = noteData.selection.end;
      this.marker.mask.renderRectsLine(noteData.rects);

      if (!bothUnderline) {
        this.marker.markingSelectHandler([{
          ids: noteData.meta.notes.map(i => i.id),
          type: MarkingType.NOTE
        }]);

        this.marker.menu.selectedMarking = {
          id: id,
          type: MarkingType.NOTE,
          originalStart: noteData.meta.originalStart,
          originalEnd: noteData.meta.originalEnd,
        }

        this.marker.showHighlightMenu(
          noteData.selection,
          MenuType.SELECT
        );
      }
    }

    // 处理划线
    const handleUnderline = (id, underlineData, bothNote) => {
      if (!bothNote) {
        this.marker.markingSelectHandler([{
          ids: [id],
          type: MarkingType.UNDERLINE,
        }]);
      }

      this.marker.menu.selectedMarking = {
        id: id,
        type: MarkingType.UNDERLINE,
        originalStart: underlineData.meta.originalStart,
        originalEnd: underlineData.meta.originalEnd,
      }

      this.marker.showHighlightMenu(
        underlineData.selection,
        MenuType.HIGHLIGHT
      );
    }

    const noteId = noteIds[0];
    const note = this.lineMap.get(noteId);
    const underlineId = underlineIds[0];
    const underline = this.lineMap.get(underlineId);
    if (noteIds.length > 0 && underlineIds.length > 0) {
      if (
        note.selection.start.id === underline.selection.start.id
        && note.selection.start.offset === underline.selection.start.offset
        && note.selection.end.id === underline.selection.end.id
        && note.selection.end.offset === underline.selection.end.offset
      ) {
        // 划线 + 笔记
        handleUnderline(underlineId, underline, true);
        handleNote(noteId, note, true);
        this.marker.markingSelectHandler([
          { ids: [underlineId], type: MarkingType.UNDERLINE },
          { ids: note.meta.notes.map(i => i.id), type: MarkingType.NOTE }
        ]);
      } else {
        handleNote(noteId, note);
      }
    } else if (noteIds.length > 0) {
      handleNote(noteId, note);
    } else if (underlineIds.length > 0) {
      handleUnderline(underlineId, underline);
    }
    return true;
  }


  inRegion = (e) => {
    const { x, y } = getTouchPosition(e)
    const { top, left } = this.container.getBoundingClientRect()
    let clickLine
    this.lineMap.forEach((line, id) => {
      for (let i = 0; i < line.rects.length; i++) {
        const rect = line.rects[i]
        // const margin = line.lineHeight ? (line.lineHeight - rect.height) / 2 : 0
        const margin = 0;
        if (inRectangle(x - left, y - top, rect, margin)) {
          clickLine = { id, line }
          break
        }
      }
    })
    if (clickLine && this.marker) {
      return true
    }
    return false
  }

  removeAllRectangle = () => {
    while (this.element.firstChild) {
      this.element.removeChild(this.element.firstChild)
    }
  }

  clear = () => {
    this.lineMap.clear();
    this.removeAllRectangle();
  }


  removeNote = (id) => {
    let result = null;
    this.lineMap.forEach((line, rootId) => {
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
      }
    });

    if (result) {
      this.lineMap.delete(result.rootId);
      result.newNotes.reverse().forEach(i => {
        this.highlightNote(i.selection, i.id, i.meta);
      });
      this.render();
      this.marker.reset();
      return true;
    }
    return false;
  }
}

