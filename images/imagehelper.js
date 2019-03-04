define(['lazyLoader', 'imageFetcher', 'layoutManager', 'browser', 'appSettings', 'require'], function (lazyLoader, imageFetcher, layoutManager, browser, appSettings, require) {
    'use strict';

    var requestIdleCallback = window.requestIdleCallback || function (fn) {
        fn();
    };

    var self = {};

    // seeing slow performance with firefox
    var enableFade = false;

    function fillImage(elem, source, enableEffects) {

        if (!elem) {
            throw new Error('elem cannot be null');
        }

        if (!source) {
            source = elem.getAttribute('data-src');
        }

        if (!source) {
            return;
        }

        fillImageElement(elem, source, enableEffects);
    }

    function fillImageElement(elem, source, enableEffects) {
        imageFetcher.loadImage(elem, source).then(function () {

            if (enableFade && enableEffects !== false) {
                fadeIn(elem);
            }

            elem.removeAttribute("data-src");
        });
    }

    function getSwatchString(swatch) {

        if (swatch) {
            return swatch.getHex() + '|' + swatch.getBodyTextColor() + '|' + swatch.getTitleTextColor();
        }
        return '||';
    }

    function fadeIn(elem) {

        var cssClass = 'lazy-image-fadein';

        elem.classList.add(cssClass);
    }

    function lazyChildren(elem) {

        lazyLoader.lazyChildren(elem, fillImage);
    }

    function getPrimaryImageAspectRatio(items) {

        var values = [];

        for (var i = 0, length = items.length; i < length; i++) {

            var item = items[i];
            var imageItem = item.ProgramInfo || item;
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