define(['visibleinviewport', 'browser', 'dom'], function (visibleinviewport, browser, dom) {
    'use strict';

    var self = {};

    function unveilElements(elements, root, callback) {

        if (!elements.length) {
            return;
        }

        var filledCount = 0;

        var options = {};

        //options.rootMargin = "300%";

        var observer = new IntersectionObserver(function (entries) {
            for (var j = 0, length2 = entries.length; j < length2; j++) {
                var entry = entries[j];
                var target = entry.target;
                observer.unobserve(target);
                callback(target);
                filledCount++;
            }
        },
        options
        );
        // Start observing an element
        for (var i = 0, length = elements.length; i < length; i++) {
            observer.observe(elements[i]);
        }
    }

    function lazyChildren(elem, callback) {

        unveilElements(elem.getElementsByClassName('lazy'), elem, callback);
    }

    self.lazyChildren = lazyChildren;

    return self;
});