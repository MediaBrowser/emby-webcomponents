define(['css!./emby-checkbox', 'registerElement'], function () {

    var EmbyCheckboxPrototype = Object.create(HTMLInputElement.prototype);

    EmbyCheckboxPrototype.attachedCallback = function () {

        if (this.getAttribute('data-embycheckbox') == 'true') {
            return;
        }

        this.setAttribute('data-embycheckbox', 'true');

        this.classList.add('mdl-checkbox__input');

        var labelElement = this.parentNode;
        //labelElement.classList.add('mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect mdl-js-ripple-effect--ignore-events');
        labelElement.classList.add('mdl-checkbox');
        labelElement.classList.add('mdl-js-checkbox');
        labelElement.classList.add('mdl-js-ripple-effect');

        var labelTextElement = labelElement.querySelector('span');
        labelElement.insertAdjacentHTML('beforeend', '<span class="mdl-checkbox__focus-helper"></span><span class="mdl-checkbox__box-outline"><span class="mdl-checkbox__tick-outline"></span></span>');

        labelTextElement.classList.add('mdl-checkbox__label');
    };

    document.registerElement('emby-checkbox', {
        prototype: EmbyCheckboxPrototype,
        extends: 'input'
    });
});