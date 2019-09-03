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
        return '<button data-value="' + l + '" class="' + getAlphaPickerButtonClassName(vertical) + '">' + l + '</button>';
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

    function AlphaPicker(options) {

        var self = this;
        this.options = options;

        this.valueChangeEvent = layoutManager.tv ? null : 'click';

        var element = options.element;
        var itemsContainer = options.itemsContainer;

        var itemFocusValue;
        var itemFocusTimeout;

        function onItemFocusTimeout() {
            itemFocusTimeout = null;
            self.value(itemFocusValue);
        }

        var alphaFocusedElement;
        var alphaFocusTimeout;

        function onAlphaFocusTimeout() {

            alphaFocusTimeout = null;

            if (document.activeElement === alphaFocusedElement) {
                var value = alphaFocusedElement.getAttribute('data-value');
                self.value(value, true);
            }
        }

        function onAlphaPickerInKeyboardModeClick(e) {

            var alphaPickerButton = dom.parentWithClass(e.target, 'alphaPickerButton');

            if (alphaPickerButton) {
                var value = alphaPickerButton.getAttribute('data-value');

                element.dispatchEvent(new CustomEvent("alphavalueclicked", {
                    cancelable: false,
                    detail: {
                        value: value
                    }
                }));
            }
        }

        function onAlphaPickerClick(e) {

            var alphaPickerButton = dom.parentWithClass(e.target, 'alphaPickerButton');

            if (alphaPickerButton) {
                var value = alphaPickerButton.getAttribute('data-value');
                if ((this._currentValue || '').toUpperCase() === value.toUpperCase()) {
                    self.value(null, true);
                } else {
                    self.value(value, true);
                }
            }
        }

        function onAlphaPickerFocusIn(e) {

            if (alphaFocusTimeout) {
                clearTimeout(alphaFocusTimeout);
                alphaFocusTimeout = null;
            }

            var alphaPickerButton = dom.parentWithClass(e.target, 'alphaPickerButton');

            if (alphaPickerButton) {
                alphaFocusedElement = alphaPickerButton;
                alphaFocusTimeout = setTimeout(onAlphaFocusTimeout, 600);
            }
        }

        function onItemsFocusIn(e) {

            var item = dom.parentWithAttribute(e.target, 'data-prefix');

            if (item) {
                var prefix = item.getAttribute('data-prefix');
                if (prefix && prefix.length) {

                    itemFocusValue = prefix[0];
                    if (itemFocusTimeout) {
                        clearTimeout(itemFocusTimeout);
                    }
                    itemFocusTimeout = setTimeout(onItemFocusTimeout, 100);
                }
            }
        }

        self.enabled = function (enabled) {

            var fn;

            if (enabled) {

                if (itemsContainer && options.setValueOnFocus) {
                    dom.addEventListener(itemsContainer, 'focus', onItemsFocusIn, {
                        capture: true,
                        passive: true
                    });
                }

                if (options.mode === 'keyboard') {
                    element.addEventListener('click', onAlphaPickerInKeyboardModeClick);
                }

                if (self.valueChangeEvent !== 'click') {
                    element.addEventListener('focus', onAlphaPickerFocusIn, true);
                } else {

                    fn = onAlphaPickerClick.bind(this);
                    element.onAlphaPickerClickFn = fn;

                    element.addEventListener('click', fn);
                }

            } else {

                if (itemsContainer) {
                    dom.removeEventListener(itemsContainer, 'focus', onItemsFocusIn, {
                        capture: true,
                        passive: true
                    });
                }

                element.removeEventListener('click', onAlphaPickerInKeyboardModeClick);
                element.removeEventListener('focus', onAlphaPickerFocusIn, true);

                fn = element.onAlphaPickerClickFn;
                if (fn) {
                    element.removeEventListener('click', fn);
                    element.onAlphaPickerClickFn = null;
                }
            }
        };

        render(element, options);

        this.enabled(true);
        this.visible(true);
    }

    AlphaPicker.prototype.value = function (value, applyValue) {

        var element = this.options.element;
        var btn, selected;

        if (value !== undefined) {
            if (value != null) {

                value = value.toUpperCase();
                this._currentValue = value;

                if (this.options.mode !== 'keyboard') {
                    selected = element.querySelector('.' + selectedButtonClass);

                    try {
                        btn = element.querySelector('.alphaPickerButton[data-value=\'' + value + '\']');
                    } catch (err) {
                        console.log('Error in querySelector: ' + err);
                    }

                    if (btn && btn !== selected) {
                        btn.classList.add(selectedButtonClass);
                    }
                    if (selected && selected !== btn) {
                        selected.classList.remove(selectedButtonClass);
                    }
                }
            } else {
                this._currentValue = value;

                selected = element.querySelector('.' + selectedButtonClass);
                if (selected) {
                    selected.classList.remove(selectedButtonClass);
                }
            }
        }

        if (applyValue) {
            element.dispatchEvent(new CustomEvent("alphavaluechanged", {
                cancelable: false,
                detail: {
                    value: value
                }
            }));
        }

        return this._currentValue;
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

        var value = this.value();

        element.querySelector('.alphaPickerRow').innerHTML = html;

        if (value) {
            this.value(value, false);
        }
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
        this.options = null;
        this.valueChangeEvent = null;
    };

    return AlphaPicker;
});