/*!
 * headroom.js v0.7.0 - Give your page some headroom. Hide your header until you need it
 * Copyright (c) 2014 Nick Williams - http://wicky.nillia.ms/headroom.js
 * License: MIT
 */

define(['dom', 'layoutManager', 'browser', 'apphost', 'events', 'css!./headroom'], function (dom, layoutManager, browser, appHost, events) {

    'use strict';

    /* exported features */

    var requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame;

    function onHeadroomClearedExternally() {
        this.transform = null;
    }

    function onHeadroomForceClearedExternally() {
        this.transform = null;
        this.setTransform(0);
    }

    var windowInsetTop = 0;

    function onWindowInsetsChanged(e, insets) {
        windowInsetTop = insets.top;
    }

    var enableDebouncing = false;

    /**
   * UI enhancement for fixed headers.
   * Hides header when scrolling down
   * Shows header when scrolling up
   * @constructor
   * @param {DOMElement} elem the header element
   * @param {Object} options options for the widget
   */
    function Headroom(elems, options) {

        options = options || {};

        this.lastScrollY = 0;
        this.elems = elems;

        this.scrollElementForEvents = options.scroller || window;
        this.scroller = /*options.scroller || document.scrollingElement ||*/ this.scrollElementForEvents;

        this.updateFn = this.update.bind(this);
        this.onScroll = onScroll.bind(this);
        this.offset = options.offset;
        this.initialised = false;
    }

    function onScroll(e) {
        if (!this.scrolled) {
            requestAnimationFrame(this.updateFn);
            this.scrolled = true;
        }
    }

    Headroom.prototype = {
        constructor: Headroom,

        /**
         * Initialises the widget
         */
        init: function () {

            if (appHost.getWindowInsets) {
                windowInsetTop = appHost.getWindowInsets().top;
            }

            events.on(appHost, 'windowinsetschanged', onWindowInsetsChanged);

            this.onHeadroomClearedExternallyFn = onHeadroomClearedExternally.bind(this);
            this.onHeadroomForceClearedExternallyFn = onHeadroomForceClearedExternally.bind(this);

            var elems = this.elems;
            this.elems = [];

            for (var i = 0, length = elems.length; i < length; i++) {

                this.add(elems[i]);
            }

            return this;
        },

        add: function (elem) {

            var elems = this.elems;

            if (browser.supportsCssAnimation() && elems.indexOf(elem) === -1) {
                this.initElem(elem);
                elems.push(elem);

                this.attachEvent();
            }
        },

        initElem: function (elem) {
            elem.classList.add('headroom');

            var onHeadroomClearedExternallyFn = this.onHeadroomClearedExternallyFn;
            var onHeadroomForceClearedExternallyFn = this.onHeadroomForceClearedExternallyFn;

            elem.addEventListener('clearheadroom', onHeadroomClearedExternallyFn);
            elem.addEventListener('forceclearheadroom', onHeadroomForceClearedExternallyFn);
        },

        remove: function (elem) {

            elem.classList.remove('headroom');

            var onHeadroomClearedExternallyFn = this.onHeadroomClearedExternallyFn;
            var onHeadroomForceClearedExternallyFn = this.onHeadroomForceClearedExternallyFn;

            elem.removeEventListener('clearheadroom', onHeadroomClearedExternallyFn);
            elem.removeEventListener('forceclearheadroom', onHeadroomForceClearedExternallyFn);

            var i = this.elems.indexOf(elem);
            if (i !== -1) {
                this.elems.splice(i, 1);
            }
        },

        pause: function () {
            this.paused = true;
        },

        resume: function () {
            this.paused = false;
        },

        /**
         * Unattaches events and removes any classes that were added
         */
        destroy: function () {

            events.off(appHost, 'windowinsetschanged', onWindowInsetsChanged);

            this.initialised = false;
            this.lastScrollY = null;

            for (var i = 0, length = this.elems.length; i < length; i++) {

                var classList = this.elems[i].classList;

                classList.remove('headroom');
            }

            var scroller = this.scrollElementForEvents;

            if (scroller) {

                var fn;

                if (scroller.removeScrollEventListener) {

                    fn = scroller.getScrollEventName() === 'scroll' && enableDebouncing ? this.onScroll : this.updateFn;

                    scroller.removeScrollEventListener(fn, {
                        capture: false,
                        passive: true
                    });
                }
                else {

                    fn = enableDebouncing ? this.onScroll : this.updateFn;

                    dom.removeEventListener(scroller, 'scroll', fn, {
                        capture: false,
                        passive: true
                    });
                }

            }

            this.scrollElementForEvents = null;
            this.scroller = null;

            this.elems = [];
            this.options = null;
        },

        /**
         * Attaches the scroll event
         * @private
         */
        attachEvent: function () {
            if (!this.initialised) {
                this.lastScrollY = this.getScrollY();
                this.initialised = true;

                var scroller = this.scrollElementForEvents;

                if (scroller) {

                    var fn;

                    if (scroller.addScrollEventListener) {

                        fn = scroller.getScrollEventName() === 'scroll' && enableDebouncing ? this.onScroll : this.updateFn;

                        scroller.addScrollEventListener(fn, {
                            capture: false,
                            passive: true
                        });
                    }
                    else {

                        fn = enableDebouncing ? this.onScroll : this.updateFn;

                        dom.addEventListener(scroller, 'scroll', fn, {
                            capture: false,
                            passive: true
                        });
                    }
                }

                this.update();
            }
        },

        setTransform: function (value) {

            if (value === this.transform) {
                return;
            }

            this.transform = value;
            var isActive;

            if (value === 0) {
                value = 'none';
            }
            else if (value === 1) {

                if (windowInsetTop) {
                    value = 'translateY(calc(-100% + ' + windowInsetTop + 'px))';
                } else {
                    value = 'translateY(-100%)';
                }
                isActive = true;
            }
            else {
                value = 'translateY(-' + (value + windowInsetTop) + 'px)';
                isActive = true;
            }

            //console.log(value + '-' + currentScrollY);

            var elems = this.elems;
            for (var i = 0, length = elems.length; i < length; i++) {

                var elem = elems[i];

                if (windowInsetTop) {

                    if (isActive) {
                        elem.classList.add('headroom-active');
                    } else {
                        elem.classList.remove('headroom-active');
                    }
                }

                elem.style.transform = value;
            }
        },

        /**
         * Gets the Y scroll position
         * @see https://developer.mozilla.org/en-US/docs/Web/API/Window.scrollY
         * @return {Number} pixels the page has scrolled along the Y-axis
         */
        getScrollY: function () {

            var scroller = this.scroller;

            if (scroller.getScrollPosition) {
                return scroller.getScrollPosition();
            }

            //var pageYOffset = scroller.pageYOffset;
            //if (pageYOffset !== undefined) {
            //    return pageYOffset;
            //}

            var scrollTop = scroller.scrollTop;
            if (scrollTop !== undefined) {
                return scrollTop;
            }

            return (document.scrollingElement || document.documentElement || document.body).scrollTop;
        },

        /**
         * Handles updating the state of the widget
         */
        update: function (e) {

            if (this.paused) {
                return;
            }

            var currentScrollY = this.getScrollY();

            // Ignore if out of bounds (iOS rubber band effect)
            if (currentScrollY < 0) {
                this.lastScrollY = currentScrollY;
                this.scrolled = false;
                return;
            }

            var lastScrollY = this.lastScrollY;

            var isTv = layoutManager.tv;

            var scrollingDown = currentScrollY > lastScrollY;
            var top = currentScrollY <= (isTv ? 130 : 0);
            var toleranceExceeded = Math.abs(currentScrollY - lastScrollY) > 0;

            if (scrollingDown && !top && toleranceExceeded) {
                this.setTransform(1);
            } else if ((!scrollingDown && !isTv && toleranceExceeded) || top) {
                this.setTransform(0);
            }

            this.lastScrollY = currentScrollY;
            this.scrolled = false;
        }
    };

    return Headroom;

});