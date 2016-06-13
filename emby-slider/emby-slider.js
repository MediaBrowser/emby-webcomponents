define(['css!./emby-slider', 'registerElement', 'emby-input'], function () {

    var EmbySliderPrototype = Object.create(HTMLInputElement.prototype);

    function updateValues(range, backgroundLower, backgroundUpper) {

        var fraction = (range.value - range.min) / (range.max - range.min);

        //if (fraction === 0) {
        //    range.classList.add('is-lowest-value');
        //} else {
        //    range.classList.remove('is-lowest-value');
        //}

        backgroundLower.style.flex = fraction;
        backgroundLower.style.webkitFlex = fraction;
        backgroundUpper.style.flex = 1 - fraction;
        backgroundUpper.style.webkitFlex = 1 - fraction;
    }

    EmbySliderPrototype.attachedCallback = function () {

        if (this.getAttribute('data-embycheckbox') == 'true') {
            return;
        }

        this.setAttribute('data-embycheckbox', 'true');

        this.classList.add('mdl-slider');
        this.classList.add('mdl-js-slider');

        var containerElement = this.parentNode;
        containerElement.classList.add('mdl-slider__container');

        containerElement.insertAdjacentHTML('beforeend', '<div class="mdl-slider__background-flex"><div class="mdl-slider__background-lower"></div><div class="mdl-slider__background-upper"></div></div>');

        var backgroundLower = containerElement.querySelector('.mdl-slider__background-lower');
        var backgroundUpper = containerElement.querySelector('.mdl-slider__background-upper');

        var lastUpdateValues = 0;

        this.addEventListener('input', function () {
            this.dragging = true;
            var now = new Date().getTime();

            if ((now - lastUpdateValues) >= 500) {
                lastUpdateValues = now;
                updateValues(this, backgroundLower, backgroundUpper);
            }
        });
        this.addEventListener('change', function () {
            this.dragging = false;
            var now = new Date().getTime();

            if ((now - lastUpdateValues) >= 500) {
                lastUpdateValues = now;
                updateValues(this, backgroundLower, backgroundUpper);
            }
        });
        this.addEventListener('valueset', function () {

            var now = new Date().getTime();

            if ((now - lastUpdateValues) >= 500) {
                lastUpdateValues = now;
                updateValues(this, backgroundLower, backgroundUpper);
            }
        });
    };

    document.registerElement('emby-slider', {
        prototype: EmbySliderPrototype,
        extends: 'input'
    });
});