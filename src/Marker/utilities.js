import { WORD_SPLIT_REG_EXP } from './configs';
import { DeviceType } from './types';


export function log(message) {
  console.log('[Marker]: ' + message);
}
export function error(message) {
  console.error('[Marker]: ' + message);
}



export function isElement(o) {
  return (
    typeof HTMLElement === "object" ? (
      o instanceof HTMLElement
    ) : (
      typeof o === "object"
      && o !== null
      && o.nodeType === 1
      && typeof o.nodeName === "string"
    )
  );
}


export function hasClass(element, selector) {
  var className = " " + selector + " ";
  if ((" " + element.className + " ").replace(/[\n\t]/g, " ").indexOf(className) > -1) {
    return true;
  }
  return false;
}

export function containClass(element, className) {
  if (element.className.indexOf(className) > -1) {
    return true;
  }
  return false;
}

export function containSomeClass(element, selectors = []) {
  return selectors.some(selector => containClass(element, selector));
}

export function containEveryClass(element, selectors = []) {
  return selectors.every(selector => containClass(element, selector));
}

export function addClass(el, className) {
  if (el.classList) {
    el.classList.add(className);
  } else if (!hasClass(el, className)) {
    var currentClass = el.getAttribute('class') || '';
    var targetClass = currentClass.concat(' ' + className);
    el.setAttribute('class', targetClass);
  }
}

export function removeClass(el, className) {
  if (el.classList) {
    el.classList.remove(className);
  } else if (hasClass(el, className)) {
    var reg = new RegExp('(\\s|^)' + className + '(\\s|$)');
    var currentClass = el.getAttribute('class') || '';
    var targetClass = currentClass.replace(reg, ' ');
    el.setAttribute('class', targetClass);
  }
}


export function isNumber(arg) {
  return Object.prototype.toString.call(arg) === '[object Number]';
}
export function isArray(arg) {
  return Object.prototype.toString.call(arg) === '[object Array]';
}
export function isString(arg) {
  return Object.prototype.toString.call(arg) === '[object String]';
}


export function checkParaElement(element) {
  if (
    element.className.indexOf('paragraph') > -1
    || element.className.indexOf('headline') > -1
  ) {
    const id = element.getAttribute('data-id');
    return id || false;
  }
  return false;
}


export function getNextParaElement(ele) {
  const next = ele.nextElementSibling;
  if (next) {
    if (
      (next.className.indexOf('paragraph') > -1
      || next.className.indexOf('headline') > -1)
      && next.getAttribute('data-id')
    ) {
      return next;
    } else {
      return getNextParaElement(next);
    }
  }
  return null;
}

export function getPrevParaElement(ele) {
  const prev = ele.previousElementSibling;
  if (prev) {
    if (
      (prev.className.indexOf('paragraph') > -1
        || prev.className.indexOf('headline') > -1)
      && prev.getAttribute('data-id')
    ) {
      return prev;
    } else {
      return getPrevParaElement(prev);
    }
  }
  return null;
}


export function trimLine(line) {
  return line.slice().filter(i => i.width !== 0);
}


// 查找行
export function searchLineFromPara(paraIndex, y, boundary) {
  let lineIndex = null;
  let range = [];
  paraIndex.top.forEach((rectTop, index) => {
    range.push(rectTop, paraIndex.bottom[index]);
  });
  range.push(y);
  range.sort((a, b) => a - b);

  const pos = range.indexOf(y) + 1;
  if (pos % 2 === 0) {
    // 行内
    lineIndex = (pos / 2) - 1;
  } else {
    // 行间隙处向下选行
    lineIndex = ((pos - 1) / 2);
    if (lineIndex > paraIndex.top.length - 1) {
      lineIndex--;
    }
    if (paraIndex.top[lineIndex] > boundary) {
      return null;
    }
  }

  return lineIndex;
}


// 查找单词
export function searchWordFromLine(lineRects, x) {
  let wordIndex = null;
  const rects = trimLine(lineRects);
  rects.forEach((wordRect, index) => {
    if (x >= wordRect.left && x <= wordRect.right) {
      wordIndex = index;
    }
  });
  return wordIndex;
}



export function getWordFromPara(para, wordOffset) {
  const wordIndex = para.offsetsMap[wordOffset];
  let word = null;
  for (let i = 0, counter = 0; i < para.lines.length; i++) {
    const indexesOfLine = para.lines[i].length - 1;
    if (wordIndex <= counter + indexesOfLine) {
      word = para.lines[i][wordIndex - counter];
      break;
    } else {
      counter += indexesOfLine;
    }
  }
  return word;
}



