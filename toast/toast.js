define(['css!./toast'], function () {
    'use strict';

    function remove(elem) {

        setTimeout(function () {
            elem.parentNode.removeChild(elem);
        }, 300);
    }

    function animateRemove(elem, timeoutMs) {

        setTimeout(function () {

            elem.classList.remove('toastVisible');
            remove(elem);

        }, timeoutMs + 300);
    }

    return function (options) {

        if (typeof options === 'string') {
            options = {
                text: options
            };
        }

        var elem = document.createElement("div");
        elem.classList.add('toast');
        elem.innerHTML = options.text;

        document.body.appendChild(elem);

        // force a reflow
        void elem.offsetHeight;

        elem.classList.add('toastVisible');

        animateRemove(elem, options.timeoutMs || 3000);
    };
});