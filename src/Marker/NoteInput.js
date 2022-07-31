import BaseElement from './BaseElement';
import { DeviceType, MarkingType } from './types';
import { log, addClass, getRandomString } from './utilities';
import Modal from './Modal';
import clamp from './clamp';


export default class NoteInput extends BaseElement {
  constructor(container, marker) {
    super();
    this.container = container;
    this.marker = marker;
    this.selectedRange = null;

    this.wrapper = null;
    this.abstract = null;
    this.textarea = null;
    this.submitBtn = null;
    this.closeBtn = null;

    this.overlay = null;

    this.modal = null;
    this.modalId = null;

    if (this.marker.deviceType === DeviceType.MOBILE) {
      this.createElementForMobile();
    } else {
      this.createElementForPc();
    }
  }


  get isOpen() {
    if (this.wrapper) {
      return window.getComputedStyle(this.wrapper).display === 'block';
    }
    return false;
  }


  createElementForPc = () => {
    const element = document.createElement('div');
    addClass(element, 'marker-inputArea');
    element.style.display = 'none';

    const abstract = document.createElement('div');
    addClass(abstract, 'marker-inputArea-abstract');
    element.appendChild(abstract);

    const textarea = document.createElement('textarea');
    addClass(textarea, 'marker-inputArea-textarea');
    textarea.setAttribute('placeholder', '写下你的想法');
    element.appendChild(textarea);

    const footer = document.createElement('div');
    addClass(footer, 'marker-inputArea-footer');
    const closeBtn = document.createElement('button');
    addClass(closeBtn, 'marker-inputArea-cancel');
    closeBtn.innerHTML = '取消';
    const submitBtn = document.createElement('button');
    addClass(submitBtn, 'marker-inputArea-submit');
    submitBtn.style.display = 'none';
    submitBtn.innerHTML = '提交';
    footer.appendChild(closeBtn);
    footer.appendChild(submitBtn);
    element.appendChild(footer);

    this.container.appendChild(element);
    this.element = this.wrapper = element;
    this.abstract = abstract;
    this.textarea = textarea;
    this.submitBtn = submitBtn;
    this.closeBtn = closeBtn;

    this.textarea.addEventListener('input', this.handleTextareaChange);
    this.closeBtn.onclick = this.close;
    this.submitBtn.onclick = this.submit;
  }


  createElementForMobile = () => {
    const id = `modal-${getRandomString()}`;
    const wrapper = document.createElement('div');
    addClass(wrapper, 'marker-modal');
    addClass(wrapper, 'fade');
    wrapper.setAttribute('id', id);
    wrapper.setAttribute('tabindex', '-1');
    wrapper.setAttribute('role', 'dialog');
    wrapper.setAttribute('aria-hidden', 'true');
    const dialog = document.createElement('div');
    addClass(dialog, 'marker-modal-dialog');
    wrapper.appendChild(dialog);
    const content = document.createElement('div');
    addClass(content, 'marker-modal-content');
    dialog.appendChild(content);

    const abstract = document.createElement('div');
    addClass(abstract, 'marker-inputLine-abstract');
    content.appendChild(abstract);

    const textareaWrapper = document.createElement('div');
    addClass(textareaWrapper, 'marker-inputLine-textarea');
    const textarea = document.createElement('textarea');
    textarea.setAttribute('placeholder', '写下你的想法');
    const submitBtn = document.createElement('button');
    addClass(submitBtn, 'marker-inputLine-submit');
    submitBtn.textContent = '提交';
    submitBtn.setAttribute('disabled', true);
    submitBtn.style.color = '#999';
    submitBtn.onclick = this.submit;
    textareaWrapper.appendChild(textarea);
    textareaWrapper.appendChild(submitBtn);
    content.appendChild(textareaWrapper);

    textarea.addEventListener('input', this.handleTextareaChange);
    if (this.marker.deviceType === DeviceType.MOBILE) {
      textarea.addEventListener('focus', this.handleTextareaFocus, false);
      textarea.addEventListener('blur', this.handleTextareaBlur);
    }

    this.container.appendChild(wrapper);
    this.element = this.wrapper = wrapper;
    this.textarea = textarea;
    this.abstract = abstract;
    this.submitBtn = submitBtn;

    this.modalId = id;
    this.modal = new Modal(`#${id}`);
    this.wrapper.addEventListener('shown.bs.modal', this.handleModalShown);
    this.wrapper.addEventListener('hidden.bs.modal', this.handleModalHidden);
  }


