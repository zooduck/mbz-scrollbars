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

  /**
   * @static
   * @readonly
   * @type {string[]}
   */
  static get observedAttributes() {
    return [
      'always-on',
      'scroll-tap-behavior' // Not required to be in this list (included for readability)
    ];
  }

  /**
   * @method
   * @param {string} attributeName
   * @param {string|null} oldValue
   * @param {string|null} newValue
   * @returns {void}
   */
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

  /**
   * @method
   * @returns {void}
   */
  connectedCallback() {
    if (this.#hasRendered) {
      return;
    }
    this.render();
    this.isReady = true;
  }

  /**
   * @type {boolean}
   */
  get alwaysOn() {
    return this.hasAttribute('always-on');
  }

  set alwaysOn(value) {
    this.toggleAttribute('always-on', value);
  }

  /**
   * @type {boolean}
   */
  get isReady() {
    return this.#isReady;
  }

  set isReady(value) {
    this.#isReady = value;
    if (value) {
      this.#readyPromiseResolve();
    }
  }

  /**
   * @type {'relative'|'incremental'}
   */
  get scrollTapBehavior() {
    const scrollTapBehaviorAttributeValue = this.getAttribute('scroll-tap-behavior');

    return scrollTapBehaviorAttributeValue === this.#scrollTapBehaviors.RELATIVE
      ? scrollTapBehaviorAttributeValue
      : this.#scrollTapBehaviors.DEFAULT;
  }

  set scrollTapBehavior(value) {
    this.setAttribute('scroll-tap-behavior', value);
  }

  /**
   * @private
   * @readonly
   * @type {number}
   */
  get #incrementalHorizontalScrollPixels() {
    return this.#slottedElement.offsetWidth * HTMLMBZScrollbarsElement.#INCREMENTAL_SCROLL_RATIO;
  }

  /**
   * @private
   * @readonly
   * @type {number}
   */
  get #incrementalVerticalScrollPixels() {
    return this.#slottedElement.offsetHeight * HTMLMBZScrollbarsElement.#INCREMENTAL_SCROLL_RATIO;
  }

  /**
   * @private
   * @readonly
   * @type {HTMLElement}
   */
  get #scrollbarsElement() {
    return this.shadowRoot.getElementById('scrollbars');
  }

  /**
   * @private
   * @readonly
   * @type {HTMLElement}
   */
  get #scrollbarXElement() {
    return this.shadowRoot.getElementById('scrollbar-x');
  }

  /**
   * @private
   * @readonly
   * @type {HTMLElement}
   */
  get #scrollbarXControlSurfaceElement() {
    return this.shadowRoot.getElementById('scrollbar-x-control-surface');
  }

  /**
   * @private
   * @readonly
   * @type {number}
   */
  get #scrollbarXControlSurfaceElementOffsetLeft() {
    const transformMatrix = getComputedStyle(this.#scrollbarXControlSurfaceElement).getPropertyValue('transform').split(',');
    const transformX = parseFloat(transformMatrix[4]);
    return isNaN(transformX) ? 0 : transformX;
  }

  /**
   * @private
   * @readonly
   * @type {HTMLElement}
   */
  get #scrollbarYElement() {
    return this.shadowRoot.getElementById('scrollbar-y');
  }

  /**
   * @private
   * @readonly
   * @type {HTMLElement}
   */
  get #scrollbarYControlSurfaceElement() {
    return this.shadowRoot.getElementById('scrollbar-y-control-surface');
  }

  /**
   * @private
   * @readonly
   * @type {number}
   */
  get #scrollbarYControlSurfaceElementOffsetTop() {
    const transformMatrix = getComputedStyle(this.#scrollbarYControlSurfaceElement).getPropertyValue('transform').split(',');
    const transformY = parseFloat(transformMatrix[5]);
    return isNaN(transformY) ? 0 : transformY;
  }

  /**
   * @private
   * @readonly
   * @type {number}
   */
  get #scrollableHeight() {
    return this.#slottedElement.scrollHeight - this.#slottedElement.clientHeight;
  }

  /**
   * @private
   * @readonly
   * @type {number}
   */
  get #scrollableWidth() {
    return this.#slottedElement.scrollWidth - this.#slottedElement.clientWidth;
  }

  /**
   * @private
   * @readonly
   * @type {number}
   */
  get #horizontalScrollSpace() {
    return this.#scrollbarXElement.offsetWidth - this.#scrollbarXControlSurfaceElement.offsetWidth;
  }

  /**
   * @private
   * @readonly
   * @type {number}
   */
  get #verticalScrollSpace() {
    return this.#scrollbarYElement.offsetHeight - this.#scrollbarYControlSurfaceElement.offsetHeight;
  }

  /**
   * @method
   * @returns {Promise<void>}
   */
  ready() {
    return this.#readyPromise;
  }

  /**
   * @method
   * @returns {void}
   */
  render() {
    this.shadowRoot.innerHTML = '';
    this.shadowRoot.append(this.#createContent());
    this.#hasRendered = true;
  }

  /**
   * @method
   * @private
   * @returns {void}
   */
  #addEventListeners() {
    this.shadowRoot.addEventListener('slotchange', this.#onSlotChange.bind(this));
  }

  /**
   * @method
   * @private
   * @returns {void}
   */
  #addEventListenersToScrollbars() {
    this.#scrollbarXElement.addEventListener('mousedown', this.#onScrollbarMouseDown.bind(this));
    this.#scrollbarYElement.addEventListener('mousedown', this.#onScrollbarMouseDown.bind(this));
    this.#scrollbarXElement.addEventListener('selectstart', this.#preventDefault);
    this.#scrollbarYElement.addEventListener('selectstart', this.#preventDefault);
    this.#scrollbarXElement.addEventListener('dragstart', this.#preventDefault);
    this.#scrollbarYElement.addEventListener('dragstart', this.#preventDefault);
  }

  /**
   * @method
   * @private
   * @returns {void}
   */
  #addEventListenersToSlottedElement() {
    this.#slottedElement.addEventListener('scroll', this.#onSlottedElementScroll.bind(this));
    this.#slottedElement.addEventListener('input', this.#onSlottedElementInput.bind(this));
  }

  /**
   * @method
   * @private
   * @returns {void}
   */
  #addScrollbarXMouseMoveEventListener() {
    const onScrollbarXElementMouseMove = this.#onScrollbarXMouseMove.bind(this);

    document.addEventListener('mousemove', onScrollbarXElementMouseMove);

    document.onmouseup = () => {
      document.removeEventListener('mousemove', onScrollbarXElementMouseMove);
      this.#scrollbarXControlSurfaceElement.classList.remove('scrollbars__scrollbar-control-surface--active');
      this.#scrollbarsElement.classList.remove('scrollbars--active');
    };
  }

  /**
   * @method
   * @private
   * @returns {void}
   */
  #addScrollbarYMouseMoveEventListener() {
    const onScrollbarYElementMouseMove = this.#onScrollbarYMouseMove.bind(this);

    document.addEventListener('mousemove', onScrollbarYElementMouseMove);

    document.onmouseup = () => {
      document.removeEventListener('mousemove', onScrollbarYElementMouseMove);
      this.#scrollbarYControlSurfaceElement.classList.remove('scrollbars__scrollbar-control-surface--active');
      this.#scrollbarsElement.classList.remove('scrollbars--active');
    };
  }

  /**
   * @private
   * @method
   * @returns {void}
   */
  #addSlottedElementStylesToRootNode() {
    const rootNode = this.getRootNode();

    if (HTMLMBZScrollbarsElement.#rootNodesWithSlottedElementStyles.has(rootNode)) {
      return;
    }

    // ======================================================================================
    // Firefox supports "scrollbar-width: none" (which is W3C standard) whereas Chromium
    // browsers support a pseudo-element style "::-webkit-scrollbar { display: none }".
    // --------------------------------------------------------------------------------------
    // According to https://developer.mozilla.org/en-US/docs/Web/CSS/::-webkit-scrollbar
    // it would appear that ALL major browsers other than Firefox support
    // the non-standard ::-webkit-scrollbar pseudo-element and its associated
    // "display: none" CSS declaration).
    // --------------------------------------------------------------------------------------
    // There is currently an open ticket (since 2018) to add support for "scrollbar-width"
    // to Chromium: https://bugs.chromium.org/p/chromium/issues/detail?id=891944
    // ======================================================================================

    HTMLMBZScrollbarsElement.#slottedElementStyles.replaceSync(`
      .x-scroller-slotted {
        box-sizing: border-box !important;
        scrollbar-width: none !important; /* FIREFOX ONLY @ 29-01-2023 */
      }
      textarea.x-scroller-slotted {
        margin-top: 0; /* FIREFOX BUG */
      }
      .x-scroller-slotted::-webkit-scrollbar {
        display: none !important; /* ALL WEBKIT BROWSERS @ 29-01-2023 */
      }
    `);

    rootNode.adoptedStyleSheets.push(HTMLMBZScrollbarsElement.#slottedElementStyles);

    HTMLMBZScrollbarsElement.#rootNodesWithSlottedElementStyles.add(rootNode);
  }

  /**
   * @method
   * @private
   * @returns {void}
   */
  #adjustSlottedElementMarginBottom() {
    // ====================================================================================================
    // This is to solve an issue with slotted elements that have a display of "inline-block". If you place
    // an element with a display of "inline-block" inside another element, the parent element will be
    // marginally greater than the child (i.e. the block-container element of this component will have a
    // greater height than the slotted element).
    // ====================================================================================================
    const heightDifference = this.#scrollbarsElement.clientHeight - this.#slottedElement.clientHeight;
    if (heightDifference) {
      const slottedElementCurrentMarginBottom = parseFloat(getComputedStyle(this.#slottedElement).getPropertyValue('margin-bottom'));
      this.#slottedElement.style.marginBottom = slottedElementCurrentMarginBottom + (heightDifference * -1) + 'px';
    }
  }

  /**
   * @method
   * @private
   * @returns {void}
   */
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

  /**
   * @method
   * @private
   * @returns {boolean}
   */
  #canSlottedElementScrollHorizontally() {
    const { clientWidth, scrollWidth } = this.#slottedElement;
    return scrollWidth > clientWidth;
  }

  /**
   * @method
   * @private
   * @returns {boolean}
   */
  #canSlottedElementScrollVertically() {
    const { clientHeight, scrollHeight } = this.#slottedElement;
    return scrollHeight > clientHeight;
  }

  /**
   * @method
   * @private
   * @returns {HTMLElement}
   */
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

  /**
   * @method
   * @private
   * @param {HTMLElement}
   * @returns {{offsetLeft: number, offsetTop: number}}
   */
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

  /**
   * @method
   * @private
   * @param {HTMLElement} element
   * @returns {'dark'|'light'|undefined}
   */
  #getBackgroundColorBrightnessFromElement = (element) => {
    const TRANSPARENT_RGBA_COLOR_PATTERN = /rgba\(0, ?0, ?0, ?0/;
    const { backgroundColor } = getComputedStyle(element);

    if (TRANSPARENT_RGBA_COLOR_PATTERN.test(backgroundColor)) {
      if (element.parentNode.nodeType === document.ELEMENT_NODE) {
        return this.#getBackgroundColorBrightnessFromElement(element.parentNode);
      } else if (element.parentNode.nodeType === document.DOCUMENT_FRAGMENT_NODE) {
        return this.#getBackgroundColorBrightnessFromElement(element.parentNode.host);
      }
      // -----------------------------------------------------------------------------
      // Return undefined if no computed background-color can be found on any parent.
      // -----------------------------------------------------------------------------
      return;
    }

    const rgbValues = backgroundColor.replace(/rgba?\(|\)/g, '').split(',').slice(0, 3);
    const combinedRGBValues = rgbValues.reduce((previousValue, currentValue) => {
      return parseFloat(previousValue) + parseFloat(currentValue);
    });

    return combinedRGBValues > (255 * 3 / 2) ? 'light' : 'dark';
  };

  /**
   * @method
   * @private
   * @param {MouseEvent} event
   * @returns {void}
   */
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

  /**
   * @method
   * @private
   * @param {number} relativeClientX
   * @returns {void}
   */
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

  /**
   * @method
   * @private
   * @param {MouseEvent} event
   * @returns {void}
   */
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

  /**
   * @method
   * @private
   * @param {number} relativeClientY
   * @returns {void}
   */
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

  /**
   * @method
   * @private
   * @param {MouseEvent} event
   * @returns {void}
   */
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

  /**
   * @method
   * @private
   * @param {Event} event
   * @returns {void}
   */
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

  /**
   * @method
   * @private
   * @param {Event} event
   * @returns {void}
   */
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

  /**
   * @method
   * @private
   * @param {Event} event
   * @returns {void}
   */
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

  /**
   * @method
   * @private
   * @param {Event} event
   * @returns {void}
   */
  #preventDefault(event) {
    event.preventDefault();
  }

  /**
   * @method
   * @private
   * @returns {void}
   */
  #reflectSlottedElementStyles() {
    this.#reflectSlottedElementBorderStyle();
    this.#reflectSlottedElementDisplayStyle();
    this.#reflectSlottedElementOverflowStyle();
  }

  /**
   * @method
   * @private
   * @returns {void}
   */
  #reflectSlottedElementBorderStyle() {
    this.#scrollbarsElement.style.border = getComputedStyle(this.#slottedElement).getPropertyValue('border');
    this.#slottedElement.style.border = 'none';
  }

  /**
   * @method
   * @private
   * @returns {void}
   */
  #reflectSlottedElementDisplayStyle() {
    this.style.setProperty('display', getComputedStyle(this.#slottedElement).getPropertyValue('display'));
  }

  /**
   * @method
   * @private
   * @returns {void}
   */
  #reflectSlottedElementOverflowStyle() {
    const [overflowX, overflowY] = getComputedStyle(this.#slottedElement).getPropertyValue('overflow').split(' ');
    this.#scrollbarXElement.classList.add(`scrollbars__scrollbar--overflow-${overflowX}`);
    this.#scrollbarYElement.classList.add(`scrollbars__scrollbar--overflow-${overflowY || overflowX}`);
  }

  /**
   * @method
   * @private
   * @returns {void}
   */
  #setupResizeObserver() {
    if (this.#slottedElementResizeObserver) {
      this.#slottedElementResizeObserver.disconnect();
    }

    this.#slottedElementResizeObserver = new ResizeObserver(() => {
      this.#setScrollbarStyles();
      this.#setScrollbarControlSurfaceDimensions();
    });
  }

  /**
   * @method
   * @private
   * @returns {void}
   */
  #setScrollbarVisibility() {
    this.#scrollbarXElement.classList.toggle('scrollbars__scrollbar--can-scroll', this.#canSlottedElementScrollHorizontally());
    this.#scrollbarYElement.classList.toggle('scrollbars__scrollbar--can-scroll', this.#canSlottedElementScrollVertically());
  }

  /**
   * Must be called AFTER #setScrollbarVisibility()!
   *
   * @method
   * @private
   * @returns {void}
   */
  #setScrollbarDimensions() {
    const scrollbarXElementDisplay = getComputedStyle(this.#scrollbarXElement).display;
    const scrollbarYElementDisplay = getComputedStyle(this.#scrollbarYElement).display;
    this.#scrollbarXElement.classList.toggle('scrollbars__scrollbar--fullsize', scrollbarYElementDisplay !== 'block' && scrollbarXElementDisplay === 'block');
    this.#scrollbarYElement.classList.toggle('scrollbars__scrollbar--fullsize', scrollbarXElementDisplay !== 'block' && scrollbarYElementDisplay === 'block');
  }

  /**
   * @method
   * @private
   * @returns {void}
   */
  #setScrollbarStyles() {
    this.#setScrollbarVisibility();
    this.#setScrollbarDimensions();
    this.#adjustSlottedElementPadding();
  }

  /**
   * @method
   * @private
   * @returns {void}
   */
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

  /**
   * @method
   * @private
   * @returns {void}
   */
  #setScrollbarsTheme() {
    const slottedElementBakcgroundColorBrightness = this.#getBackgroundColorBrightnessFromElement(this.#slottedElement);
    this.#scrollbarsElement.classList.toggle('scrollbars--light-on-dark', slottedElementBakcgroundColorBrightness === 'dark');
  }
}

customElements.define('mbz-scrollbars', HTMLMBZScrollbarsElement);
