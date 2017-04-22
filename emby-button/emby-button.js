define(['browser', 'dom', 'layoutManager', 'shell', 'embyRouter', 'apphost', 'css!./emby-button', 'registerElement'], function (browser, dom, layoutManager, shell, embyRouter, appHost) {
    'use strict';

    var EmbyButtonPrototype = Object.create(HTMLButtonElement.prototype);
    var EmbyLinkButtonPrototype = Object.create(HTMLAnchorElement.prototype);

    function animateButtonInternal(e, btn) {

        var div = document.createElement('div');

        for (var i = 0, length = btn.classList.length; i < length; i++) {
            div.classList.add(btn.classList[i] + '-ripple-effect');
        }

        var offsetX = e.offsetX || 0;
        var offsetY = e.offsetY || 0;

        if (offsetX > 0 && offsetY > 0) {
            div.style.left = offsetX + 'px';
            div.style.top = offsetY + 'px';
        }

        var firstChild = btn.firstChild;
        if (firstChild) {
            btn.insertBefore(div, btn.firstChild);
        } else {
            btn.appendChild(div);
        }

        div.addEventListener(dom.whichAnimationEvent(), function () {
            div.parentNode.removeChild(div);
        }, false);
    }

    function animateButton(e, btn) {

        requestAnimationFrame(function () {
            animateButtonInternal(e, btn);
        });
    }

    function onKeyDown(e) {

        if (e.keyCode === 13) {
            animateButton(e, this);
        }
    }

    function onMouseDown(e) {

        if (e.button === 0) {
            animateButton(e, this);
        }
    }

    function onClick(e) {

        animateButton(e, this);
    }

    function enableAnimation() {
        if (browser.tv) {
            // too slow
            return false;
        }
        return true;
    }

    function onClickOpenTarget(e) {
        shell.openUrl(this.getAttribute('data-target'));
    }

    function onAnchorClick(e) {

        var href = this.getAttribute('href');

        if (href !== '#') {

            if (this.getAttribute('target')) {
                e.preventDefault();
                shell.openUrl(href);
            } else {
                embyRouter.handleAnchorClick(e);
            }
        }
    }

    EmbyButtonPrototype.createdCallback = function () {

        if (this.classList.contains('emby-button')) {
            return;
        }

        this.classList.add('emby-button');

        // Even though they support flex, it doesn't quite work with button elements
        if (browser.safari) {
            this.classList.add('emby-button-noflex');
        }

        if (layoutManager.tv) {
            this.classList.add('emby-button-focusscale');
            this.classList.add('emby-button-tv');
        }

        if (enableAnimation()) {
            dom.addEventListener(this, 'keydown', onKeyDown, {
                passive: true
            });

            // Adding this event to mousedown for A elements in firefox makes them unclickable,
            // if the click is on the animated element
            if (browser.safari || (browser.firefox && this.tagName === 'A')) {
                dom.addEventListener(this, 'click', onClick, {
                    passive: true
                });
            } else {
                dom.addEventListener(this, 'mousedown', onMouseDown, {
                    passive: true
                });
                //this.addEventListener('touchstart', animateButton);
            }
        }
    };

    EmbyButtonPrototype.attachedCallback = function () {

        if (this.tagName === 'A') {

            dom.removeEventListener(this, 'click', onAnchorClick, {
            });

            dom.addEventListener(this, 'click', onAnchorClick, {
            });
        }
        else if (this.getAttribute('data-target')) {
            dom.removeEventListener(this, 'click', onClickOpenTarget, {
                passive: true
            });

            dom.addEventListener(this, 'click', onClickOpenTarget, {
                passive: true
            });

            if (this.getAttribute('data-autohide') !== 'false') {
                if (appHost.supports('externallinks')) {
                    this.classList.remove('hide');
                } else {
                    this.classList.add('hide');
                }
            }
        }
    };

    EmbyLinkButtonPrototype.createdCallback = EmbyButtonPrototype.createdCallback;
    EmbyLinkButtonPrototype.attachedCallback = EmbyButtonPrototype.attachedCallback;

    document.registerElement('emby-button', {
        prototype: EmbyButtonPrototype,
        extends: 'button'
    });

    document.registerElement('emby-linkbutton', {
        prototype: EmbyLinkButtonPrototype,
        extends: 'a'
    });
});