import BaseElement from './BaseElement';
import { HighlightType, MarkingType, MenuType } from './types';
import { addClass, removeClass, createMarkingData, getRandomString } from './utilities';


export default class Menu extends BaseElement {
  constructor(container, options = {}, marker) {
    super();
    this.marker = marker;
    this.container = container;
    this.option = {
      items: options.menuItems,
    }
    this.menuElement = null;
    this.triangle = null;
    this.itemMap = new Map();
    this.type = MenuType.SELECT;
    this.selectedMarking = null; // 点击高亮时的暂存信息
    this.parentUnderline = null; // 子集选区时的父划线
    this.createElement();
    this.mount();
    this.hide();
  }


  createElement = () => {
    const wrapper = document.createElement('div');
    const menu = document.createElement('div');
    addClass(menu, 'marker-menu');
    const triangle = document.createElement('div');
    addClass(triangle, 'marker-menu-triangle');
    wrapper.appendChild(menu);
    wrapper.appendChild(triangle);

    this.option.items.forEach((item) => {
      const menuItem = this.createMenuItemElement(item)
      this.itemMap.set(menuItem, item)
      menu.appendChild(menuItem)
    });

    this.triangle = triangle;
    this.menuElement = menu;
    this.element = wrapper;
  }

  createMenuItemElement = ({text, type}) => {
    const menuItem = document.createElement('span');
    addClass(menuItem, 'marker-menu-item');
    if (type !== undefined) {
      addClass(menuItem, `marker-menu-item-${type}`);
    }
    menuItem.innerHTML = text;
    return menuItem;
  }


  get isShow() {
    return this.style.display === 'block';
  }


  show = () => {
    let { rects } = this.marker.getSelectNodeRectAndText(
      this.marker.textNode.start.node,
      this.marker.textNode.end.node,
      this.marker.textNode.start.offset,
      this.marker.textNode.end.offset
    );
    if (rects.length === 0) {
      this.marker.reset();
      return;
    }

    if (!this.selectedMarking) {
      const startRect = rects[0];
      const endRect = rects[rects.length - 1];
      this.marker.highlight.lineMap.forEach((line, id) => {
        if (line.meta.type !== HighlightType.UNDERLINE) { return; }
        const start = line.rects[0];
        const end = line.rects[line.rects.length - 1];
        if (
          (
            (start.top === startRect.top && start.left <= startRect.left)
            || (start.top < startRect.top && end.top >= endRect.top)
          ) && (
            (end.top === endRect.top && end.right >= endRect.right)
            || (end.top > endRect.top && start.top <= startRect.top)
          )
        ) {
          // 子集（当前划线为子集）
          this.parentUnderline = {
            id: id,
            type: line.meta.type,
            originalStart: line.meta.originalStart,
            originalEnd: line.meta.originalEnd,
          };
          ({rects} = this.marker.getSelectNodeRectAndText(
            line.selection.start.node,
            line.selection.end.node,
            line.selection.start.offset,
            line.selection.end.offset,
          ));
        }
      });
    }

    if (this.type === MenuType.HIGHLIGHT || this.parentUnderline) {
      // 删除划线
      removeClass(this.element, 'marker-menu-select');
      addClass(this.element, 'marker-menu-highlight');
    } else if (this.type === MenuType.SELECT) {
      // 划线
      removeClass(this.element, 'marker-menu-highlight');
      addClass(this.element, 'marker-menu-select');
    }

    this.style.display = 'block';

    const arrowSize = 8;
    const menuHeight = Number((window.getComputedStyle(this.menuElement).height || '').replace('px', ''));
    const menuWidth = Number((window.getComputedStyle(this.menuElement).width || '').replace('px', ''));
    const { 
      width: containerWidth,
      height: containerHeight,
    } = this.container.getBoundingClientRect();


    const firstRect = rects[0];
    const lastRect = rects[rects.length - 1];
    let rect = null;
    const minTopHeight = (menuHeight + arrowSize) * 2;
    if (firstRect.top < minTopHeight) {
      if (containerHeight - lastRect.bottom >= minTopHeight) {
        // 菜单放在底部
        rect = {
          top: lastRect.top,
          left: lastRect.left,
          right: lastRect.right,
          bottom: lastRect.bottom,
        }
        this.style.top = `${rect.bottom + menuHeight + arrowSize}px`;
        addClass(this.triangle, 'marker-menu-triangle-above');
      } else {
        // 菜单放在中间
        rect = {
          left: 0,
          right: containerWidth
        }
        this.style.top = `${containerHeight / 2}px`;
        removeClass(this.triangle, 'marker-menu-triangle-above');
      }
    } else {
      // 菜单放在顶部
      rect = {
        top: firstRect.top,
        left: firstRect.left,
        right: firstRect.right,
        bottom: firstRect.bottom,
      }
      this.style.top = `${rect.top - arrowSize}px`;
      removeClass(this.triangle, 'marker-menu-triangle-above');
    }


    rect.center = (rect.left + rect.right) / 2;
    const halfMenuWidth = menuWidth / 2;
    if (rect.center + halfMenuWidth > containerWidth) {
      // 菜单偏右
      this.style.right = `0px`;
      this.style.left = '';
      this.triangle.style.marginLeft = `${
        halfMenuWidth - (containerWidth - rect.center) - arrowSize
      }px`;
    } else if (rect.center - halfMenuWidth < 0) {
      // 菜单偏左
      this.style.left = `0px`;
      this.style.right = '';
      this.triangle.style.marginLeft = `${
        rect.center - halfMenuWidth  - arrowSize
      }px`;
    } else {
      // 菜单居中
      let left = rect.center - (menuWidth / 2);
      this.style.left = `${left}px`;
      this.style.right = '';
      this.triangle.style.marginLeft = `${-arrowSize}px`;
    }

    this.style.opacity = '1';
  }

