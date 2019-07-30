define(['focusManager', 'dom', 'scrollStyles'], function (focusManager, dom) {
    'use strict';

    function getBoundingClientRect(elem) {

        // Support: BlackBerry 5, iOS 3 (original iPhone)
        // If we don't have gBCR, just use 0,0 rather than error
        if (elem.getBoundingClientRect) {
            return elem.getBoundingClientRect();
        } else {
            return { top: 0, left: 0 };
        }
    }

    function getPosition(scrollContainer, item, horizontal) {

        var slideeOffset = getBoundingClientRect(scrollContainer);
        var itemOffset = getBoundingClientRect(item);

        var offset = horizontal ? itemOffset.left - slideeOffset.left : itemOffset.top - slideeOffset.top;
        var size = horizontal ? itemOffset.width : itemOffset.height;
        if (!size && size !== 0) {
            size = item[horizontal ? 'offsetWidth' : 'offsetHeight'];
        }

        var currentStart = horizontal ? scrollContainer.scrollLeft : scrollContainer.scrollTop;

        offset += currentStart;

        var frameSize = horizontal ? scrollContainer.offsetWidth : scrollContainer.offsetHeight;

        var currentEnd = currentStart + frameSize;

        var isVisible = offset >= currentStart && (offset + size) <= currentEnd;

        return {
            start: offset,
            center: (offset - (frameSize / 2) + (size / 2)),
            end: offset - frameSize + size,
            size: size,
            isVisible: isVisible
        };
    }

    function toCenter(container, elem, horizontal, skipWhenVisible) {
        var pos = getPosition(container, elem, horizontal);

        if (skipWhenVisible && pos.isVisible) {
            return;
        }

        if (container.scrollTo) {
            if (horizontal) {
                container.scrollTo(pos.center, 0);
            } else {
                container.scrollTo(0, pos.center);
            }
        } else {
            if (horizontal) {
                container.scrollLeft = Math.round(pos.center);
            } else {
                container.scrollTop = Math.round(pos.center);
            }
        }
    }

    function toStart(container, elem, horizontal, skipWhenVisible) {
        var pos = getPosition(container, elem, horizontal);

        if (skipWhenVisible && pos.isVisible) {
            return;
        }

        if (container.scrollTo) {
            if (horizontal) {
                container.scrollTo(pos.start, 0);
            } else {
                container.scrollTo(0, pos.start);
            }
        } else {
            if (horizontal) {
                container.scrollLeft = Math.round(pos.start);
            } else {
                container.scrollTop = Math.round(pos.start);
            }
        }
    }

    return {
        getPosition: getPosition,
        toCenter: toCenter,
        toStart: toStart
    };
});