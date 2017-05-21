define(['inputManager', 'focusManager', 'browser', 'layoutManager', 'events', 'dom'], function (inputmanager, focusManager, browser, layoutManager, events, dom) {
    'use strict';

    var self = {};

    var lastMouseInputTime = new Date().getTime();
    var isMouseIdle;

    function mouseIdleTime() {
        return new Date().getTime() - lastMouseInputTime;
    }

    function notifyApp() {

        inputmanager.notifyMouseMove();
    }

    var lastMouseMoveData;
    function onMouseMove(e) {

        var eventX = e.screenX;
        var eventY = e.screenY;

        // if coord don't exist how could it move
        if (typeof eventX === "undefined" && typeof eventY === "undefined") {
            return;
        }

        var obj = lastMouseMoveData;
        if (!obj) {
            lastMouseMoveData = {
                x: eventX,
                y: eventY
            };
            return;
        }

        // if coord are same, it didn't move
        if (Math.abs(eventX - obj.x) < 10 && Math.abs(eventY - obj.y) < 10) {
            return;
        }

        obj.x = eventX;
        obj.y = eventY;

        lastMouseInputTime = new Date().getTime();
        notifyApp();

        if (isMouseIdle) {
            isMouseIdle = false;
            document.body.classList.remove('mouseIdle');
            events.trigger(self, 'mouseactive');
        }
    }

    function onMouseEnter(e) {

        if (!isMouseIdle) {
            var parent = focusManager.focusableParent(e.target);
            if (parent) {
                focusManager.focus(e.target);
            }
        }
    }

    function enableFocusWithMouse() {

        if (!layoutManager.tv) {
            return false;
        }

        if (browser.xboxOne) {
            return true;
        }

        if (browser.tv) {
            return true;
        }

        return false;
    }

    function onMouseInterval() {

        if (!isMouseIdle && mouseIdleTime() >= 5000) {
            isMouseIdle = true;
            document.body.classList.add('mouseIdle');
            events.trigger(self, 'mouseidle');
        }
    }

    var mouseInterval;
    function startMouseInterval() {

        if (!mouseInterval) {
            mouseInterval = setInterval(onMouseInterval, 5000);
        }
    }

    function stopMouseInterval() {

        var interval = mouseInterval;

        if (interval) {
            clearInterval(interval);
            mouseInterval = null;
        }

        document.body.classList.remove('mouseIdle');
    }

    function initMouse() {

        stopMouseInterval();

        dom.removeEventListener(document, 'mousemove', onMouseMove, {
            passive: true
        });

        if (!layoutManager.mobile) {
            startMouseInterval();

            dom.addEventListener(document, 'mousemove', onMouseMove, {
                passive: true
            });
        }

        dom.removeEventListener(document, 'mouseenter', onMouseEnter, {
            capture: true,
            passive: true
        });

        if (enableFocusWithMouse()) {
            dom.addEventListener(document, 'mouseenter', onMouseEnter, {
                capture: true,
                passive: true
            });
        }
    }

    initMouse();

    events.on(layoutManager, 'modechange', initMouse);

    return self;
});