export function getWordSibling(line, wordIndex) {
  let sibling = { prev: null, next: null }

  const trimedLine = trimLine(line);
  if (trimedLine.length > 1) {
    if (wordIndex === 0) {
      sibling.next = trimedLine[wordIndex + 1];
    } else if (wordIndex === trimedLine.length - 1) {
      sibling.prev = trimedLine[wordIndex - 1];
    } else {
      sibling.prev = trimedLine[wordIndex - 1];
      sibling.next = trimedLine[wordIndex + 1];
    }
  }

  return sibling;
}



export function getParaRects(paraEle, paraId, offset) {
  const paraOffsetTop = paraEle.offsetTop;
  const paraOffsetLeft = paraEle.offsetLeft;
  const paraOffsetWidth = paraEle.offsetWidth;
  const paraOffsetHeight = paraEle.offsetHeight;
  const paraRect = paraEle.getBoundingClientRect();
  const lineHeight = Number(window.getComputedStyle(paraEle).lineHeight.replace('px', ''));

  var item = {
    id: paraId,
    width: paraOffsetWidth,
    height: paraOffsetHeight,
    offsetTop: paraOffsetTop,
    offsetLeft: paraOffsetLeft,
    rect: {
      width: paraRect.width,
      height: paraRect.height,
      left: paraRect.left,
      right: paraRect.right,
    },
    lineHeight: lineHeight,
    offsetsMap: {}, // 单词 offset 与 index 对应关系
    lines: [],
    index: {
      top: [],
      bottom: [],
      offset: [],
      lineBreak: {}
    },
  };

  var rect, counter = -1, paraOffset = 0, indexOffset = 0;

  function updateLineInfo(targetRect, lineStartOffset, isLineBreak) {
    rect = targetRect;
    ++counter;
    item.lines[counter] = [];
    item.index.top[counter] = rect.top;
    item.index.bottom[counter] = rect.bottom;
    item.index.offset[counter] = lineStartOffset;
    if (isLineBreak) {
      item.index.lineBreak[counter] = true;
    }
  }

  const childNodes = paraEle.childNodes;
  for (let i = 0, len = childNodes.length; i < len; i++) {
    const node =  paraEle.childNodes[i];
    if (node.nodeName === '#text') {
      const words = node.textContent.match(WORD_SPLIT_REG_EXP);
      const range = document.createRange();
      let textIndex = 0;
      for (let j = 0; j < words.length; j++) {
        const wordLength = words[j].length;
        range.setStart(node, textIndex);
        range.setEnd(node, textIndex + wordLength);
        const textRects = range.getClientRects();
        // 段尾的注释符会导致分割出多余的空白 text 节点，手动忽略无 rect 的节点
        if (textRects.length === 0) { continue; }

        const offsetTop = textRects[0].top - offset.y;
        const offsetLeft = textRects[0].left - offset.x;
        const offsetBottom = textRects[0].bottom - offset.y;
        const offsetRight = textRects[0].right - offset.x;
        // 部分换行处的空白符，有 0.0x 的宽度，原因未知，手动以 0.1 为基准进行忽略
        const offsetWidth = textRects[0].width < 0.1 ? 0 : textRects[0].width;
        const offsetHeight = textRects[0].height;

        if (textRects.length > 1 && offsetWidth > 0) {
          // 单词断行，其中空白符导致的断行(width 为 0 时)应该被忽略
          for (let index = 0; index < textRects.length; index++) {
            const lineRect = textRects[index];
            const partItem = {
              indexOfLine: item.lines[counter].length,
              lineIndex: counter,
              top: lineRect.top - offset.y,
              left: lineRect.left - offset.x,
              bottom: lineRect.bottom - offset.y,
              right: lineRect.right - offset.x,
              width: lineRect.width,
              height: lineRect.height,
              offset: paraOffset,
              length: wordLength,
              text: words[j],
              lineBreak: true
            };
            if (!rect || rect.bottom < partItem.top) {
              updateLineInfo({
                top: partItem.top,
                bottom: partItem.top + partItem.height
              }, paraOffset, j > 0);
            }
            item.lines[counter].push(partItem);
            item.offsetsMap[paraOffset] = i;
          }
          continue;
        }
        if (!rect || rect.bottom < offsetTop) {
          // 新的一行
          updateLineInfo({ top: offsetTop, bottom: offsetBottom }, paraOffset);
        }
        if (rect.top > offsetTop) {
          rect.top = offsetTop;
        } else if (rect.bottom < offsetBottom) {
          rect.bottom = offsetBottom;
        }
        var currentLine = item.lines[counter];
        currentLine.push({
          indexOfLine: item.lines[counter].length,
          lineIndex: counter,
          top: offsetTop,
          left: offsetLeft,
          bottom: offsetBottom,
          right: offsetRight,
          width: offsetWidth,
          height: offsetHeight,
          offset: paraOffset,
          length: wordLength,
          text: words[j],
        });
        item.offsetsMap[paraOffset] = indexOffset;
        indexOffset++;

        textIndex += wordLength;
        paraOffset += wordLength;
      }
    } 
    else if (node.nodeName.toLowerCase() === 'span') {
      // 注释、图标、上标等非文本节点
      const graphRects = node.getClientRects();
      const offsetTop = graphRects[0].top - offset.y;
      const offsetLeft = graphRects[0].left - offset.x;
      const offsetBottom = graphRects[0].bottom - offset.y;
      const offsetRight = graphRects[0].right - offset.x;
      const offsetWidth = graphRects[0].width;
      const offsetHeight = graphRects[0].height;
      if (!rect || rect.bottom < offsetTop) {
        updateLineInfo({ top: offsetTop, bottom: offsetBottom }, paraOffset);
      }
      if (rect.top > offsetTop) {
        rect.top = offsetTop;
      } else if (rect.bottom < offsetBottom) {
        rect.bottom = offsetBottom;
      }
      var currentLine = item.lines[counter];
      currentLine.push({
        indexOfLine: item.lines[counter].length,
        lineIndex: counter,
        top: offsetTop,
        left: offsetLeft,
        bottom: offsetBottom,
        right: offsetRight,
        width: offsetWidth,
        height: offsetHeight,
        offset: paraOffset,
        length: 1,
        text: '',
      });
      item.offsetsMap[paraOffset] = indexOffset;
      indexOffset++;
      paraOffset += 1;
    }
  }

  return item;
}