  hide = () => {
    this.style.opacity = '0';
    this.style.display = 'none';
    this.reset();
  }

  reset = () => {
    this.selectedMarking = null;
    this.parentUnderline = null;
  }


  inRegion = (e) => {
    const tapTarget = this.getTapTarget(e.target)
    if (!this.itemMap.has(tapTarget)) return false
    return true
  }


  handleTap = (e) => {
    const tapTarget = this.getTapTarget(e.target)
    if (!this.itemMap.has(tapTarget)) { return false; }

    const source = {
      start: this.marker.textNode.start,
      end: this.marker.textNode.end,
      abstract: this.marker.getSelectText()
    }

    const item = this.itemMap.get(tapTarget)
    if (item.id && this.marker.menuClickHandler) {
      if (item.id === 'UNDERLINE_CREATE') {
        // 划线
        this.marker.menuClickHandler(
          item.id,
          createMarkingData(
            source,
            this.selectedMarking,
            MarkingType.UNDERLINE,
            getRandomString(),
          )
        );
      }
      else if (item.id === 'UNDERLINE_DELETE') {
        // 删除划线
        const id = this.parentUnderline ? this.parentUnderline.id : this.selectedMarking.id;
        this.marker.menuClickHandler(
          item.id,
          createMarkingData(
            source,
            this.selectedMarking,
            MarkingType.UNDERLINE,
            id,
          )
        );
      }
      else if (item.id === 'NOTE') {
        // 笔记
        const data = createMarkingData(
          source,
          this.selectedMarking
        );
        this.marker.noteInput.selectedRange = data;
        this.marker.menuClickHandler(item.id, data);
        return null;
      }
      else if(item.id === 'COPY') {
        // 复制
        this.marker.menuClickHandler(
          item.id, 
          createMarkingData(
            source,
            this.selectedMarking
          )
        );
      } else {
        // this.marker.menuClickHandler(item.id, createMarkingData(source));
      }
    } else {
      // item.handler.call(this.marker, createMarkingData(source))
    }
    return true
  }


  getTapTarget = (target) => {
    if (this.itemMap.has(target)) {
      return target
    }
    if (target.parentElement) {
      return this.getTapTarget(target.parentElement)
    }
    return null
  }
}
