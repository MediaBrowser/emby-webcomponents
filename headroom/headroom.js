/*!
 * headroom.js v0.7.0 - Give your page some headroom. Hide your header until you need it
 * Copyright (c) 2014 Nick Williams - http://wicky.nillia.ms/headroom.js
 * License: MIT
 */

define(['dom', 'layoutManager', 'browser', 'css!./headroom'], function (dom, layoutManager, browser) {

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

        this.lastKnownScrollY = 0;
        this.elems = elems;

        this.scroller = options.scroller || window;

        this.debouncer = this.update.bind(this);
        this.offset = options.offset;
        this.initialised = false;
    }

    function onScroll() {

        if (this.paused) {
            return;
        }

        this.update();
        //return;

        //if (!this.ticking) {
        //    requestAnimationFrame(this.rafCallback || (this.rafCallback = this.update.bind(this)));
        //    this.ticking = true;
        //}
    }

    var toleranceLevel = browser.iOS ? 14 : 4;

    Headroom.prototype = {
        constructor: Headroom,

        /**
         * Initialises the widget
         */
        init: function () {

            this.onHeadroomClearedExternallyFn = onHeadroomClearedExternally.bind(this);
            this.onHeadroomForceClearedExternallyFn = onHeadroomForceClearedExternally.bind(this);

            if (browser.supportsCssAnimation()) {
                for (var i = 0, length = this.elems.length; i < length; i++) {

                    var elem = this.elems[i];
                    this.initElem(elem);
                }

                this.attachEvent();
            }

            return this;
        },

        add: function (elem) {

            if (browser.supportsCssAnimation()) {
                this.initElem(elem);
                this.elems.push(elem);
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

            this.initialised = false;

            for (var i = 0, length = this.elems.length; i < length; i++) {

                var classList = this.elems[i].classList;

                classList.remove('headroom');
            }

            var scrollEventName = this.scroller.getScrollEventName ? this.scroller.getScrollEventName() : 'scroll';

            dom.removeEventListener(this.scroller, scrollEventName, this.debouncer, {
                capture: false,
                passive: true
            });
        },

        /**
         * Attaches the scroll event
         * @private
         */
        attachEvent: function () {
            if (!this.initialised) {
                this.lastKnownScrollY = this.getScrollY();
                this.initialised = true;

                var scrollEventName = this.scroller.getScrollEventName ? this.scroller.getScrollEventName() : 'scroll';

                dom.addEventListener(this.scroller, scrollEventName, this.debouncer, {
                    capture: false,
                    passive: true
                });

                this.update();
            }
        },

        setTransform: function (value, currentScrollY) {

            if (value === this.transform) {
                return;
            }

            this.transform = value;

            if (value === 0) {
                value = 'none';
            }
            else if (value === 1) {
                value = 'translateY(-100%)';
            }
            else {
                value = 'translateY(-' + value + 'px)';
            }

            //console.log(value + '-' + currentScrollY);

            var elems = this.elems;
            for (var i = 0, length = elems.length; i < length; i++) {

                var elem = elems[i];

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

            var pageYOffset = scroller.pageYOffset;
            if (pageYOffset !== undefined) {
                return pageYOffset;
            }

            var scrollTop = scroller.scrollTop;
            if (scrollTop !== undefined) {
                return scrollTop;
            }

            return (document.documentElement || document.body).scrollTop;
        },

        /**
         * determine if it is appropriate to unpin
         * @param  {int} currentScrollY the current y scroll position
         * @return {bool} true if should unpin, false otherwise
         */
        shouldUnpin: function (currentScrollY) {
            var scrollingDown = currentScrollY > this.lastKnownScrollY,
                pastOffset = currentScrollY >= this.offset;

            return scrollingDown && pastOffset;
        },

        /**
         * Handles updating the state of the widget
         */
        update: function () {

            if (this.paused) {
                return;
            }

            var currentScrollY = this.getScrollY();

            // Ignore if out of bounds (iOS rubber band effect)
            if (currentScrollY < 0) {
                this.ticking = false;
                return;
            }

            var lastKnownScrollY = this.lastKnownScrollY;

            var isTv = layoutManager.tv;

            var max = isTv ? 130 : 90;

            if (currentScrollY <= (isTv ? max : 0)) {
                this.setTransform(0, currentScrollY);
            }
            else if (!isTv && currentScrollY < lastKnownScrollY) {

                var toleranceExceeded = Math.abs(currentScrollY - lastKnownScrollY) >= toleranceLevel;

                if (toleranceExceeded) {
                    this.setTransform(0, currentScrollY);
                }
            }
            else {

                var transformValue = currentScrollY;

                if (transformValue <= 0) {
                    transformValue = 0;
                } else if (transformValue >= max) {
                    transformValue = 1;
                }

                this.setTransform(transformValue, currentScrollY);
            }

            this.lastKnownScrollY = currentScrollY;
            this.ticking = false;
        }
    };

    return Headroom;

});