/**
 * Returns the distance between two points
 */
export function getDistance(start, end) {
  return Math.sqrt((start.x - end.x) ** 2 + (start.y - end.y) ** 2);
}


/**
 * get Device Type (mobile || PC)
 */
export function getDeviceType() {
  var agentStr = navigator.userAgent || navigator.vendor;
  if (
    /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(agentStr)
    || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(agentStr.substr(0, 4))
    || navigator.maxTouchPoints > 1
  ) {
    return DeviceType.MOBILE;
  }
  return DeviceType.PC;
}


/**
 * get eventTouch Support mobile and PC
 */
export function getTouch(e) {
  if (getDeviceType() === DeviceType.MOBILE) {
    return e.changedTouches[0]
  }
  return {
    clientX: e.clientX,
    clientY: e.clientY,
  }
}


/**
 * Get the relative position of the touch
 */
export function getTouchPosition(e, offset = { x: 0, y: 0 }) {
  const touch = getTouch(e)
  return {
    x: touch.clientX + offset.x,
    y: touch.clientY + offset.y,
  }
}


/**
 *
 *
 * @export
 * @param {any} pixelUnit
 * @returns
 */
 export function anyToPx(pixelUnit) {
  if (typeof pixelUnit === 'number') return pixelUnit
  if (typeof pixelUnit === 'string') {
    if (pixelUnit.indexOf('px') > -1) return Number(pixelUnit.replace('px', ''))
    if (pixelUnit.indexOf('rem') > -1) {
      const baseFontSize = Number((document.documentElement.style.fontSize || '24px').replace('px', ''))
      return Number(pixelUnit.replace('rem', '')) * baseFontSize
    }
    return Number(pixelUnit)
  }
  return 0
}


/**
 * rect => Point[]
 *
 * @static
 * @param {ClientRect} rect
 * @param {Object} offset
 * @param {number} offset.x
 * @param {number} offset.y
 * @memberof Highlight
 */
export function rectToPointArray(rect, offset, margin) {
  const points = []
  if (rect.width === 0) return points

  points.push([rect.left - margin, rect.top - margin])
  points.push([rect.right + margin, rect.top - margin])
  points.push([rect.right + margin, rect.bottom + margin])
  points.push([rect.left - margin, rect.bottom + margin])

  points.forEach((point) => {
    point[0] -= offset.x
    point[1] -= offset.y
  })
  return points
}


