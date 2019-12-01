define(['lazyLoader', 'layoutManager', 'browser', 'appSettings', 'require'], function (lazyLoader, layoutManager, browser, appSettings, require) {
    'use strict';

    var supportsNativeLazyLoading = 'loading' in HTMLImageElement.prototype;

    if (!supportsNativeLazyLoading) {
        require(['css!./style']);
    }

    var self = {};

    function fillImage(elem, source) {

        if (!source && supportsNativeLazyLoading) {
            return;
        }

        if (elem.tagName === "IMG") {

            elem.setAttribute("src", source || elem.getAttribute('data-src'));
            elem.removeAttribute("data-src");
            return;
        }

        if (source) {
            elem.style.backgroundImage = "url('" + source + "')";
        }

        elem.classList.remove('lazy');
    }

    function lazyChildren(elem) {

        if (!supportsNativeLazyLoading) {
            lazyLoader.lazyChildren(elem, fillImage);
        }
    }

    function getPrimaryImageAspectRatio(items, options) {

        var values = [];

        for (var i = 0, length = items.length; i < length; i++) {

            var item = items[i];
            var imageItem;
            if (options && options.showCurrentProgramImage) {
                imageItem = item.CurrentProgram || item;
            }
            else {
                imageItem = item.ProgramInfo || item;
            }

            var ratio = imageItem.PrimaryImageAspectRatio || 0;

            if (!ratio) {
                continue;
            }

            values[values.length] = ratio;
        }

        if (!values.length) {
            return null;
        }

        // Use the median
        values.sort(function (a, b) { return a - b; });

        var half = Math.floor(values.length / 2);

        var result;

        if (values.length % 2) {
            result = values[half];
        }
        else {
            result = (values[half - 1] + values[half]) / 2.0;
        }

        // If really close to 2:3 (poster image), just return 2:3
        var aspect2x3 = 2 / 3;
        if (Math.abs(aspect2x3 - result) <= 0.1666667) {
            return aspect2x3;
        }

        // If really close to 16:9 (episode image), just return 16:9
        var aspect16x9 = 16 / 9;
        if (Math.abs(aspect16x9 - result) <= 0.222222) {
            return aspect16x9;
        }

        var aspectFourThree = 4 / 3;
        if (Math.abs(aspectFourThree - result) <= 0.2) {
            return aspectFourThree;
        }

        // If really close to 1 (square image), just return 1
        if (Math.abs(1 - result) <= 0.1666667) {
            return 1;
        }

        return result;
    }

    function fillImages(elems) {

        if (supportsNativeLazyLoading) {
            return;
        }

        for (var i = 0, length = elems.length; i < length; i++) {
            var elem = elems[0];
            fillImage(elem);
        }
    }

    self.fillImages = fillImages;
    self.lazyImage = fillImage;
    self.lazyChildren = lazyChildren;
    self.getPrimaryImageAspectRatio = getPrimaryImageAspectRatio;

    return self;
});