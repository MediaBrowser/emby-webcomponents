define(['scroller', 'dom', 'registerElement'], function (scroller, dom) {
    'use strict';

    var ScrollerProtoType = Object.create(HTMLDivElement.prototype);

    ScrollerProtoType.createdCallback = function () {
        this.classList.add('emby-scroller');
    };

    function initCenterFocus(elem, scrollerInstance, selector) {

        var classNames = selector.split(',');

        dom.addEventListener(elem, 'focus', function (e) {

            var focused = dom.parentWithClass(e.target, classNames);

            if (focused) {
                scrollerInstance.toCenter(focused);
            }

        }, {
            capture: true,
            passive: true
        });
    }

    ScrollerProtoType.scrollToBeginning = function () {
        if (this.scroller) {
            this.scroller.slideTo(0, true);
        }
    };

    ScrollerProtoType.scrollToPosition = function (pos, immediate) {
        if (this.scroller) {
            this.scroller.slideTo(pos, immediate);
        }
    };

    ScrollerProtoType.getScrollPosition = function () {
        if (this.scroller) {
            return this.scroller.getScrollPosition();
        }
    };

    ScrollerProtoType.attachedCallback = function () {

        var horizontal = this.getAttribute('data-horizontal') !== 'false';

        var slider = this.querySelector('.scrollSlider');

        if (horizontal) {
            slider.style['white-space'] = 'nowrap';
        }

        var frameSizeElement;
        var frameSizeConfig = this.getAttribute('data-framesize');

        if (frameSizeConfig === 'matchparent') {
            frameSizeElement = this.parentNode;
        }
        else if (frameSizeConfig === 'matchgrandparent') {
            frameSizeElement = this.parentNode.parentNode;
        }
        var options = {
            horizontal: horizontal,
            mouseDragging: 1,
            mouseWheel: this.getAttribute('data-mousewheel') !== 'false',
            touchDragging: 1,
            slidee: slider,
            scrollBy: 200,
            speed: 300,
            //immediateSpeed: pageOptions.immediateSpeed,
            elasticBounds: 1,
            dragHandle: 1,
            scrollWidth: 500000,
            frameSizeElement: frameSizeElement,
            autoImmediate: true,
            skipSlideToWhenVisible: this.getAttribute('data-skipfocuswhenvisible') === 'true'
        };

        // If just inserted it might not have any height yet - yes this is a hack
        var self = this;
        setTimeout(function () {
            self.scroller = new scroller(self, options);
            self.scroller.init();

            var centerFocus = self.getAttribute('data-centerfocus');
            if (centerFocus) {
                initCenterFocus(self, self.scroller, centerFocus);
            }
        }, 0);
    };

    ScrollerProtoType.detachedCallback = function () {

        var scrollerInstance = this.scroller;
        if (scrollerInstance) {
            scrollerInstance.destroy();
            this.scroller = null;
        }
    };

    document.registerElement('emby-scroller', {
        prototype: ScrollerProtoType,
        extends: 'div'
    });
});