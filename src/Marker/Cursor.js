import BaseElement from './BaseElement';
import { addClass, getDistance, getDeviceType } from './utilities';
import { DeviceType } from './types';

export const CursorType = {
  START: 'start',
  END: 'end',
}

const defaultOptions = {
  color: '#0097FF',
}


export default class Cursor extends BaseElement {
  constructor(container, type, options) {
    super()
    this.container = container
    this.type = type
    this.options = Object.assign({}, defaultOptions, options)
    this.$position = { x: 0, y: 0 }
    this.$height = 0
    this.touchCallbackStack = []
    this.topPoint = null
    this.lineElement = null
    this.bottomPoint = null
    this.deviceType = getDeviceType()
    this.createElement()
    this.mount()
  }

  set position(val) {
    const { x, y } = val
    this.$position = { x, y }

    this.moveTo(x, y)
  }

  get position() {
    return this.$position
  }

  get height() {
    return this.$height
  }

  set height(val) {
    if (val !== this.$height) {
      this.$height = val
      this.setCursorSize(val)
    }
  }

  get width() {
    return this.height / 4
  }

  show = () => {
    if (this.deviceType === DeviceType.PC) {
      return
    }
    this.style.display = 'block'
  }

  moveTo = (x, y) => {
    this.style.top = `${y - this.width}px`
    this.style.left = `${x - (this.width / 2)}px`
  }

  createElement = () => {
    this.element = document.createElement('div')
    addClass(this.element, 'marker-cursor');

    this.topPoint = document.createElement('div')
    this.topPoint.style.borderRadius = '50%'
    this.topPoint.style.margin = 'auto'

    this.lineElement = document.createElement('div')
    this.lineElement.style.margin = 'auto'
    this.lineElement.style.backgroundColor = this.options.color

    this.bottomPoint = document.createElement('div')
    this.bottomPoint.style.borderRadius = '50%'
    this.bottomPoint.style.margin = 'auto'

    if (this.type === CursorType.START) {
      this.topPoint.style.backgroundColor = this.options.color
    } else {
      this.bottomPoint.style.backgroundColor = this.options.color
    }

    this.element.appendChild(this.topPoint)
    this.element.appendChild(this.lineElement)
    this.element.appendChild(this.bottomPoint)
  }

  /**
   * Set the size of the cursor
   *
   * @param {number} size
   * @memberof Cursor
   */
  setCursorSize = (size) => {
    const pointDiameter = `${this.width}px`

    this.style.width = pointDiameter

    this.topPoint.style.height = pointDiameter
    this.topPoint.style.width = pointDiameter
    this.bottomPoint.style.height = pointDiameter
    this.bottomPoint.style.width = pointDiameter

    this.lineElement.style.height = `${size}px`
    this.lineElement.style.width = '2px'
  }

  /**
   * Check if it is in the region of the cursor
   *
   * @param {Object} position
   * @param {number} position.x
   * @param {number} position.y
   * @memberof Cursor
   */
  inRegion = (position = {}) => {
    if (this.deviceType === DeviceType.PC) {
      return { inRegion: false }
    }
    const maxDistance = this.height
    let distance = Number.MAX_SAFE_INTEGER
    if (position.y > this.position.y && position.y < this.position.y + this.height) {
      distance = Math.abs(position.x - this.position.x)
    }
    if (position.y >= this.position.y + this.with) {
      distance = getDistance(position, { x: this.position.x, y: this.position.y + this.height })
    }
    if (position.y <= this.position.y) {
      distance = getDistance(position, this.position)
    }
    return { inRegion: distance <= maxDistance, distance }
  }
}
