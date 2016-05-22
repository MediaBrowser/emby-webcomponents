define(['layoutManager', 'browser', 'actionsheet', 'css!./emby-select'], function (layoutManager, browser, actionsheet) {

    var EmbySelectPrototype = Object.create(HTMLSelectElement.prototype);

    function enableNativeMenu() {

        // Take advantage of the native input methods
        if (browser.tv) {
            return true;
        }

        if (layoutManager.tv) {
            return false;
        }

        return true;
    }

    function showActionSheeet(select) {

        actionsheet.show({
            items: select.options,
            positionTo: select

        }).then(function (value) {
            select.value = value;
        });
    }

    function onMouseDown(e) {

        if (!enableNativeMenu()) {
            e.preventDefault();
            showActionSheeet(this);
        }
    }

    function onKeyDown(e) {

        switch (e.keyCode) {

            case 13:
                if (!enableNativeMenu()) {
                    e.preventDefault();
                    showActionSheeet(this);
                }
                return;
            case 37:
            case 38:
            case 39:
            case 40:
                if (layoutManager.tv) {
                    e.preventDefault();
                }
                return;
            default:
                break;
        }
    }

    EmbySelectPrototype.createdCallback = function () {

        if (!this.id) {
            this.id = 'select' + new Date().getTime();
        }
        this.addEventListener('mousedown', onMouseDown);
        this.addEventListener('keydown', onKeyDown);
    };

    EmbySelectPrototype.attachedCallback = function () {

        var label = this.ownerDocument.createElement('label');
        label.innerHTML = this.getAttribute('label') || '';
        label.classList.add('selectLabel');
        label.htmlFor = this.id;
        this.parentNode.insertBefore(label, this);
    };

    document.registerElement('emby-select', {
        prototype: EmbySelectPrototype,
        extends: 'select'
    });
});