  handleTextareaFocus = () => {
    setTimeout(function () {
      window.scrollTo(0, Math.max(document.body.clientHeight, document.documentElement.clientHeight));
    })
  }

  handleTextareaBlur = () => {
    setTimeout(function () {
      window.scrollTo(0, 0);
    })
  }

  handleTextareaChange = () => {
    if (this.textarea.value.trim()) {
      if (this.marker.deviceType === DeviceType.PC) {
        this.submitBtn.style.display = 'inline-block';
      } else {
        this.submitBtn.removeAttribute('disabled');
        this.submitBtn.style.color = '#fff';
      }
    } else {
      if (this.marker.deviceType === DeviceType.PC) {
        this.submitBtn.style.display = 'none';
      } else {
        this.submitBtn.setAttribute('disabled', true);
        this.submitBtn.style.color = '#999';
      }
    }
  }

  handleModalShown = () => {
    this.textarea.focus();
  }

  handleModalHidden = () => {
    this.close();
    this.marker.noteInputCloseHandler();
  }

  submit = () => {
    const text = this.textarea.value.trim();
    if (!text) { return; }

    if (this.textarea.getAttribute('disabled')) { return; }
    this.textarea.setAttribute('disabled', true);

    this.marker.noteSubmitHandler(Object.assign(
      {}, 
      this.selectedRange, 
      { 
        id: getRandomString(),
        type: MarkingType.NOTE,
        note: text 
      }
    ));
  }


  /**
   * 
   * @param {object} range 
   * {
   *    startParaId
   *    startOffset
   *    endParaId
   *    endOffset
   *    abstract
   * }
   */
  open = () => {
    if (!this.selectedRange) {
      log('A selection must be generated by menu action before open the note input.');
      return;
    }
    this.marker.noteList.hide();
    this.abstract.textContent = this.selectedRange.abstract;
    this.wrapper.style.visibility = 'hidden';
    this.wrapper.style.display = 'block';
    if (this.marker.deviceType === DeviceType.MOBILE) {
      clamp(this.abstract, {clamp: 1});
    } else {
      clamp(this.abstract);
    }
    this.wrapper.style.visibility = 'visible';
    this.marker.menu.hide();
    this.marker.cursor.start.hide();
    this.marker.cursor.end.hide();
    this.marker.touchEvent.disable();
    if (this.marker.deviceType === DeviceType.MOBILE) {
      this.modal.show();
    }
    this.textarea.focus();
  }


  close = () => {
    if (this.marker.deviceType === DeviceType.PC) {
      this.marker.noteInputCloseHandler();
    }
    this.marker.reset();
    this.marker.touchEvent.enable();
    this.reset();
  }


  reset = () => {
    this.textarea.value = '';
    if (this.marker.deviceType === DeviceType.PC) {
      this.wrapper.style.display = 'none';
      this.submitBtn.style.display = 'none';
      this.closeBtn.style.display = 'inline-block';
    } else {
      this.submitBtn.setAttribute('disabled', true);
      this.submitBtn.style.color = '#999';
      if (this.isOpen) {
        this.modal.hide();
      }
    }
    this.textarea.removeAttribute('disabled');
    this.selectedRange = null;
  }

  destroy() {
    this.textarea.removeEventListener('input', this.handleTextareaChange);
    this.textarea.removeEventListener('focus', this.handleTextareaFocus);
    this.textarea.removeEventListener('blur', this.handleTextareaBlur);
    if (this.marker.deviceType === DeviceType.MOBILE) {
      this.wrapper.removeEventListener('shown.bs.modal', this.handleModalShown);
      this.wrapper.removeEventListener('hidden.bs.modal', this.handleModalHidden);
    }
    super.destroy();
  }
}