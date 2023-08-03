import styles from './mbzScrollbars.component.css.js';
const stylesheet = new CSSStyleSheet();
stylesheet.replaceSync(styles);
class HTMLMBZScrollbarsElement extends HTMLElement {
  static #INCREMENTAL_SCROLL_RATIO = 0.875;
  static #SCROLLBAR_SIZE_CSS_VARIABLE = '--_scrollbar-size';
  static #slottedElementStyles = new CSSStyleSheet();
  static #rootNodesWithSlottedElementStyles = new Set();
  #hasRendered = false;
  #isReady = false;
  #isSlottedElementScrollable;
  #lastScrollbarYMouseDownStats = {};
  #readyPromise;
  #readyPromiseResolve;
  #scrollbarSize;
  #scrollTapBehaviors = {
    DEFAULT: 'incremental',
    RELATIVE: 'relative'
  };
  #slottedElement;
  #slottedElementPaddingBottomInitial;
  #slottedElementPaddingRightInitial;
  #slottedElementResizeObserver;
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.adoptedStyleSheets = [stylesheet];
    this.#readyPromise = new Promise((resolve) => {
      this.#readyPromiseResolve = resolve;
    });
    this.#scrollbarSize = parseInt(getComputedStyle(this).getPropertyValue(HTMLMBZScrollbarsElement.#SCROLLBAR_SIZE_CSS_VARIABLE), 10);
    this.#addEventListeners();
  }
  static get observedAttributes() {
    return [
      'always-on',
      'scroll-tap-behavior'
    ];
  }
  attributeChangedCallback(attributeName, oldValue, newValue) {
    if (!this.isConnected || Object.is(newValue, oldValue)) {
      return;
    }
    switch (attributeName) {
      case 'always-on':
        this.ready().then(() => {
          this.#scrollbarsElement.classList.toggle('scrollbars--always-on', newValue !== null);
        });
        break;
      default:
        break;
    }
  }
  connectedCallback() {
    if (this.#hasRendered) {
      return;
    }
    this.render();
    this.isReady = true;
  }
  get alwaysOn() {
    return this.hasAttribute('always-on');
  }
  set alwaysOn(value) {
    this.toggleAttribute('always-on', value);
  }
  get isReady() {
    return this.#isReady;
  }
  set isReady(value) {
    this.#isReady = value;
    if (value) {
      this.#readyPromiseResolve();
    }
  }
  get scrollTapBehavior() {
    const scrollTapBehaviorAttributeValue = this.getAttribute('scroll-tap-behavior');
    return scrollTapBehaviorAttributeValue === this.#scrollTapBehaviors.RELATIVE
      ? scrollTapBehaviorAttributeValue
      : this.#scrollTapBehaviors.DEFAULT;
  }
  set scrollTapBehavior(value) {
    this.setAttribute('scroll-tap-behavior', value);
  }
  get #incrementalHorizontalScrollPixels() {
    return this.#slottedElement.offsetWidth * HTMLMBZScrollbarsElement.#INCREMENTAL_SCROLL_RATIO;
  }
  get #incrementalVerticalScrollPixels() {
    return this.#slottedElement.offsetHeight * HTMLMBZScrollbarsElement.#INCREMENTAL_SCROLL_RATIO;
  }
  get #scrollbarsElement() {
    return this.shadowRoot.getElementById('scrollbars');
  }
  get #scrollbarXElement() {
    return this.shadowRoot.getElementById('scrollbar-x');
  }
  get #scrollbarXControlSurfaceElement() {
    return this.shadowRoot.getElementById('scrollbar-x-control-surface');
  }
  get #scrollbarXControlSurfaceElementOffsetLeft() {
    const transformMatrix = getComputedStyle(this.#scrollbarXControlSurfaceElement).getPropertyValue('transform').split(',');
    const transformX = parseFloat(transformMatrix[4]);
    return isNaN(transformX) ? 0 : transformX;
  }
  get #scrollbarYElement() {
    return this.shadowRoot.getElementById('scrollbar-y');
  }
  get #scrollbarYControlSurfaceElement() {
    return this.shadowRoot.getElementById('scrollbar-y-control-surface');
  }
  get #scrollbarYControlSurfaceElementOffsetTop() {
    const transformMatrix = getComputedStyle(this.#scrollbarYControlSurfaceElement).getPropertyValue('transform').split(',');
    const transformY = parseFloat(transformMatrix[5]);
    return isNaN(transformY) ? 0 : transformY;
  }
  get #scrollableHeight() {
    return this.#slottedElement.scrollHeight - this.#slottedElement.clientHeight;
  }
  get #scrollableWidth() {
    return this.#slottedElement.scrollWidth - this.#slottedElement.clientWidth;
  }
  get #horizontalScrollSpace() {
    return this.#scrollbarXElement.offsetWidth - this.#scrollbarXControlSurfaceElement.offsetWidth;
  }
  get #verticalScrollSpace() {
    return this.#scrollbarYElement.offsetHeight - this.#scrollbarYControlSurfaceElement.offsetHeight;
  }
  ready() {
    return this.#readyPromise;
  }
  render() {
    this.shadowRoot.innerHTML = '';
    this.shadowRoot.append(this.#createContent());
    this.#hasRendered = true;
  }
  #addEventListeners() {
    this.shadowRoot.addEventListener('slotchange', this.#onSlotChange.bind(this));
  }
  #addEventListenersToScrollbars() {
    this.#scrollbarXElement.addEventListener('mousedown', this.#onScrollbarMouseDown.bind(this));
    this.#scrollbarYElement.addEventListener('mousedown', this.#onScrollbarMouseDown.bind(this));
    this.#scrollbarXElement.addEventListener('selectstart', this.#preventDefault);
    this.#scrollbarYElement.addEventListener('selectstart', this.#preventDefault);
    this.#scrollbarXElement.addEventListener('dragstart', this.#preventDefault);
    this.#scrollbarYElement.addEventListener('dragstart', this.#preventDefault);
  }
  #addEventListenersToSlottedElement() {
    this.#slottedElement.addEventListener('scroll', this.#onSlottedElementScroll.bind(this));
    this.#slottedElement.addEventListener('input', this.#onSlottedElementInput.bind(this));
  }
  #addScrollbarXMouseMoveEventListener() {
    const onScrollbarXElementMouseMove = this.#onScrollbarXMouseMove.bind(this);
    document.addEventListener('mousemove', onScrollbarXElementMouseMove);
    document.onmouseup = () => {
      document.removeEventListener('mousemove', onScrollbarXElementMouseMove);
      this.#scrollbarXControlSurfaceElement.classList.remove('scrollbars__scrollbar-control-surface--active');
      this.#scrollbarsElement.classList.remove('scrollbars--active');
    };
  }
  #addScrollbarYMouseMoveEventListener() {
    const onScrollbarYElementMouseMove = this.#onScrollbarYMouseMove.bind(this);
    document.addEventListener('mousemove', onScrollbarYElementMouseMove);
    document.onmouseup = () => {
      document.removeEventListener('mousemove', onScrollbarYElementMouseMove);
      this.#scrollbarYControlSurfaceElement.classList.remove('scrollbars__scrollbar-control-surface--active');
      this.#scrollbarsElement.classList.remove('scrollbars--active');
    };
  }
  #addSlottedElementStylesToRootNode() {
    const rootNode = this.getRootNode();
    if (HTMLMBZScrollbarsElement.#rootNodesWithSlottedElementStyles.has(rootNode)) {
      return;
    }
    HTMLMBZScrollbarsElement.#slottedElementStyles.replaceSync(`
      .x-scroller-slotted {
        box-sizing: border-box !important;
        scrollbar-width: none !important;
      }
      textarea.x-scroller-slotted {
        margin-top: 0;
      }
      .x-scroller-slotted::-webkit-scrollbar {
        display: none !important;
      }
    `);
    rootNode.adoptedStyleSheets.push(HTMLMBZScrollbarsElement.#slottedElementStyles);
    HTMLMBZScrollbarsElement.#rootNodesWithSlottedElementStyles.add(rootNode);
  }
  #adjustSlottedElementMarginBottom() {
    const heightDifference = this.#scrollbarsElement.clientHeight - this.#slottedElement.clientHeight;
    if (heightDifference) {
      const slottedElementCurrentMarginBottom = parseFloat(getComputedStyle(this.#slottedElement).getPropertyValue('margin-bottom'));
      this.#slottedElement.style.marginBottom = slottedElementCurrentMarginBottom + (heightDifference * -1) + 'px';
    }
  }
  #adjustSlottedElementPadding() {
    if (this.isdone) {
      return;
    }
    const [overflowX, overflowY] = getComputedStyle(this.#slottedElement).getPropertyValue('overflow').split(' ');
    if (this.#canSlottedElementScrollHorizontally() || overflowX === 'scroll') {
      this.#slottedElement.style.paddingBottom = parseFloat(this.#slottedElementPaddingBottomInitial) + this.#scrollbarSize + 'px';
    } else {
      this.#slottedElement.style.paddingBottom = this.#slottedElementPaddingBottomInitial;
    }
    if (this.#canSlottedElementScrollVertically() || overflowY === 'scroll') {
      this.#slottedElement.style.paddingRight = parseFloat(this.#slottedElementPaddingRightInitial) + this.#scrollbarSize + 'px';
    } else {
      this.#slottedElement.style.paddingRight = this.#slottedElementPaddingRightInitial;
    }
    this.isdone = true;
  }
  #canSlottedElementScrollHorizontally() {
    const { clientWidth, scrollWidth } = this.#slottedElement;
    return scrollWidth > clientWidth;
  }
  #canSlottedElementScrollVertically() {
    const { clientHeight, scrollHeight } = this.#slottedElement;
    return scrollHeight > clientHeight;
  }
  #createContent() {
    return new DOMParser().parseFromString(`
      <section class="block-container">
        <section class="scrollbars" id="scrollbars">
          <slot></slot>
          <div class="scrollbars__scrollbar scrollbars__scrollbar--vertical" id="scrollbar-y">
            <div class="scrollbars__scrollbar-control-surface scrollbars__scrollbar-control-surface--vertical" id="scrollbar-y-control-surface"></div>
          </div>
          <div class="scrollbars__scrollbar scrollbars__scrollbar--horizontal" id="scrollbar-x">
            <div class="scrollbars__scrollbar-control-surface scrollbars__scrollbar-control-surface--horizontal" id="scrollbar-x-control-surface"></div>
          </div>
        </section>
      </section>
    `, 'text/html').body.firstElementChild;
  }
  #getAbsoluteOffsetsFromElement(element) {
    let offsetLeft = arguments[1] || 0;
    let offsetTop = arguments[2] || 0;
    offsetLeft += element.offsetLeft;
    offsetTop += element.offsetTop;
    const nextParentNodeToCheck  = element.parentNode === this ? this.parentNode : element.parentNode;
    if (nextParentNodeToCheck && nextParentNodeToCheck !== document.body) {
      return this.#getAbsoluteOffsetsFromElement(nextParentNodeToCheck, offsetLeft, offsetTop);
    }
    return {
      offsetLeft: offsetLeft - window.scrollX,
      offsetTop: offsetTop - window.scrollY
    };
  }
  #getBackgroundColorBrightnessFromElement = (element) => {
    const TRANSPARENT_RGBA_COLOR_PATTERN = /rgba\(0, ?0, ?0, ?0/;
    const { backgroundColor } = getComputedStyle(element);
    if (TRANSPARENT_RGBA_COLOR_PATTERN.test(backgroundColor)) {
      if (element.parentNode.nodeType === document.ELEMENT_NODE) {
        return this.#getBackgroundColorBrightnessFromElement(element.parentNode);
      } else if (element.parentNode.nodeType === document.DOCUMENT_FRAGMENT_NODE) {
        return this.#getBackgroundColorBrightnessFromElement(element.parentNode.host);
      }
      return;
    }
    const rgbValues = backgroundColor.replace(/rgba?\(|\)/g, '').split(',').slice(0, 3);
    const combinedRGBValues = rgbValues.reduce((previousValue, currentValue) => {
      return parseFloat(previousValue) + parseFloat(currentValue);
    });
    return combinedRGBValues > (255 * 3 / 2) ? 'light' : 'dark';
  };
  #onScrollbarMouseDown(event) {
    const { clientX, clientY, target } = event;
    const { offsetLeft, offsetTop } = this.#getAbsoluteOffsetsFromElement(this.#slottedElement);
    const { borderLeftWidth, borderTopWidth } = getComputedStyle(this.#scrollbarsElement);
    const relativeClientX = clientX - offsetLeft - parseFloat(borderLeftWidth);
    const relativeClientY = clientY - offsetTop - parseFloat(borderTopWidth);
    this.#lastScrollbarYMouseDownStats = {
      clientX: relativeClientX,
      clientY: relativeClientY,
      slottedElementScrollLeft: this.#slottedElement.scrollLeft,
      slottedElementScrollTop: this.#slottedElement.scrollTop
    };
    if (target.id === 'scrollbar-x') {
      this.#onScrollbarXMouseDown(relativeClientX);
    } else if (target.id === 'scrollbar-y') {
      this.#onScrollbarYMouseDown(relativeClientY);
    } else if (target.id === 'scrollbar-x-control-surface') {
      this.#scrollbarXControlSurfaceElement.classList.add('scrollbars__scrollbar-control-surface--active');
      this.#addScrollbarXMouseMoveEventListener();
    } else if (target.id === 'scrollbar-y-control-surface') {
      this.#scrollbarYControlSurfaceElement.classList.add('scrollbars__scrollbar-control-surface--active');
      this.#addScrollbarYMouseMoveEventListener();
    }
    this.#scrollbarsElement.classList.add('scrollbars--active');
  }
  #onScrollbarXMouseDown(relativeClientX) {
    if (this.scrollTapBehavior === this.#scrollTapBehaviors.RELATIVE) {
      const horizontalPixelsPerPixelRatio = this.#scrollableWidth / this.#horizontalScrollSpace;
      const scrollLeft = (relativeClientX * horizontalPixelsPerPixelRatio);
      this.#slottedElement.scrollTo(scrollLeft, this.#slottedElement.scrollTop);
      if (scrollLeft < this.#scrollableWidth) {
        const scrollLeftControlSurfaceAdjust = this.#scrollbarXControlSurfaceElement.offsetWidth * horizontalPixelsPerPixelRatio / 2 * -1;
        this.#slottedElement.scrollBy(scrollLeftControlSurfaceAdjust, this.#slottedElement.scrollTop);
      }
    } else {
      if (relativeClientX > this.#scrollbarXControlSurfaceElementOffsetLeft + this.#scrollbarXControlSurfaceElement.offsetWidth) {
        this.#slottedElement.scrollBy(this.#incrementalHorizontalScrollPixels, this.#slottedElement.scrollTop);
      } else {
        this.#slottedElement.scrollBy(this.#incrementalHorizontalScrollPixels * -1, this.#slottedElement.scrollTop);
      }
    }
    this.#lastScrollbarYMouseDownStats.slottedElementScrollLeft = this.#slottedElement.scrollLeft;
  }
  #onScrollbarXMouseMove(event) {
    const { clientX } = event;
    const { offsetLeft } = this.#getAbsoluteOffsetsFromElement(this.#slottedElement);
    const { borderLeftWidth} = getComputedStyle(this.#scrollbarsElement);
    const relativeClientX = clientX - offsetLeft - parseFloat(borderLeftWidth);
    const verticalPixelsPerPixelRatio = this.#scrollableWidth / this.#horizontalScrollSpace;
    const distance = relativeClientX - this.#lastScrollbarYMouseDownStats.clientX + (this.#lastScrollbarYMouseDownStats.slottedElementScrollLeft / verticalPixelsPerPixelRatio);
    const scrollLeft = distance * verticalPixelsPerPixelRatio;
    this.#slottedElement.scrollTo(scrollLeft, this.#slottedElement.scrollTop);
  }
  #onScrollbarYMouseDown(relativeClientY) {
    if (this.scrollTapBehavior === this.#scrollTapBehaviors.RELATIVE) {
      const verticalPixelsPerPixelRatio = this.#scrollableHeight / this.#verticalScrollSpace;
      const scrollTop = (relativeClientY * verticalPixelsPerPixelRatio);
      this.#slottedElement.scrollTo(this.#slottedElement.scrollLeft, scrollTop);
      if (scrollTop < this.#scrollableHeight) {
        const scrollTopControlSurfaceAdjust = this.#scrollbarYControlSurfaceElement.offsetHeight * verticalPixelsPerPixelRatio / 2 * -1;
        this.#slottedElement.scrollBy(this.#slottedElement.scrollLeft, scrollTopControlSurfaceAdjust);
      }
    } else {
      if (relativeClientY > this.#scrollbarYControlSurfaceElementOffsetTop + this.#scrollbarYControlSurfaceElement.offsetHeight) {
        this.#slottedElement.scrollBy(this.#slottedElement.scrollLeft, this.#incrementalVerticalScrollPixels);
      } else {
        this.#slottedElement.scrollBy(this.#slottedElement.scrollLeft, this.#incrementalVerticalScrollPixels * -1);
      }
    }
    this.#lastScrollbarYMouseDownStats.slottedElementScrollTop = this.#slottedElement.scrollTop;
  }
  #onScrollbarYMouseMove(event) {
    const { clientY } = event;
    const { offsetTop } = this.#getAbsoluteOffsetsFromElement(this.#slottedElement);
    const { borderTopWidth } = getComputedStyle(this.#scrollbarsElement);
    const relativeClientY = clientY - offsetTop - parseFloat(borderTopWidth);
    const verticalPixelsPerPixelRatio = this.#scrollableHeight / this.#verticalScrollSpace;
    const distance = relativeClientY - this.#lastScrollbarYMouseDownStats.clientY + (this.#lastScrollbarYMouseDownStats.slottedElementScrollTop / verticalPixelsPerPixelRatio);
    const scrollTop = distance * verticalPixelsPerPixelRatio;
    this.#slottedElement.scrollTo(this.#slottedElement.scrollLeft, scrollTop);
  }
  #onSlotChange(event) {
    this.#setupResizeObserver();
    this.#slottedElement = event.target.assignedElements()[0];
    this.#slottedElement.classList.add('x-scroller-slotted');
    const { paddingBottom, paddingRight } = getComputedStyle(this.#slottedElement);
    this.#slottedElementPaddingBottomInitial = paddingBottom;
    this.#slottedElementPaddingRightInitial = paddingRight;
    this.#slottedElementResizeObserver.observe(this.#slottedElement);
    this.#slottedElement.querySelectorAll('*').forEach((slottedElementChild) => {
      this.#slottedElementResizeObserver.observe(slottedElementChild);
    });
    if (this.#slottedElement instanceof HTMLTextAreaElement) {
      this.#scrollbarsElement.classList.add('scrollbars--textarea');
    }
    this.#addSlottedElementStylesToRootNode();
    this.#reflectSlottedElementStyles();
    this.#adjustSlottedElementMarginBottom();
    this.#setScrollbarsTheme();
    this.#addEventListenersToSlottedElement();
    this.#addEventListenersToScrollbars();
  }
  #onSlottedElementInput(event) {
    const { target: slottedElement } = event;
    const isScrollable = slottedElement.scrollHeight > slottedElement.clientHeight || slottedElement.scrollWidth > slottedElement.clientWidth;
    if (!this.#isSlottedElementScrollable && !isScrollable) {
      return;
    }
    this.#isSlottedElementScrollable = isScrollable;
    this.#setScrollbarStyles();
    this.#setScrollbarControlSurfaceDimensions();
  }
  #onSlottedElementScroll(event) {
    const { target: slottedElement } = event;
    const verticalScrollSpace = this.#scrollbarYElement.offsetHeight - this.#scrollbarYControlSurfaceElement.offsetHeight;
    const scrollableHeight = slottedElement.scrollHeight - slottedElement.clientHeight;
    const verticalPixelsPerPixelRatio = verticalScrollSpace / scrollableHeight;
    this.#scrollbarYControlSurfaceElement.style.transform = `translateY(${slottedElement.scrollTop * verticalPixelsPerPixelRatio}px)`;
    const horizontalScrollSpace = this.#scrollbarXElement.offsetWidth - this.#scrollbarXControlSurfaceElement.offsetWidth;
    const scrollableWidth = slottedElement.scrollWidth - slottedElement.clientWidth;
    const horizontalPixelsPerPixelRatio = horizontalScrollSpace / scrollableWidth;
    this.#scrollbarXControlSurfaceElement.style.transform = `translateX(${slottedElement.scrollLeft * horizontalPixelsPerPixelRatio}px)`;
  }
  #preventDefault(event) {
    event.preventDefault();
  }
  #reflectSlottedElementStyles() {
    this.#reflectSlottedElementBorderStyle();
    this.#reflectSlottedElementDisplayStyle();
    this.#reflectSlottedElementOverflowStyle();
  }
  #reflectSlottedElementBorderStyle() {
    this.#scrollbarsElement.style.border = getComputedStyle(this.#slottedElement).getPropertyValue('border');
    this.#slottedElement.style.border = 'none';
  }
  #reflectSlottedElementDisplayStyle() {
    this.style.setProperty('display', getComputedStyle(this.#slottedElement).getPropertyValue('display'));
  }
  #reflectSlottedElementOverflowStyle() {
    const [overflowX, overflowY] = getComputedStyle(this.#slottedElement).getPropertyValue('overflow').split(' ');
    this.#scrollbarXElement.classList.add(`scrollbars__scrollbar--overflow-${overflowX}`);
    this.#scrollbarYElement.classList.add(`scrollbars__scrollbar--overflow-${overflowY || overflowX}`);
  }
  #setupResizeObserver() {
    if (this.#slottedElementResizeObserver) {
      this.#slottedElementResizeObserver.disconnect();
    }
    this.#slottedElementResizeObserver = new ResizeObserver(() => {
      this.#setScrollbarStyles();
      this.#setScrollbarControlSurfaceDimensions();
    });
  }
  #setScrollbarVisibility() {
    this.#scrollbarXElement.classList.toggle('scrollbars__scrollbar--can-scroll', this.#canSlottedElementScrollHorizontally());
    this.#scrollbarYElement.classList.toggle('scrollbars__scrollbar--can-scroll', this.#canSlottedElementScrollVertically());
  }
  #setScrollbarDimensions() {
    const scrollbarXElementDisplay = getComputedStyle(this.#scrollbarXElement).display;
    const scrollbarYElementDisplay = getComputedStyle(this.#scrollbarYElement).display;
    this.#scrollbarXElement.classList.toggle('scrollbars__scrollbar--fullsize', scrollbarYElementDisplay !== 'block' && scrollbarXElementDisplay === 'block');
    this.#scrollbarYElement.classList.toggle('scrollbars__scrollbar--fullsize', scrollbarXElementDisplay !== 'block' && scrollbarYElementDisplay === 'block');
  }
  #setScrollbarStyles() {
    this.#setScrollbarVisibility();
    this.#setScrollbarDimensions();
    this.#adjustSlottedElementPadding();
  }
  #setScrollbarControlSurfaceDimensions() {
    const { clientHeight, clientWidth, scrollHeight, scrollWidth } = this.#slottedElement;
    const { offsetHeight: scrollbarYOffsetHeight } = this.#scrollbarYElement;
    const { offsetWidth: scrollbarXOffsetWidth } = this.#scrollbarXElement;
    const verticalScrollbarControlSurfaceHeight = scrollHeight - clientHeight === 0
      ? 0
      : scrollbarYOffsetHeight * (clientHeight / scrollHeight);
    const horizontalScrollbarControlSurfaceWidth = scrollWidth - clientWidth === 0
      ? 0
      : scrollbarXOffsetWidth * (clientWidth / scrollWidth);
    this.#scrollbarXControlSurfaceElement.style.width = horizontalScrollbarControlSurfaceWidth + 'px';
    this.#scrollbarYControlSurfaceElement.style.height = verticalScrollbarControlSurfaceHeight + 'px';
  }
  #setScrollbarsTheme() {
    const slottedElementBakcgroundColorBrightness = this.#getBackgroundColorBrightnessFromElement(this.#slottedElement);
    this.#scrollbarsElement.classList.toggle('scrollbars--light-on-dark', slottedElementBakcgroundColorBrightness === 'dark');
  }
}
customElements.define('mbz-scrollbars', HTMLMBZScrollbarsElement);