export function inRectangle(x, y, rect, margin) {
  return rect.top - margin <= y && rect.bottom + margin >= y && rect.left <= x && rect.right >= x
}



function checkSideOfMarkingData(container, paraId, offset, prefix) {
  const paraElement = container.querySelector(
    `[data-id="${paraId}"]`
  );
  if (!paraElement) {
    // log(`${prefix} paragraph element not found.`);
    return null;
  }
  return paraElement;
}


export function createMarkingData(current, selectedMarking, type, id) {
  let data = {};
  if (type) {
    data.type = type;
  }
  if (id) {
    data.id = id;
  }
  if (selectedMarking) {
    const origStart = selectedMarking.originalStart;
    const origEnd = selectedMarking.originalEnd;
    if (origStart) {
      data.startParaId = origStart.id;
      data.startOffset = origStart.offset;
    } else {
      data.startParaId = current.start.id;
      data.startOffset = current.start.offset;
    }
    if (origEnd) {
      data.endParaId = origEnd.id;
      data.endOffset = origEnd.offset;
    } else {
      data.endParaId = current.end.id;
      data.endOffset = current.end.offset;
    }

    if (origStart) {
      data.abstract = origStart.abstract;
    } else if (origEnd) {
      data.abstract = origEnd.abstract;
    } else {
      data.abstract = current.abstract;
    }
  } else {
    data.startParaId = current.start.id;
    data.startOffset = current.start.offset;
    data.endParaId = current.end.id;
    data.endOffset = current.end.offset;
    data.abstract = current.abstract;
  }
  return data;
}



export function checkMarkingData(container, data) {
  const startParaNum = parseInt(data.startParaId, 10);
  const startOffset = parseInt(data.startOffset, 10);
  const endParaNum = parseInt(data.endParaId, 10);
  const endOffset = parseInt(data.endOffset, 10);
  if (
    isString(data.id)
    && data.id.trim()
    && data.startParaId
    && startOffset >= 0
    && data.endParaId
    && endOffset >= 0
  ) {
    const startParaElement = checkSideOfMarkingData(
      container,
      data.startParaId,
      data.startOffset,
      'start'
    );
    const endParaElement = checkSideOfMarkingData(
      container,
      data.endParaId,
      data.endOffset,
      'end'
    );

    let range = { start: null, end: null }

    if (startParaElement) {
      range.start = {
        id: data.startParaId,
        node: startParaElement,
        offset: startOffset,
      }
    } else {
      const pageElement = container.querySelector('.layout-page-content');
      if (!pageElement) {
        log('layout page content not found.');
        return null;
      }

      const firstParaElement = pageElement.firstElementChild;
      const firstParaId = firstParaElement.getAttribute('data-id');
      if (startParaNum > parseInt(firstParaId)) {
        log('invalid start para in marking data.');
        return null;
      }
      range.start = {
        untouchable: true,
        source: {
          id: data.startParaId,
          offset: data.startOffset,
          abstract: data.abstract,
        },
        id: firstParaId,
        node: firstParaElement,
        offset: 0
      }
    }

    if (endParaElement) {
      range.end = {
        id: data.endParaId,
        node: endParaElement,
        offset: endOffset
      }
    } else {
      const pageElement = container.querySelector('.layout-page-content');
      if (!pageElement) {
        log('layout page content not found.');
        return null;
      }
      const lastParaElement = pageElement.lastElementChild;
      const lastParaId = lastParaElement.getAttribute('data-id');
      if (endParaNum < parseInt(lastParaId)) {
        log('invalid end para in marking data.');
        return null;
      }
      const textContent = lastParaElement.textContent;
      const words = textContent.match(WORD_SPLIT_REG_EXP);
      const lastOffset = (textContent.length - 1) - words[words.length - 1];
      range.end = {
        untouchable: true,
        source: {
          id: data.endParaId,
          offset: data.endOffset,
          abstract: data.abstract,
        },
        id: lastParaId,
        node: lastParaElement,
        offset: lastOffset
      }
    }

    return range;
  }
  log('invalid marking data.');
  return null;
}



export function getRandomString(length = 15) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}


export function isIE9() {
  var b = document.createElement('b');
  b.innerHTML = '<!--[if IE 9]><i></i><![endif]-->';
  return (b.getElementsByTagName('i').length === 1);
}