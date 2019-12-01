define(['browser', 'css!./appfooter'], function (browser) {
    'use strict';

    function render() {

        var elem = document.createElement('div');

        elem.classList.add('appfooter');

        elem.classList.add('appfooter-withbackdropfilter');

        document.body.appendChild(elem);

        return elem;
    }

    function AppFooter() {

        var self = this;

        this.element = render();
    }

    AppFooter.prototype.add = function (elem) {
        this.element.appendChild(elem);
    };

    AppFooter.prototype.insert = function (elem) {

        var thisElement = this.element;

        if (typeof elem === 'string') {
            thisElement.insertAdjacentHTML('afterbegin', elem);
        } else {
            thisElement.insertBefore(elem, thisElement.firstChild);
        }
    };

    AppFooter.prototype.destroy = function () {
        var self = this;

        self.element = null;
    };

    return AppFooter;
});