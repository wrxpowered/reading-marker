import { addClass, hasClass, removeClass } from './utilities';


/**
 * passiveHandler
 */
const supportPassive = () => {
  let result = false;
  try {
    const opts = Object.defineProperty({}, 'passive', {
      get: function () {
        result = true;
      }
    });
    document.addEventListener('DOMContentLoaded', function wrap() {
      document.removeEventListener('DOMContentLoaded', wrap, opts)
    }, opts);
  } catch (e) { }

  return result;
}
const passiveHandler = supportPassive() ? { passive: true } : false;



/**
 * emulateTransitionEnd & getElementTransitionDuration
 */
const transitionEndEvent = 'webkitTransition' in document.head.style ? 'webkitTransitionEnd' : 'transitionend';
const supportTransition = 'webkitTransition' in document.head.style || 'transition' in document.head.style;
const transitionDuration = 'webkitTransition' in document.head.style ? 'webkitTransitionDuration' : 'transitionDuration';
const transitionProperty = 'webkitTransition' in document.head.style ? 'webkitTransitionProperty' : 'transitionProperty';
function getElementTransitionDuration(element) {
  let computedStyle = getComputedStyle(element),
    property = computedStyle[transitionProperty],
    duration = supportTransition && property && property !== 'none'
      ? parseFloat(computedStyle[transitionDuration]) : 0;

  return !isNaN(duration) ? duration * 1000 : 0;
}
function emulateTransitionEnd(element, handler) {
  let called = 0, duration = getElementTransitionDuration(element);
  if (duration) {
    element.addEventListener(transitionEndEvent, function transitionEndWrapper(e) {
      !called && handler(e);
      called = 1;
      element.removeEventListener(transitionEndEvent, transitionEndWrapper)
    });
  } else {
    setTimeout(function () { !called && handler(); called = 1; }, 17);
  }
}


/**
 * queryElement
 */
function queryElement(selector, parent) {
  var lookUp = parent && parent instanceof Element ? parent : document;
  return selector instanceof Element ? selector : lookUp.querySelector(selector);
}



/**
 * bootstrapCustomEvent
 */
function bootstrapCustomEvent(eventName, componentName, eventProperties) {
  let OriginalCustomEvent = new CustomEvent(eventName + '.bs.' + componentName, { cancelable: true });
  if (typeof eventProperties !== 'undefined') {
    Object.keys(eventProperties).forEach(key => {
      Object.defineProperty(OriginalCustomEvent, key, {
        value: eventProperties[key]
      });
    });
  }
  return OriginalCustomEvent;
}


function dispatchCustomEvent(customEvent) {
  this && this.dispatchEvent(customEvent);
}


function setFocus(element) {
  element.focus ? element.focus() : element.setActive();
}





