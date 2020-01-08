define(['browser', 'layoutManager', 'dom', 'focusManager', 'scrollStyles'], function (browser, layoutManager, dom, focusManager) {
    'use strict';

    /**
* Return type of the value.
*
* @param  {Mixed} value
*
* @return {String}
*/
    function type(value) {
        if (value == null) {
            return String(value);
        }

        if (typeof value === 'object' || typeof value === 'function') {
            return Object.prototype.toString.call(value).match(/\s([a-z]+)/i)[1].toLowerCase() || 'object';
        }

        return typeof value;
    }

    /**
	 * Disables an event it was triggered on and unbinds itself.
	 *
	 * @param  {Event} event
	 *
	 * @return {Void}
	 */
    function disableOneEvent(event) {
        /*jshint validthis:true */
        event.preventDefault();
        event.stopPropagation();
        this.removeEventListener(event.type, disableOneEvent);
    }

    /**
	 * Make sure that number is within the limits.
	 *
	 * @param {Number} number
	 * @param {Number} min
	 * @param {Number} max
	 *
	 * @return {Number}
	 */
    function within(number, min, max) {
        return number < min ? min : number > max ? max : number;
    }

    function onFrameClick(e) {
        if (e.which === 1) {
            var focusableParent = focusManager.focusableParent(e.target);
            if (focusableParent && focusableParent !== document.activeElement) {
                focusableParent.focus();
            }
        }
    }

    function onFocus(e) {

        var focused = focusManager.focusableParent(e.target);

        if (focused) {
            this.toCenter(focused);
        }
    }

    function resetScrollTop() {
        this.scrollTop = 0;
    }

    function getBoundingClientRect(elem) {

        // Support: BlackBerry 5, iOS 3 (original iPhone)
        // If we don't have gBCR, just use 0,0 rather than error
        if (elem.getBoundingClientRect) {
            return elem.getBoundingClientRect();
        } else {
            return { top: 0, left: 0 };
        }
    }

    /**
     * Mouse wheel delta normalization.
     *
     * @param  {Event} event
     *
     * @return {Int}
     */
    function normalizeWheelDelta(event, instance) {

        var options = instance.options;

        // wheelDelta needed only for IE8-
        instance.currentDelta = ((options.horizontal ? event.deltaY || event.deltaX : event.deltaY) || -event.wheelDelta);

        if (!options.enableNativeScroll) {
            instance.currentDelta /= event.deltaMode === 1 ? 3 : 100;
        }
        return instance.currentDelta;
    }

    // Other global values
    var wheelEvent = (document.implementation.hasFeature('Event.wheel', '3.0') ? 'wheel' : 'mousewheel');
    var interactiveElements = ['INPUT', 'SELECT', 'TEXTAREA'];

    // Math shorthands
    var abs = Math.abs;
    var sqrt = Math.sqrt;
    var pow = Math.pow;
    var round = Math.round;

    /**
     * Check whether element is interactive.
     *
     * @return {Boolean}
     */
    function isInteractive(element) {

        while (element) {

            if (interactiveElements.indexOf(element.tagName) !== -1) {
                return true;
            }

            element = element.parentNode;
        }
        return false;
    }

    function sibling(n, elem) {
        var matched = [];

        for (; n; n = n.nextSibling) {
            if (n.nodeType === 1 && n !== elem) {
                matched.push(n);
            }
        }
        return matched;
    }

    var isSmoothScrollSupported = 'scrollBehavior' in document.documentElement.style;

    function Scroller(frame, options) {

        // Extend options
        var o = Object.assign({}, {
            slidee: null, // Selector, DOM element, or jQuery object with DOM element representing SLIDEE.
            horizontal: false, // Switch to horizontal mode.

            // Scrolling
            mouseWheel: true,
            scrollBy: 0, // Pixels or items to move per one mouse scroll. 0 to disable scrolling

            // Dragging
            dragSource: null, // Selector or DOM element for catching dragging events. Default is FRAME.
            mouseDragging: 1, // Enable navigation by dragging the SLIDEE with mouse cursor.
            touchDragging: 1, // Enable navigation by dragging the SLIDEE with touch events.
            dragThreshold: 3, // Distance in pixels before Sly recognizes dragging.
            intervactive: null, // Selector for special interactive elements.

            // Mixed options
            speed: 0, // Animations speed in milliseconds. 0 to disable animations.

        }, options);

        // native scroll is a must with touch input
        // also use native scroll when scrolling vertically in desktop mode - excluding horizontal because the mouse wheel support is choppy at the moment
        // in cases with firefox, if the smooth scroll api is supported then use that because their implementation is very good
        if (o.allowNativeScroll === false) {
            o.enableNativeScroll = false;
        }
        else if (isSmoothScrollSupported && ((browser.firefox && !layoutManager.tv) || o.allowNativeSmoothScroll)) {
            // native smooth scroll
            o.enableNativeScroll = true;
        }
        else if (o.requireAnimation && (browser.animate || browser.supportsCssAnimation())) {

            // transform is the only way to guarantee animation
            o.enableNativeScroll = false;
        }
        else if (!layoutManager.tv || !browser.animate) {

            o.enableNativeScroll = true;
        }

        // Need this for the magic wheel. With the animated scroll the magic wheel will run off of the screen
        if (browser.web0s) {
            o.enableNativeScroll = true;
        }

        // Private variables
        this.options = o;

        // Frame
        var slideeElement = o.slidee ? o.slidee : sibling(frame.firstChild)[0];
        this._pos = {
            start: 0,
            center: 0,
            end: 0,
            cur: 0,
            dest: 0
        };

        // Miscellaneous
        this.dragSourceElement = o.dragSource ? o.dragSource : frame;
        this.currentDelta = 0;

        // Expose properties
        this.initialized = 0;
        this.slideeElement = slideeElement;
        this.options = o;
        this.dragging = {
            released: 1
        };
        this.contentRect = {};

        // This is for the scroll buttons. Look for a better way to avoid the inconsistency
        var nativeScrollElement = o.horizontal ? slideeElement || frame : frame;
        this.nativeScrollElement = nativeScrollElement;
        this.frame = frame;

        this.requiresReflow = true;

        this.frameSize = 0;
        this.slideeSize = 0;
    }

    function onResize(entries) {

        var entry = entries[0];

        if (entry) {

            var newRect = entry.contentRect;

            // handle element being hidden
            if (newRect.width === 0 || newRect.height === 0) {
                return;
            }

            var contentRect = this.contentRect;

            if (this.options.horizontal) {

                if (newRect.width !== contentRect.width) {

                    this.contentRect = newRect;
                    load(this, false);
                }

            } else {

                if (newRect.height !== contentRect.height) {

                    this.contentRect = newRect;
                    load(this, false);
                }
            }
        }
    }

    /**
     * Loading function.
     *
     * Populate arrays, set sizes, bind events, ...
     *
     * @param {Boolean} [isInit] Whether load is called from within instance.init().
     * @return {Void}
     */
    function load(instance, isInit) {

        instance.requiresReflow = true;

        if (!isInit) {

            instance.ensureSizeInfo();

            // Fix possible overflowing
            var pos = instance._pos;
            instance.slideTo(within(pos.dest, pos.start, pos.end));
        }
    }

    /**
     * Stops dragging and cleans up after it.
     *
     * @return {Void}
     */
    function onDragEnd(instance) {

        var dragging = instance.dragging;

        dragging.released = true;

        var dragHandler = instance.dragHandler;
        if (dragHandler) {
            dom.removeEventListener(document, 'pointermove', dragHandler, {
                passive: true
            });
            dom.removeEventListener(document, 'pointerup', dragHandler, {
                passive: true
            });
        }

        // Make sure that disableOneEvent is not active in next tick.
        setTimeout(function () {
            dragging.source.removeEventListener('click', disableOneEvent);
        });

        dragging.init = 0;
    }

    /**
     * Handler for dragging scrollbar handle or SLIDEE.
     *
     * @param  {Event} event
     *
     * @return {Void}
     */
    function dragHandler(event) {

        var dragging = this.dragging;
        var options = this.options;

        dragging.released = event.type === 'pointerup';
        var pointer = dragging.touch ? event[dragging.released ? 'changedTouches' : 'touches'][0] : event;
        dragging.pathX = pointer.pageX - dragging.initX;
        dragging.pathY = pointer.pageY - dragging.initY;
        dragging.path = sqrt(pow(dragging.pathX, 2) + pow(dragging.pathY, 2));
        dragging.delta = options.horizontal ? dragging.pathX : dragging.pathY;

        if (!dragging.released && dragging.path < 1) {
            return;
        }

        // We haven't decided whether this is a drag or not...
        if (!dragging.init) {
            // If the drag path was very short, maybe it's not a drag?
            if (dragging.path < options.dragThreshold) {
                // If the pointer was released, the path will not become longer and it's
                // definitely not a drag. If not released yet, decide on next iteration
                return dragging.released ? onDragEnd(this) : undefined;
            } else {
                // If dragging path is sufficiently long we can confidently start a drag
                // if drag is in different direction than scroll, ignore it
                if (options.horizontal ? abs(dragging.pathX) > abs(dragging.pathY) : abs(dragging.pathX) < abs(dragging.pathY)) {
                    dragging.init = 1;
                } else {
                    return onDragEnd(this);
                }
            }
        }

        //event.preventDefault();

        // Disable click on a source element, as it is unwelcome when dragging
        if (!dragging.locked && dragging.path > dragging.pathToLock) {
            dragging.locked = 1;
            dragging.source.addEventListener('click', disableOneEvent);
        }

        // Cancel dragging on release
        if (dragging.released) {
            onDragEnd(this);
        }

        this.slideTo(dragging.initPos - dragging.delta);
    }

    function onDragStart(event) {

        var isTouch = event.type === 'touchstart';

        var dragging = this.dragging;

        // Ignore when already in progress, or interactive element in non-touch navivagion
        if (dragging.init || !isTouch && isInteractive(event.target)) {
            return;
        }

        var options = this.options;

        // SLIDEE dragging conditions
        if (!(isTouch ? options.touchDragging : options.mouseDragging && event.which < 2)) {
            return;
        }

        if (!isTouch) {
            // prevents native image dragging in Firefox
            event.preventDefault();
        }

        // Reset dragging object
        dragging.released = 0;

        // Properties used in dragHandler
        dragging.init = 0;
        dragging.source = event.target;
        dragging.touch = isTouch;
        var pointer = isTouch ? event.touches[0] : event;
        dragging.initX = pointer.pageX;
        dragging.initY = pointer.pageY;
        dragging.initPos = this._pos.cur;
        dragging.start = +new Date();
        dragging.time = 0;
        dragging.path = 0;
        dragging.delta = 0;
        dragging.locked = 0;
        dragging.pathToLock = isTouch ? 30 : 10;

        // Bind dragging events
        if (!options.enableNativeScroll) {

            var thisDragHandler = this.dragHandler;

            dom.addEventListener(document, 'pointermove', thisDragHandler, {
                passive: true
            });
            dom.addEventListener(document, 'pointerup', thisDragHandler, {
                passive: true
            });
        }
    }

    /**
     * Initialize.
     *
     * @return {Object}
     */
    Scroller.prototype.init = function () {

        if (this.initialized) {
            return;
        }

        var options = this.options;

        var frame = this.frame;

        if (options.enableNativeScroll) {

            var nativeScrollElement = this.nativeScrollElement;

            if (options.horizontal) {
                if (layoutManager.desktop && !options.hideScrollbar) {
                    nativeScrollElement.classList.add('scrollX');
                } else {
                    nativeScrollElement.classList.add('scrollX');
                    nativeScrollElement.classList.add('hiddenScrollX');

                    if (layoutManager.tv && options.allowNativeSmoothScroll !== false) {
                        nativeScrollElement.classList.add('smoothScrollX');
                    }
                }
            } else {
                if (layoutManager.desktop && !options.hideScrollbar) {
                    nativeScrollElement.classList.add('scrollY');
                } else {
                    nativeScrollElement.classList.add('scrollY');
                    nativeScrollElement.classList.add('hiddenScrollY');

                    if (layoutManager.tv && options.allowNativeSmoothScroll !== false) {
                        nativeScrollElement.classList.add('smoothScrollY');
                    }
                }
            }
        } else {
            frame.style.overflow = 'hidden';

            var slideeElement = this.slideeElement;

            slideeElement.style['will-change'] = 'transform';
            slideeElement.style.transition = 'transform ' + options.speed + 'ms ease-out';

            if (options.horizontal) {
                slideeElement.classList.add('animatedScrollX');
            } else {
                slideeElement.classList.add('animatedScrollY');
            }
        }

        var dragStartHandler = onDragStart.bind(this);
        this.dragStartHandler = dragStartHandler;

        if (!options.enableNativeScroll || layoutManager.tv) {
            // This can prevent others from being able to listen to mouse events
            dom.addEventListener(this.dragSourceElement, 'mousedown', dragStartHandler, {
                //passive: true
            });
        }

        var selfScrollHandler;

        if (options.mouseWheel) {
            selfScrollHandler = scrollHandler.bind(this);
            this.scrollHandler = selfScrollHandler;
        }


        if (!options.enableNativeScroll) {

            this.frameResizeObserver = new ResizeObserver(onResize.bind(this), {});
            this.frameResizeObserver.observe(frame);

            dom.addEventListener(this.dragSourceElement, 'touchstart', dragStartHandler, {
                passive: true
            });

            if (!options.horizontal) {
                dom.addEventListener(frame, 'scroll', resetScrollTop, {
                    passive: true
                });
            }

            if (options.mouseWheel) {
                // Scrolling navigation
                dom.addEventListener(frame, wheelEvent, selfScrollHandler, {
                    passive: true
                });
            }

        } else if (options.horizontal) {

            // Don't bind to mouse events with vertical scroll since the mouse wheel can handle this natively

            if (options.mouseWheel) {
                // Scrolling navigation
                dom.addEventListener(frame, wheelEvent, selfScrollHandler, {
                    passive: true
                });
            }
        }

        if (layoutManager.tv) {
            dom.addEventListener(frame, 'click', onFrameClick, {
                passive: true,
                capture: true
            });

            if (options.centerFocus) {

                var focusHandler = this.focusHandler = onFocus.bind(this);

                dom.addEventListener(frame, 'focus', focusHandler, {
                    capture: true,
                    passive: true
                });
            }
        }

        // save this for later
        this.dragHandler = dragHandler.bind(this);

        // Mark instance as initialized
        this.initialized = 1;

        // Load
        load(this, true);

        // Return instance
        return this;
    };

    /**
     * Mouse scrolling handler.
     *
     * @param  {Event} event
     *
     * @return {Void}
     */
    function scrollHandler(event) {

        this.ensureSizeInfo();

        var pos = this._pos;

        var options = this.options;
        var scrollBy = options.scrollBy;

        // Ignore if there is no scrolling to be done
        if (!scrollBy || pos.start === pos.end) {
            return;
        }

        var delta = normalizeWheelDelta(event, this);

        if (options.enableNativeScroll) {

            if (isSmoothScrollSupported) {
                delta *= 12;
            }

            if (options.horizontal) {
                this.nativeScrollElement.scrollLeft += delta;
            } else {
                this.nativeScrollElement.scrollTop += delta;
            }

        } else {
            // Trap scrolling only when necessary and/or requested
            if (delta > 0 && pos.dest < pos.end || delta < 0 && pos.dest > pos.start) {
                //stopDefault(event, 1);
            }

            this.slideBy(scrollBy * delta);
        }
    }

    function nativeScrollTo(container, pos, immediate, scrollerOptions) {

        if (container.scroll) {
            if (scrollerOptions.horizontal) {

                container.scroll({
                    left: pos,
                    behavior: immediate ? 'instant' : 'smooth'
                });
            } else {

                container.scroll({
                    top: pos,
                    behavior: immediate ? 'instant' : 'smooth'
                });
            }
        }
        else if (!immediate && container.scrollTo) {
            if (scrollerOptions.horizontal) {
                container.scrollTo(Math.round(pos), 0);
            } else {
                container.scrollTo(0, Math.round(pos));
            }
        } else {
            if (scrollerOptions.horizontal) {
                container.scrollLeft = Math.round(pos);
            } else {
                container.scrollTop = Math.round(pos);
            }
        }
    }

    function setStyleProperty(elem, name, value, speed, resetTransition) {

        var style = elem.style;

        if (resetTransition || browser.edge) {
            style.transition = 'none';
            void elem.offsetWidth;
        }

        style.transition = 'transform ' + speed + 'ms ease-out';
        style[name] = value;
    }

    function dispatchScrollEventIfNeeded(instance) {
        if (instance.options.dispatchScrollEvent) {
            instance.frame.dispatchEvent(new CustomEvent(instance.getScrollEventName(), {
                bubbles: true,
                cancelable: false
            }));
        }
    }

    function renderAnimateWithTransform(instance, fromPosition, toPosition, immediate) {

        var options = instance.options;

        var speed = options.speed;

        if (immediate) {
            speed = options.immediateSpeed || 50;
        }

        if (options.horizontal) {
            setStyleProperty(instance.slideeElement, 'transform', 'translateX(' + (-round(toPosition)) + 'px)', speed);
        } else {
            setStyleProperty(instance.slideeElement, 'transform', 'translateY(' + (-round(toPosition)) + 'px)', speed);
        }
        instance._pos.cur = toPosition;

        dispatchScrollEventIfNeeded(instance);
    }

    /**
      * Animate to a position.
      *
      * @param {Int}  newPos    New position.
      * @param {Bool} immediate Reposition immediately without an animation.
      *
      * @return {Void}
      */
    Scroller.prototype.slideTo = function (newPos, immediate, fullItemPos) {

        this.ensureSizeInfo();
        var pos = this._pos;

        newPos = within(newPos, pos.start, pos.end);

        var options = this.options;

        if (options.enableNativeScroll) {

            nativeScrollTo(this.nativeScrollElement, newPos, immediate, options);
            return;
        }

        // Update the animation object
        var from = pos.cur;
        immediate = immediate || this.dragging.init || !options.speed;

        var now = Date.now();

        if (options.autoImmediate && immediate !== false) {
            if (!immediate && (now - (this.lastAnimate || 0)) <= 50) {
                immediate = true;
            }
        }

        if (!immediate && options.skipSlideToWhenVisible && fullItemPos && fullItemPos.isVisible) {

            return;
        }

        // Start animation rendering
        if (newPos !== pos.dest) {
            pos.dest = newPos;

            renderAnimateWithTransform(this, from, newPos, immediate);

            this.lastAnimate = now;
        }
    };

    /**
     * Returns the position object.
     *
     * @param {Mixed} item
     *
     * @return {Object}
     */
    Scroller.prototype.getPos = function (item) {

        var options = this.options;

        var nativeScrollElement = this.nativeScrollElement;

        var scrollElement = options.enableNativeScroll ? nativeScrollElement : this.slideeElement;
        var slideeOffset = getBoundingClientRect(scrollElement);
        var itemOffset = getBoundingClientRect(item);

        var slideeStartPos = options.horizontal ? slideeOffset.left : slideeOffset.top;
        var slideeEndPos = options.horizontal ? slideeOffset.right : slideeOffset.bottom;

        var offset = options.horizontal ? itemOffset.left - slideeOffset.left : itemOffset.top - slideeOffset.top;

        var size = options.horizontal ? itemOffset.width : itemOffset.height;
        if (!size && size !== 0) {
            size = item[options.horizontal ? 'offsetWidth' : 'offsetHeight'];
        }

        var centerOffset = options.centerOffset || 0;

        if (options.enableNativeScroll) {
            centerOffset = 0;
            if (options.horizontal) {
                offset += nativeScrollElement.scrollLeft;
            } else {
                offset += nativeScrollElement.scrollTop;
            }
        }

        this.ensureSizeInfo();

        var frameSize = this.frameSize;
        var currentStart = this._pos.cur;
        var currentEnd = currentStart + frameSize;

        //console.log('offset:' + offset + ' currentStart:' + currentStart + ' currentEnd:' + currentEnd);
        var isVisible = offset >= currentStart && (offset + size) <= currentEnd;

        return {
            start: offset,
            center: offset + centerOffset - (frameSize / 2) + (size / 2),
            end: offset - frameSize + size,
            size: size,
            isVisible: isVisible
        };
    };

    Scroller.prototype.ensureSizeInfo = function () {

        if (this.requiresReflow) {

            this.requiresReflow = false;

            // Reset global variables

            var frame = this.frame;
            var options = this.options;

            this.frameSize = options.horizontal ? frame.offsetWidth : frame.offsetHeight;

            var slideeElement = this.slideeElement;

            this.slideeSize = options.scrollWidth || Math.max(slideeElement[options.horizontal ? 'offsetWidth' : 'offsetHeight'], slideeElement[options.horizontal ? 'scrollWidth' : 'scrollHeight']);

            // Set position limits & relativess
            this._pos.end = Math.max(this.slideeSize - this.frameSize, 0);
        }
    };

    Scroller.prototype.getScrollEventName = function () {
        return this.options.enableNativeScroll ? 'scroll' : 'scrollanimate';
    };

    Scroller.prototype.getScrollSlider = function () {
        return this.slideeElement;
    };

    Scroller.prototype.addScrollEventListener = function (fn, options) {

        var elem = this.options.enableNativeScroll ? this.nativeScrollElement : this.frame;

        dom.addEventListener(elem, this.getScrollEventName(), fn, options);
    };

    Scroller.prototype.removeScrollEventListener = function (fn, options) {

        var elem = this.options.enableNativeScroll ? this.nativeScrollElement : this.frame;

        dom.removeEventListener(elem, this.getScrollEventName(), fn, options);
    };

    Scroller.prototype.getCenterPosition = function (item) {

        this.ensureSizeInfo();

        var pos = this.getPos(item);
        return within(pos.center, pos.start, pos.end);
    };

    Scroller.prototype.getScrollPosition = function () {

        var options = this.options;

        if (!options.enableNativeScroll) {
            return this._pos.cur;
        }

        if (options.horizontal) {
            return this.nativeScrollElement.scrollLeft;
        } else {
            return this.nativeScrollElement.scrollTop;
        }
    };

    Scroller.prototype.getScrollSize = function () {

        var options = this.options;

        if (!options.enableNativeScroll) {
            return this.slideeSize;
        }

        if (options.horizontal) {
            return this.nativeScrollElement.scrollWidth;
        } else {
            return this.nativeScrollElement.scrollHeight;
        }
    };

    /**
     * Slide SLIDEE by amount of pixels.
     *
     * @param {Int}  delta     Pixels/Items. Positive means forward, negative means backward.
     * @param {Bool} immediate Reposition immediately without an animation.
     *
     * @return {Void}
     */
    Scroller.prototype.slideBy = function (delta, immediate) {
        if (!delta) {
            return;
        }
        this.slideTo(this._pos.dest + delta, immediate);
    };

    /**
     * Core method for handling `toLocation` methods.
     *
     * @param  {String} location
     * @param  {Mixed}  item
     * @param  {Bool}   immediate
     *
     * @return {Void}
     */
    Scroller.prototype.to = function (location, item, immediate) {
        // Optional arguments logic
        if (type(item) === 'boolean') {
            immediate = item;
            item = undefined;
        }

        if (item === undefined) {
            this.slideTo(this._pos[location], immediate);
        } else {

            //if (this.options.enableNativeScroll) {

            //    item.scrollIntoView({ block: 'center', inline: 'center' });
            //    return;
            //}

            var itemPos = this.getPos(item);

            if (itemPos) {
                this.slideTo(itemPos[location], immediate, itemPos);
            }
        }
    };

    /**
     * Animate element or the whole SLIDEE to the start of the frame.
     *
     * @param {Mixed} item      Item DOM element, or index starting at 0. Omitting will animate SLIDEE.
     * @param {Bool}  immediate Reposition immediately without an animation.
     *
     * @return {Void}
     */
    Scroller.prototype.toStart = function (item, immediate) {
        this.to('start', item, immediate);
    };

    /**
     * Animate element or the whole SLIDEE to the end of the frame.
     *
     * @param {Mixed} item      Item DOM element, or index starting at 0. Omitting will animate SLIDEE.
     * @param {Bool}  immediate Reposition immediately without an animation.
     *
     * @return {Void}
     */
    Scroller.prototype.toEnd = function (item, immediate) {
        this.to('end', item, immediate);
    };

    /**
     * Animate element or the whole SLIDEE to the center of the frame.
     *
     * @param {Mixed} item      Item DOM element, or index starting at 0. Omitting will animate SLIDEE.
     * @param {Bool}  immediate Reposition immediately without an animation.
     *
     * @return {Void}
     */
    Scroller.prototype.toCenter = function (item, immediate) {
        this.to('center', item, immediate);
    };

    /**
     * Destroys instance and everything it created.
     *
     * @return {Void}
     */
    Scroller.prototype.destroy = function () {

        if (this.frameResizeObserver) {
            this.frameResizeObserver.disconnect();
            this.frameResizeObserver = null;
        }

        var frame = this.frame;
        var dragSourceElement = this.dragSourceElement;

        // Reset native FRAME element scroll
        dom.removeEventListener(frame, 'scroll', resetScrollTop, {
            passive: true
        });

        var selfScrollHandler = this.scrollHandler;

        if (selfScrollHandler) {
            dom.removeEventListener(frame, wheelEvent, selfScrollHandler, {
                passive: true
            });
        }

        var dragStartHandler = this.dragStartHandler;
        if (dragStartHandler) {
            dom.removeEventListener(dragSourceElement, 'touchstart', dragStartHandler, {
                passive: true
            });
            dom.removeEventListener(dragSourceElement, 'mousedown', dragStartHandler, {
                //passive: true
            });
        }

        var focusHandler = this.focusHandler;
        if (focusHandler) {
            dom.removeEventListener(frame, 'focus', focusHandler, {
                capture: true,
                passive: true
            });
        }

        dom.removeEventListener(frame, 'click', onFrameClick, {
            passive: true,
            capture: true
        });


        this.scrollHandler = null;
        this.dragSourceElement = null;
        this.initialized = null;
        this.nativeScrollElement = null;
        this.frame = null;
        this.options = null;
        this.slideeSize = null;
        this._pos = null;
        this.requiresReflow = null;
        this.frameSize = null;
        this.lastAnimate = null;
        this.dragging = null;
        this.contentRect = null;
        this.dragHandler = null;
        this.dragStartHandler = null;

        return this;
    };

    Scroller.create = function (frame, options) {
        var instance = new Scroller(frame, options);
        return Promise.resolve(instance);
    };

    return Scroller;
});