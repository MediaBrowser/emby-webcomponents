/*!
 * headroom.js v0.7.0 - Give your page some headroom. Hide your header until you need it
 * Copyright (c) 2014 Nick Williams - http://wicky.nillia.ms/headroom.js
 * License: MIT
 */

define(['dom', 'layoutManager', 'browser', 'css!./headroom'], function (dom, layoutManager, browser) {

    'use strict';

    /* exported features */

    var requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame;

    /**
     * Handles debouncing of events via requestAnimationFrame
     * @see http://www.html5rocks.com/en/tutorials/speed/animations/
     * @param {Function} callback The callback to handle whichever event
     */
    function Debouncer(callback) {
        this.callback = callback;
        this.ticking = false;
    }
    Debouncer.prototype = {
        constructor: Debouncer,

        /**
         * dispatches the event to the supplied callback
         * @private
         */
        update: function () {
            if (this.callback) {
                this.callback();
            }
            this.ticking = false;
        },

        /**
         * Attach this as the event listeners
         */
        handleEvent: function () {
            if (!this.ticking) {
                requestAnimationFrame(this.rafCallback || (this.rafCallback = this.update.bind(this)));
                this.ticking = true;
            }
        }
    };

    /**
   * UI enhancement for fixed headers.
   * Hides header when scrolling down
   * Shows header when scrolling up
   * @constructor
   * @param {DOMElement} elem the header element
   * @param {Object} options options for the widget
   */
    function Headroom(elems, options) {
        options = Object.assign(Headroom.options, options || {});

        this.lastKnownScrollY = 0;
        this.elems = elems;
        this.debouncer = new Debouncer(this.update.bind(this));
        this.offset = options.offset;
        this.scroller = options.scroller;
        this.initialised = false;

        this.initialClass = options.initialClass;
        this.unPinnedClass = options.unPinnedClass;

        this.upTolerance = options.upTolerance;
        this.downTolerance = options.downTolerance;
    }
    Headroom.prototype = {
        constructor: Headroom,

        /**
         * Initialises the widget
         */
        init: function () {

            if (browser.supportsCssAnimation()) {
                for (var i = 0, length = this.elems.length; i < length; i++) {
                    this.elems[i].classList.add(this.initialClass);
                }

                this.attachEvent();
            }

            return this;
        },

        add: function (elem) {

            if (browser.supportsCssAnimation()) {
                elem.classList.add(this.initialClass);
                this.elems.push(elem);
            }
        },

        remove: function (elem) {

            elem.classList.remove(this.unPinnedClass, this.initialClass);
            var i = this.elems.indexOf(elem);
            if (i !== -1) {
                this.elems.splice(i, 1);
            }
        },

        /**
         * Unattaches events and removes any classes that were added
         */
        destroy: function () {

            this.initialised = false;

            for (var i = 0, length = this.elems.length; i < length; i++) {
                this.elems[i].classList.remove(this.unPinnedClass, this.initialClass);
            }

            dom.removeEventListener(this.scroller, 'scroll', this.debouncer, {
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
                dom.addEventListener(this.scroller, 'scroll', this.debouncer, {
                    capture: false,
                    passive: true
                });

                this.debouncer.handleEvent();
            }
        },

        /**
         * Unpins the header if it's currently pinned
         */
        clear: function () {

            for (var i = 0, length = this.elems.length; i < length; i++) {
                var classList = this.elems[i].classList;

                classList.remove(this.unPinnedClass);
            }
        },

        /**
         * Unpins the header if it's currently pinned
         */
        unpin: function () {

            for (var i = 0, length = this.elems.length; i < length; i++) {
                var classList = this.elems[i].classList;

                classList.add(this.unPinnedClass);
            }
        },

        /**
         * Pins the header if it's currently unpinned
         */
        pin: function (scrollY) {

            for (var i = 0, length = this.elems.length; i < length; i++) {
                var classList = this.elems[i].classList;

                if (scrollY && layoutManager.tv) {
                    classList.add(this.unPinnedClass);
                } else {
                    classList.remove(this.unPinnedClass);
                }
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
         * determines if the tolerance has been exceeded
         * @param  {int} currentScrollY the current scroll y position
         * @return {bool} true if tolerance exceeded, false otherwise
         */
        toleranceExceeded: function (currentScrollY, direction) {
            return Math.abs(currentScrollY - this.lastKnownScrollY) >= this[direction + 'Tolerance'];
        },

        /**
         * determine if it is appropriate to unpin
         * @param  {int} currentScrollY the current y scroll position
         * @param  {bool} toleranceExceeded has the tolerance been exceeded?
         * @return {bool} true if should unpin, false otherwise
         */
        shouldUnpin: function (currentScrollY, toleranceExceeded) {
            var scrollingDown = currentScrollY > this.lastKnownScrollY,
              pastOffset = currentScrollY >= this.offset;

            return scrollingDown && pastOffset && toleranceExceeded;
        },

        /**
         * determine if it is appropriate to pin
         * @param  {int} currentScrollY the current y scroll position
         * @param  {bool} toleranceExceeded has the tolerance been exceeded?
         * @return {bool} true if should pin, false otherwise
         */
        shouldPin: function (currentScrollY, toleranceExceeded) {
            var scrollingUp = currentScrollY < this.lastKnownScrollY,
              pastOffset = currentScrollY <= this.offset;

            return (scrollingUp && toleranceExceeded) || pastOffset;
        },

        /**
         * Handles updating the state of the widget
         */
        update: function () {
            var currentScrollY = this.getScrollY(),
              scrollDirection = currentScrollY > this.lastKnownScrollY ? 'down' : 'up',
              toleranceExceeded = this.toleranceExceeded(currentScrollY, scrollDirection);

            if (currentScrollY < 0) { // Ignore bouncy scrolling in OSX
                return;
            }

            if (this.shouldUnpin(currentScrollY, toleranceExceeded)) {
                this.unpin();
            }
            else if (this.shouldPin(currentScrollY, toleranceExceeded)) {
                this.pin(currentScrollY);
            } else {
                this.clear();
            }

            this.lastKnownScrollY = currentScrollY;
        }
    };
    /**
     * Default options
     * @type {Object}
     */
    Headroom.options = {
        upTolerance: 0,
        downTolerance: 0,
        offset: 0,
        scroller: window,
        initialClass: 'headroom',
        unPinnedClass: 'headroom--unpinned'
    };

    return Headroom;

});