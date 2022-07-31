import BaseElement from './BaseElement';
import { addClass, rectToPointArray } from './utilities';


export default class Mask extends BaseElement {
  constructor(container, marker) {
    super();
    this.container = container;
    this.option = {
      color: '#0097FF',
      opacity: 1,
    };
    this.rects = [];
    this.animating = false;
    this.marker = marker;
    this.createElement();
    this.mount();
  }


  createElement = () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    addClass(svg, 'marker-mask');
    this.element = svg;
  }


  render = (start, end) => {
    let rects;
    try {
      ({ rects } = this.marker.getSelectNodeRectAndText(start.node, end.node, start.offset, end.offset))
    } catch (error) {
      console.error(error);
      rects = [];
    }
    this.renderRectsLine(rects)
  }


  reset = () => {
    this.removeAllRectangle();
  }


  renderRectsLine = (rects) => {
    this.rects = rects
    const points = rects.map((rect) => {
      // let margin = this.option.margin || (lineHeight - rect.height) / 4;
      let margin = 0;
      // let offset = this.screenRelativeOffset;
      let offset = {x: 0, y: 0}
      return rectToPointArray(rect, offset, margin)
    })
    if (!this.animating) {
      this.animating = true
      window.requestAnimationFrame(() => this.renderRectsLineAnimated(points))
    }
  }


  renderRectsLineAnimated = (points) => {
    this.removeAllRectangle()
    points.forEach((linePoints) => {
      this.element.appendChild(this.createRectangle(linePoints))
    })
    this.animating = false
  }


  createRectangle = (pointList) => {
    const points = pointList.reduce((acc, [x, y]) => (acc === '' ? `${x},${y}` : `${acc} ${x},${y}`), '')
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
    polygon.style.fill = this.option.color
    polygon.style.strokeWidth = 0
    polygon.style.strokeOpacity = this.option.opacity
    polygon.style.opacity = this.option.opacity
    polygon.setAttribute('points', points)
    return polygon
  }


  removeAllRectangle = () => {
    while (this.element.firstChild) {
      this.element.removeChild(this.element.firstChild)
    }
  }
}
