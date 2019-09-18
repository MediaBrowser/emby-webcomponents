define(['inputManager', 'focusManager', 'browser', 'layoutManager', 'events', 'dom'], function (inputmanager, focusManager, browser, layoutManager, events, dom) {
    'use strict';

    var self = {};

    var lastMouseInputTime = new Date().getTime();
    var isMouseIdle;

    function mouseIdleTime() {
        return new Date().getTime() - lastMouseInputTime;
    }

    function removeIdleClasses() {

        isMouseIdle = false;

        var classList = document.body.classList;

        classList.remove('mouseIdle');
        classList.remove('mouseIdle-tv');
    }

    function addIdleClasses() {

        isMouseIdle = true;

        var classList = document.body.classList;

        classList.add('mouseIdle');

        if (layoutManager.tv) {
            classList.add('mouseIdle-tv');
        }
    }

    var lastPointerMoveData;
    var undefinedString = "undefined";

    function onPointerMove(e) {

        var eventX = e.screenX;
        var eventY = e.screenY;

        // if coord don't exist how could it move
        var undef = undefinedString;
        if (typeof eventX === undef && typeof eventY === undef) {
            return;
        }

        var obj = lastPointerMoveData;
        if (!obj) {
            lastPointerMoveData = {
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
        inputmanager.notifyMouseMove();

        if (isMouseIdle) {
            removeIdleClasses();
        }
    }

    function onPointerEnter(e) {

        var pointerType = e.pointerType || (layoutManager.mobile ? 'touch' : 'mouse');

        if (pointerType === 'mouse') {
            if (!isMouseIdle) {
                var parent = focusManager.focusableParent(e.target);
                if (parent) {
                    focusManager.focus(parent);
                }
            }
        }
    }

    function enableFocusWithMouse() {

        if (!layoutManager.tv) {
            return false;
        }

        if (browser.web0s) {
            return false;
        }

        if (browser.tv) {
            return true;
        }

        return false;
    }

    function onMouseInterval() {

        if (!isMouseIdle && mouseIdleTime() >= 5000) {
            addIdleClasses();
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
    }

    function initMouse() {

        stopMouseInterval();

        if (layoutManager.tv) {
            addIdleClasses();
        } else {
            removeIdleClasses();
        }

        dom.removeEventListener(document, 'pointermove', onPointerMove, {
            passive: true
        });

        dom.removeEventListener(document, 'mousemove', onPointerMove, {
            passive: true
        });

        if (!layoutManager.mobile) {
            startMouseInterval();

            if (window.PointerEvent) {
                dom.addEventListener(document, 'pointermove', onPointerMove, {
                    passive: true
                });
            } else {
                dom.addEventListener(document, 'mousemove', onPointerMove, {
                    passive: true
                });
            }
        }

        dom.removeEventListener(document, (window.PointerEvent ? 'pointerenter' : 'mouseenter'), onPointerEnter, {
            capture: true,
            passive: true
        });

        if (enableFocusWithMouse()) {
            dom.addEventListener(document, (window.PointerEvent ? 'pointerenter' : 'mouseenter'), onPointerEnter, {
                capture: true,
                passive: true
            });
        }
    }

    initMouse();

    events.on(layoutManager, 'modechange', initMouse);

    return self;
});