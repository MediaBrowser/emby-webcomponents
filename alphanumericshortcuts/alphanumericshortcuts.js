define(['dom', 'focusManager', 'css!./alphanumericshortcuts'], function (dom, focusManager) {
    'use strict';

    var inputDisplayElement;
    var currentDisplayText = '';
    var currentDisplayTextContainer;

    function onKeyDown(e) {

        if (e.ctrlKey) {
            return;
        }
        if (!!e.shiftKey) {
            return;
        }
        if (e.altKey) {
            return;
        }

        var key = e.key;
        var chr = key ? alphanumeric(key) : null;

        if (chr) {

            chr = chr.toString().toUpperCase();

            if (chr.length === 1) {
                currentDisplayTextContainer = this.options.itemsContainer;
                onAlphanumericKeyPress(this, e, chr);
            }
        }
    }

    function alphanumeric(value) {
        var letterNumber = /^[0-9a-zA-Z]+$/;
        return value.match(letterNumber);
    }

    function ensureInputDisplayElement() {
        if (!inputDisplayElement) {
            inputDisplayElement = document.createElement('div');
            inputDisplayElement.classList.add('alphanumeric-shortcut');
            inputDisplayElement.classList.add('hide');

            document.body.appendChild(inputDisplayElement);
        }
    }

    var alpanumericShortcutTimeout;
    function clearAlphaNumericShortcutTimeout() {
        if (alpanumericShortcutTimeout) {
            clearTimeout(alpanumericShortcutTimeout);
            alpanumericShortcutTimeout = null;
        }
    }
    function resetAlphaNumericShortcutTimeout(instance) {
        clearAlphaNumericShortcutTimeout();
        alpanumericShortcutTimeout = setTimeout(onAlphanumericShortcutTimeout.bind(instance), 2000);
    }

    function onAlphanumericKeyPress(instance, e, chr) {
        if (currentDisplayText.length >= 3) {
            return;
        }
        ensureInputDisplayElement();
        currentDisplayText += chr;
        inputDisplayElement.innerHTML = currentDisplayText;
        inputDisplayElement.classList.remove('hide');
        resetAlphaNumericShortcutTimeout(instance);
    }

    function onAlphanumericShortcutTimeout() {

        var instance = this;

        var value = currentDisplayText;
        var container = currentDisplayTextContainer;

        currentDisplayText = '';
        currentDisplayTextContainer = null;
        inputDisplayElement.innerHTML = '';
        inputDisplayElement.classList.add('hide');
        clearAlphaNumericShortcutTimeout();
        selectByShortcutValue(instance, container, value);
    }

    function selectByShortcutValue(instance, container, value) {

        if (instance.onAlphaNumericValueEntered) {
            if (instance.onAlphaNumericValueEntered(value)) {
                return;
            }
        }

        var focusElem;
        if (value === '#') {

            focusElem = container.querySelector('*[data-prefix]');
        }

        if (!focusElem) {
            focusElem = container.querySelector('*[data-prefix^=\'' + value.toUpperCase() + '\']');
        }

        if (focusElem) {

            if (focusElem.tagName !== 'BUTTON') {
                focusElem = focusElem.querySelector('.cardContent-button') || focusElem.querySelector('button') || focusElem;
            }

            focusManager.focus(focusElem, {
                preventScroll: false
            });
        }
    }

    function AlphaNumericShortcuts(options) {

        this.options = options;

        var keyDownHandler = onKeyDown.bind(this);

        dom.addEventListener(window, 'keydown', keyDownHandler, {
            passive: true
        });

        this.keyDownHandler = keyDownHandler;
    }

    AlphaNumericShortcuts.prototype.destroy = function () {

        var keyDownHandler = this.keyDownHandler;

        if (keyDownHandler) {
            dom.removeEventListener(window, 'keydown', keyDownHandler, {
                passive: true
            });
            this.keyDownHandler = null;
        }
        this.options = null;
    };

    return AlphaNumericShortcuts;
});