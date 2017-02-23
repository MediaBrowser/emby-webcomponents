define(['scroller', 'dom', 'registerElement'], function (scroller, dom) {
    'use strict';

    var ScrollerProtoType = Object.create(HTMLDivElement.prototype);

    ScrollerProtoType.createdCallback = function () {
        this.classList.add('emby-scroller');
    };

    function initCenterFocus(elem, scrollerInstance, className) {

        dom.addEventListener(elem, 'focus', function (e) {

            var focused = dom.parentWithClass(e.target, className);

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

    ScrollerProtoType.attachedCallback = function () {

        var horizontal = true;

        this.style.overflow = 'hidden';
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
            touchDragging: 1,
            slidee: slider,
            smart: true,
            releaseSwing: true,
            scrollBy: 200,
            speed: 300,
            //immediateSpeed: pageOptions.immediateSpeed,
            elasticBounds: 1,
            dragHandle: 1,
            scrollWidth: 500000,
            frameSizeElement: frameSizeElement,
            autoImmediate: true
        };

        this.scroller = new scroller(this, options);
        this.scroller.init();

        var centerFocus = this.getAttribute('data-centerfocus');
        if (centerFocus) {
            initCenterFocus(this, this.scroller, centerFocus);
        }
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