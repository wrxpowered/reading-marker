import { addClass, removeClass } from './utilities';

export default class Toast {
  constructor(container = document.body) {
    this.container = container;
    this.element = null;
    this.timer = null;
  }

  show = (message, duration = 1000) => {
    this.remove();
    const element = document.createElement('div');
    addClass(element, 'marker-toast');
    addClass(element, 'marker-toast-show');
    element.textContent = message;
    this.element = element;
    this.container.appendChild(this.element);
    this.timer = setTimeout(() => this.hide(), duration);
  }

  hide = () => {
    if (!this.element) { return; }
    removeClass(this.element, 'marker-toast-show');
    addClass(this.element, 'marker-toast-hide');
    this.timer = setTimeout(() => this.remove(), 500);
  }

  remove = () => {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    if (this.element) {
      this.container.removeChild(this.element);
      this.element = null;
    }
  }
}