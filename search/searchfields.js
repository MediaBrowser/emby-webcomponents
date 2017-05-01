define(['layoutManager', 'globalize', 'require', 'events', 'alphaPicker', 'emby-input', 'flexStyles', 'material-icons', 'css!./searchfields'], function (layoutManager, globalize, require, events, AlphaPicker) {
    'use strict';

    function triggerSearch(instance, value) {

        events.trigger(instance, 'search', [value]);
    }

    function onAlphaValueClicked(e) {

        var value = e.detail.value;
        var searchFieldsInstance = this;

        var txtSearch = searchFieldsInstance.options.element.querySelector('.searchfields-txtSearch');

        if (value === 'backspace') {

            var val = txtSearch.value;
            txtSearch.value = val.length ? val.substring(0, val.length - 1) : '';

        } else {
            txtSearch.value += value;
        }

        txtSearch.dispatchEvent(new CustomEvent('input', {
            bubbles: true
        }));
    }

    function initAlphaPicker(alphaPickerElement, instance) {

        instance.alphaPicker = new AlphaPicker({
            element: alphaPickerElement,
            mode: 'keyboard'
        });

        alphaPickerElement.addEventListener('alphavalueclicked', onAlphaValueClicked.bind(instance));
    }

    function onSearchInput(e) {

        var value = e.target.value;
        var searchFieldsInstance = this;
        triggerSearch(searchFieldsInstance, value);
    }

    function embed(elem, instance, options) {

        require(['text!./searchfields.template.html'], function (template) {

            var html = globalize.translateDocument(template, 'sharedcomponents');

            elem.innerHTML = html;

            elem.classList.add('searchFields');

            var txtSearch = elem.querySelector('.searchfields-txtSearch');

            if (layoutManager.tv) {
                var alphaPickerElement = elem.querySelector('.alphaPicker');

                elem.querySelector('.alphaPicker').classList.remove('hide');
                initAlphaPicker(alphaPickerElement, instance);
            }

            txtSearch.addEventListener('input', onSearchInput.bind(instance));
        });
    }

    function SearchFields(options) {

        this.options = options;
        embed(options.element, this, options);
    }

    SearchFields.prototype.focus = function () {

        this.options.element.querySelector('.searchfields-txtSearch').focus();
    };

    SearchFields.prototype.destroy = function () {

        var options = this.options;
        if (options) {
            options.element.classList.remove('searchFields');
        }
        this.options = null;

        var alphaPicker = this.alphaPicker;
        if (alphaPicker) {
            alphaPicker.destroy();
        }
        this.alphaPicker = null;
    };

    return SearchFields;
});