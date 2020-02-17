define(['focusManager', 'layoutManager', 'dom', 'css!./style.css', 'paper-icon-button-light', 'material-icons'], function (focusManager, layoutManager, dom) {
    'use strict';

    var selectedButtonClass = 'alphaPickerButton-selected';

    function focus() {
        var scope = this;
        var selected = scope.querySelector('.' + selectedButtonClass);

        if (selected) {
            focusManager.focus(selected);
        } else {
            focusManager.autoFocus(scope);
        }
    }

    function getAlphaPickerButtonClassName(vertical) {

        var alphaPickerButtonClassName = 'alphaPickerButton';

        if (layoutManager.tv) {
            alphaPickerButtonClassName += ' alphaPickerButton-tv';
        }

        if (vertical) {
            alphaPickerButtonClassName += ' alphaPickerButton-vertical';
        }

        return alphaPickerButtonClassName;
    }

    function getLetterButton(l, vertical) {
        return '<button is="emby-button" href="#" data-value="' + l + '" class="button-flat ' + getAlphaPickerButtonClassName(vertical) + '">' + l + '</button>';
    }

    function mapLetters(letters, vertical) {

        return letters.map(function (l) {
            return getLetterButton(l, vertical);
        });
    }

    function render(element, options) {

        element.classList.add('alphaPicker');

        if (layoutManager.tv) {
            element.classList.add('alphaPicker-tv');
        }

        var vertical = element.classList.contains('alphaPicker-vertical');

        if (vertical) {

        } else {
            element.classList.add('focuscontainer-x');
        }

        var html = '';
        var letters;

        var alphaPickerButtonClassName = getAlphaPickerButtonClassName(vertical);

        var rowClassName = 'alphaPickerRow';

        if (vertical) {
            rowClassName += ' alphaPickerRow-vertical';
        }

        html += '<div class="' + rowClassName + '">';

        if (options.mode === 'keyboard') {
            // space_bar icon
            html += '<button data-value=" " is="paper-icon-button-light" class="' + alphaPickerButtonClassName + '"><i class="md-icon alphaPickerButtonIcon">&#xE256;</i></button>';

            letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
            html += mapLetters(letters, vertical).join('');

            // backspace icon
            html += '<button data-value="backspace" is="paper-icon-button-light" class="' + alphaPickerButtonClassName + '"><i class="md-icon alphaPickerButtonIcon">&#xE14A;</i></button>';
            html += '</div>';

            letters = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
            html += '<div class="' + rowClassName + '">';
            html += '<br/>';
            html += mapLetters(letters, vertical).join('');
            html += '</div>';

            setInnerHtml(element, html);
        } else {

            html += mapLetters(options.prefixes || getDefaultListPrefixes(), vertical).join('');

            html += '</div>';
            setInnerHtml(element, html);
        }
    }

    function getListPrefixes(options) {

        if (options.getPrefixes) {
            return options.getPrefixes().catch(getDefaultListPrefixes);
        }

        return Promise.resolve(getDefaultListPrefixes());
    }

    function getDefaultListPrefixes() {

        return ['#', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
    }

    function setInnerHtml(element, html) {
        element.innerHTML = html;
        element.classList.add('focusable');
        element.focus = focus;
    }

    function onAlphaPickerClick(e) {

        var alphaPickerButton = dom.parentWithClass(e.target, 'alphaPickerButton');

        if (alphaPickerButton) {
            var value = alphaPickerButton.getAttribute('data-value');
            this.value(value, true);
        }
    }

    function onItemFocusTimeout() {
        this.itemFocusTimeout = null;
        this.value(this.itemFocusValue);
    }

    function onItemsFocusIn(e) {

        var item = dom.parentWithAttribute(e.target, 'data-prefix');

        if (item) {
            var prefix = item.getAttribute('data-prefix');
            if (prefix && prefix.length) {

                this.itemFocusValue = prefix[0];
                if (this.itemFocusTimeout) {
                    clearTimeout(this.itemFocusTimeout);
                }
                this.itemFocusTimeout = setTimeout(onItemFocusTimeout.bind(this), 100);
            }
        }
    }

    function onAlphaPickerInKeyboardModeClick(e) {

        var alphaPickerButton = dom.parentWithClass(e.target, 'alphaPickerButton');

        if (alphaPickerButton) {
            var value = alphaPickerButton.getAttribute('data-value');

            var options = this.options;
            var element = options.element;

            element.dispatchEvent(new CustomEvent("alphavalueclicked", {
                cancelable: false,
                detail: {
                    value: value
                }
            }));
        }
    }

    function onAlphaFocusTimeout() {

        this.alphaFocusTimeout = null;

        if (document.activeElement === this.alphaFocusedElement) {
            var value = this.alphaFocusedElement.getAttribute('data-value');
            this.value(value, true);
        }
    }

    function onAlphaPickerFocusIn(e) {

        if (this.alphaFocusTimeout) {
            clearTimeout(this.alphaFocusTimeout);
            this.alphaFocusTimeout = null;
        }

        var alphaPickerButton = dom.parentWithClass(e.target, 'alphaPickerButton');

        if (alphaPickerButton) {
            this.alphaFocusedElement = alphaPickerButton;
            this.alphaFocusTimeout = setTimeout(onAlphaFocusTimeout.bind(this), 600);
        }
    }

    function AlphaPicker(options) {

        this.options = options;

        this.bound_onItemsFocusIn = onItemsFocusIn.bind(this);
        this.bound_onAlphaPickerInKeyboardModeClick = onAlphaPickerInKeyboardModeClick.bind(this);
        this.bound_onAlphaPickerFocusIn = onAlphaPickerFocusIn.bind(this);

        this.valueChangeEvent = layoutManager.tv ? null : 'click';

        var element = options.element;

        render(element, options);

        this.enabled(true);
        this.visible(true);
    }

    AlphaPicker.prototype.enabled = function (enabled) {
        var fn;

        var options = this.options;
        var itemsContainer = options.itemsContainer;
        var element = options.element;

        if (enabled) {

            if (itemsContainer && options.setValueOnFocus) {
                dom.addEventListener(itemsContainer, 'focus', this.bound_onItemsFocusIn, {
                    capture: true,
                    passive: true
                });
            }

            if (options.mode === 'keyboard') {
                element.addEventListener('click', this.bound_onAlphaPickerInKeyboardModeClick);
            }

            if (this.valueChangeEvent !== 'click') {
                element.addEventListener('focus', this.bound_onAlphaPickerFocusIn, true);
            } else {

                fn = onAlphaPickerClick.bind(this);
                element.onAlphaPickerClickFn = fn;

                element.addEventListener('click', fn);
            }

        } else {

            if (itemsContainer) {
                dom.removeEventListener(itemsContainer, 'focus', this.bound_onItemsFocusIn, {
                    capture: true,
                    passive: true
                });
            }

            element.removeEventListener('click', this.bound_onAlphaPickerInKeyboardModeClick);
            element.removeEventListener('focus', this.bound_onAlphaPickerFocusIn, true);

            fn = element.onAlphaPickerClickFn;
            if (fn) {
                element.removeEventListener('click', fn);
                element.onAlphaPickerClickFn = null;
            }
        }
    };

    AlphaPicker.prototype.value = function (value, applyValue) {

        var element = this.options.element;

        value = value.toUpperCase();

        if (applyValue) {
            element.dispatchEvent(new CustomEvent("alphavaluechanged", {
                cancelable: false,
                detail: {
                    value: value
                }
            }));
        }
    };

    AlphaPicker.prototype.on = function (name, fn) {
        var element = this.options.element;
        element.addEventListener(name, fn);
    };

    AlphaPicker.prototype.off = function (name, fn) {
        var element = this.options.element;
        element.removeEventListener(name, fn);
    };

    AlphaPicker.prototype.visible = function (visible) {

        var element = this.options.element;
        element.style.visibility = visible ? 'visible' : 'hidden';
    };

    AlphaPicker.prototype.setPrefixes = function (prefixes) {

        var element = this.options.element;
        var vertical = element.classList.contains('alphaPicker-vertical');
        var html = mapLetters(prefixes, vertical).join('');

        element.querySelector('.alphaPickerRow').innerHTML = html;
    };

    AlphaPicker.prototype.values = function () {

        var element = this.options.element;
        var elems = element.querySelectorAll('.alphaPickerButton');
        var values = [];
        for (var i = 0, length = elems.length; i < length; i++) {

            values.push(elems[i].getAttribute('data-value'));

        }

        return values;
    };

    AlphaPicker.prototype.focus = function () {

        var element = this.options.element;
        focusManager.autoFocus(element);
    };

    AlphaPicker.prototype.destroy = function () {

        var element = this.options.element;
        this.enabled(false);
        element.classList.remove('focuscontainer-x');
        this.itemFocusTimeout = null;
        this.itemFocusValue = null;
        this.options = null;
        this.valueChangeEvent = null;
        this.bound_onItemsFocusIn = null;
        this.bound_onAlphaPickerInKeyboardModeClick = null;
        this.bound_onAlphaPickerFocusIn = null;
    };

    return AlphaPicker;
});