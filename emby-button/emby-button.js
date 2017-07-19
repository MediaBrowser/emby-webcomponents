define(['browser', 'dom', 'layoutManager', 'shell', 'appRouter', 'apphost', 'css!./emby-button', 'registerElement'], function (browser, dom, layoutManager, shell, appRouter, appHost) {
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

    function onAnchorClick(e) {

        var href = this.getAttribute('href');

        if (href !== '#') {

            if (this.getAttribute('target')) {
                if (!appHost.supports('targetblank')) {
                    e.preventDefault();
                    shell.openUrl(href);
                }
            } else {
                appRouter.handleAnchorClick(e);
            }
        } else {
            e.preventDefault();
        }
    }

    EmbyButtonPrototype.createdCallback = function () {

        if (this.classList.contains('emby-button')) {
            return;
        }

        this.classList.add('emby-button');

        if (layoutManager.tv) {
            this.classList.add('emby-button-focusscale');
            this.classList.add('emby-button-tv');
        }

        if (enableAnimation() && this.getAttribute('data-ripple') !== 'false' && !this.classList.contains('button-link')) {
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

            if (this.getAttribute('data-autohide') === 'true') {
                if (appHost.supports('externallinks')) {
                    this.classList.remove('hide');
                } else {
                    this.classList.add('hide');
                }
            }
        }
    };

    EmbyButtonPrototype.detachedCallback = function () {

        dom.removeEventListener(this, 'click', onAnchorClick, {
        });
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

    // For extension purposes
    return EmbyButtonPrototype;
});