export default function Modal(element, options) { // element can be the modal/triggering button

  // set options
  options = options || {};

  // bind, modal
  let self = this, modal,

    // custom events
    showCustomEvent,
    shownCustomEvent,
    hideCustomEvent,
    hiddenCustomEvent,
    // event targets and other
    relatedTarget = null,
    scrollBarWidth,
    overlay,
    overlayDelay,

    // also find fixed-top / fixed-bottom items
    fixedItems,
    ops = {};

  // private methods
  function setScrollbar() {
    let openModal = hasClass(document.body, 'marker-modal-open');

    let bodyPad = parseInt(getComputedStyle(document.body).paddingRight);

    let bodyOverflow = document.documentElement.clientHeight !== document.documentElement.scrollHeight
        || document.body.clientHeight !== document.body.scrollHeight;

    let modalOverflow = modal.clientHeight !== modal.scrollHeight;

    scrollBarWidth = measureScrollbar();

    modal.style.paddingRight = !modalOverflow && scrollBarWidth ? `${scrollBarWidth}px` : '';
    document.body.style.paddingRight = modalOverflow || bodyOverflow ? `${bodyPad + (openModal ? 0 : scrollBarWidth)}px` : '';

    fixedItems.length && fixedItems.map(fixed => {
      let itemPad = getComputedStyle(fixed).paddingRight;
      fixed.style.paddingRight = modalOverflow || bodyOverflow ? `${parseInt(itemPad) + (openModal ? 0 : scrollBarWidth)}px` : `${parseInt(itemPad)}px`;
    })
  }

  function resetScrollbar() {
    document.body.style.paddingRight = '';
    modal.style.paddingRight = '';
    fixedItems.length && fixedItems.map(fixed => {
      fixed.style.paddingRight = '';
    })
  }

  function measureScrollbar() {
    let scrollDiv = document.createElement('div'), widthValue;

    scrollDiv.className = 'marker-modal-scrollbar-measure'; // this is here to stay
    document.body.appendChild(scrollDiv);
    widthValue = scrollDiv.offsetWidth - scrollDiv.clientWidth;
    document.body.removeChild(scrollDiv);
    return widthValue;
  }

  function createOverlay() {
    let newOverlay = document.createElement('div');
    overlay = queryElement('.marker-modal-backdrop');

    if (overlay === null) {
      newOverlay.setAttribute('class', 'marker-modal-backdrop' + (ops.animation ? ' fade' : ''));
      overlay = newOverlay;
      document.body.appendChild(overlay);
    }
    return overlay;
  }

  function removeOverlay() {
    overlay = queryElement('.marker-modal-backdrop');
    if (overlay && !document.getElementsByClassName('marker-modal show')[0]) {
      document.body.removeChild(overlay); overlay = null;
    }
    if (overlay === null) {
      removeClass(document.body, 'marker-modal-open');
      resetScrollbar();
    };
  }

  function toggleEvents(action) {
    action = action ? 'addEventListener' : 'removeEventListener';
    window[action]('resize', self.update, passiveHandler);
    modal[action]('click', dismissHandler, false);
    document[action]('keydown', keyHandler, false);
  }

  // triggers
  function beforeShow() {
    modal.style.display = 'block';

    setScrollbar();
    if (!document.getElementsByClassName('marker-modal show')[0]) {
      addClass(document.body, 'marker-modal-open');
    }

    addClass(modal, 'show');
    modal.setAttribute('aria-hidden', false);

    hasClass(modal, 'fade') ? emulateTransitionEnd(modal, triggerShow) : triggerShow();
  }

  function triggerShow() {
    setFocus(modal);
    modal.isAnimating = false;

    toggleEvents(1);

    shownCustomEvent = bootstrapCustomEvent('shown', 'modal', { relatedTarget: relatedTarget });
    dispatchCustomEvent.call(modal, shownCustomEvent);
  }

  function triggerHide(force) {
    modal.style.display = '';
    element && (setFocus(element));

    overlay = queryElement('.marker-modal-backdrop');

    // force can also be the transitionEvent object, we wanna make sure it's not
    if (force !== 1 && overlay && hasClass(overlay, 'show') && !document.getElementsByClassName('marker-modal show')[0]) {
      removeClass(overlay, 'show');
      emulateTransitionEnd(overlay, removeOverlay);
    } else {
      removeOverlay();
    }

    toggleEvents();

    modal.isAnimating = false;

    hiddenCustomEvent = bootstrapCustomEvent('hidden', 'modal');
    dispatchCustomEvent.call(modal, hiddenCustomEvent);
  }

  // handlers
  function clickHandler(e) {
    if (modal.isAnimating) return;
    let clickTarget = e.target,
      modalID = `#${modal.getAttribute('id')}`,
      targetAttrValue = clickTarget.getAttribute('data-target') || clickTarget.getAttribute('href'),
      elemAttrValue = element.getAttribute('data-target') || element.getAttribute('href');

    if (!hasClass(modal, 'show')
      && (clickTarget === element && targetAttrValue === modalID
        || element.contains(clickTarget) && elemAttrValue === modalID)) {
      modal.modalTrigger = element;
      relatedTarget = element;
      self.show();
      e.preventDefault();
    }
  }

  function keyHandler({ which }) {
    if (!modal.isAnimating && ops.keyboard && which == 27 && hasClass(modal, 'show')) {
      self.hide();
    }
  }

  function dismissHandler(e) {
    if (modal.isAnimating) return;
    let clickTarget = e.target,
      hasData = clickTarget.getAttribute('data-dismiss') === 'modal',
      parentWithData = clickTarget.closest('[data-dismiss="modal"]');

    if (hasClass(modal, 'show') && (parentWithData || hasData
      || clickTarget === modal && ops.backdrop !== 'static')) {
      self.hide(); relatedTarget = null;
      e.preventDefault();
    }
  }

  // public methods
  self.toggle = () => {
    if (hasClass(modal, 'show')) { self.hide(); } else { self.show(); }
  };

  self.show = () => {
    if (hasClass(modal, 'show') && !!modal.isAnimating) { return }

    showCustomEvent = bootstrapCustomEvent('show', 'modal', { relatedTarget: relatedTarget });
    dispatchCustomEvent.call(modal, showCustomEvent);

    if (showCustomEvent.defaultPrevented) return;

    modal.isAnimating = true;

    // we elegantly hide any opened modal
    let currentOpen = document.getElementsByClassName('marker-modal show')[0];
    if (currentOpen && currentOpen !== modal) {
      currentOpen.modalTrigger && currentOpen.modalTrigger.Modal.hide();
      currentOpen.Modal && currentOpen.Modal.hide();
    }

    if (ops.backdrop) {
      overlay = createOverlay();
    }

    if (overlay && !currentOpen && !hasClass(overlay, 'show')) {
      // overlay.offsetWidth; // force reflow to enable trasition
      overlayDelay = getElementTransitionDuration(overlay);
      addClass(overlay, 'show');
    }

    !currentOpen ? setTimeout(beforeShow, overlay && overlayDelay ? overlayDelay : 0) : beforeShow();
  };

  self.hide = (force) => {
    if (!hasClass(modal, 'show')) { return }

    hideCustomEvent = bootstrapCustomEvent('hide', 'modal');
    dispatchCustomEvent.call(modal, hideCustomEvent);
    if (hideCustomEvent.defaultPrevented) return;

    modal.isAnimating = true;

    removeClass(modal, 'show');
    modal.setAttribute('aria-hidden', true);

    hasClass(modal, 'fade') && force !== 1 ? emulateTransitionEnd(modal, triggerHide) : triggerHide();
  };

  self.setContent = content => {
    queryElement('.marker-modal-content', modal).innerHTML = content;
  };

  self.update = () => {
    if (hasClass(modal, 'show')) {
      setScrollbar();
    }
  };
  
  self.dispose = () => {
    self.hide(1);
    if (element) { element.removeEventListener('click', clickHandler, false); delete element.Modal; }
    else { delete modal.Modal; }
  };

  // init

  // the modal (both JavaScript / DATA API init) / triggering button element (DATA API)
  element = queryElement(element);

  // determine modal, triggering element
  let checkModal = queryElement(element.getAttribute('data-target') || element.getAttribute('href'))
  modal = hasClass(element, 'marker-modal') ? element : checkModal

  // set fixed items
  fixedItems = Array.from(document.getElementsByClassName('fixed-top'))
    .concat(Array.from(document.getElementsByClassName('fixed-bottom')));

  if (hasClass(element, 'marker-modal')) { element = null; } // modal is now independent of it's triggering element

  // reset on re-init
  element && element.Modal && element.Modal.dispose();
  modal && modal.Modal && modal.Modal.dispose();

  // set options
  ops.keyboard = options.keyboard === false || modal.getAttribute('data-keyboard') === 'false' ? false : true;
  ops.backdrop = options.backdrop === 'static' || modal.getAttribute('data-backdrop') === 'static' ? 'static' : true;
  ops.backdrop = options.backdrop === false || modal.getAttribute('data-backdrop') === 'false' ? false : ops.backdrop;
  ops.animation = hasClass(modal, 'fade') ? true : false;
  ops.content = options.content; // JavaScript only

  // set an initial state of the modal
  modal.isAnimating = false;

  // prevent adding event handlers over and over
  // modal is independent of a triggering element
  if (element && !element.Modal) {
    element.addEventListener('click', clickHandler, false);
  }

  if (ops.content) {
    self.setContent(ops.content.trim());
  }

  // set associations
  if (element) {
    modal.modalTrigger = element;
    element.Modal = self;
  } else {
    modal.Modal = self;
  }

}

