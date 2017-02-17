define(['dom', 'events'], function (dom, events) {
    'use strict';

    function getTouches(e) {

        return e.changedTouches || e.targetTouches || e.touches;
    }

    function TouchHelper(elem) {

        var touchTarget;
        var touchStartX;
        var touchStartY;
        var self = this;

        var swipeXThreshold = 50;
        var swipeXMaxY = 30;

        var touchStart = function (e) {

            var touch = getTouches(e)[0];
            touchTarget = null;
            touchStartX = 0;
            touchStartY = 0;

            if (touch) {
                touchStartX = touch.clientX;
                touchStartY = touch.clientY;
                touchTarget = touch.target;
            }
        };

        var touchEnd = function (e) {

            if (touchTarget) {
                var touch = getTouches(e)[0];

                var deltaX;
                var deltaY;

                if (touch) {
                    var touchEndX = touch.clientX || 0;
                    var touchEndY = touch.clientY || 0;
                    deltaX = touchEndX - (touchStartX || 0);
                    deltaY = touchEndY - (touchStartY || 0);
                } else {
                    deltaX = 0;
                    deltaY = 0;
                }

                if (deltaX > swipeXThreshold && Math.abs(deltaY) < swipeXMaxY) {
                    events.trigger(self, 'swiperight', [touchTarget]);
                }
                else if (deltaX < (0 - swipeXThreshold) && Math.abs(deltaY) < swipeXMaxY) {
                    events.trigger(self, 'swipeleft', [touchTarget]);
                }
            }

            touchTarget = null;
            touchStartX = 0;
            touchStartY = 0;
        };

        this.touchStart = touchStart;
        this.touchEnd = touchEnd;

        dom.addEventListener(elem, 'touchstart', touchStart, {
            passive: true
        });
        dom.addEventListener(elem, 'touchend', touchEnd, {
            passive: true
        });
        dom.addEventListener(elem, 'touchcancel', touchEnd, {
            passive: true
        });
    }

    TouchHelper.prototype.destroy = function () {

        var elem = this.elem;

        var touchStart = this.touchStart;
        var touchEnd = this.touchEnd;

        dom.removeEventListener(elem, 'touchstart', touchStart, {
            passive: true
        });
        dom.removeEventListener(elem, 'touchend', touchEnd, {
            passive: true
        });
        dom.removeEventListener(elem, 'touchcancel', touchEnd, {
            passive: true
        });

        this.touchStart = null;
        this.touchEnd = null;

        this.elem = null;
    };

    return TouchHelper;
});