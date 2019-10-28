define(['browser', 'appSettings', 'events'], function (browser, appSettings, events) {
    'use strict';

    function setLayout(instance, layout, selectedLayout) {

        if (layout === selectedLayout) {
            instance[layout] = true;
            document.documentElement.classList.add('layout-' + layout);
        } else {
            instance[layout] = false;
            document.documentElement.classList.remove('layout-' + layout);
        }
    }

    function LayoutManager() {

    }

    LayoutManager.prototype.setLayout = function (layout, save) {

        if (!layout || layout === 'auto') {
            this.autoLayout();

            if (save !== false) {
                appSettings.set('layout', '');
            }
        } else {
            setLayout(this, 'mobile', layout);
            setLayout(this, 'tv', layout);
            setLayout(this, 'desktop', layout);

            if (save !== false) {
                appSettings.set('layout', layout);
            }
        }

        events.trigger(this, 'modechange');
    };

    function isCoarseInput() {

        try {

            if (window.matchMedia('(pointer: coarse)').matches) {
                return true;
            }

            if (window.matchMedia('(pointer: fine)').matches) {
                return false;
            }

            if (window.matchMedia('(pointer: none)').matches) {
                return false;
            }
        }
        catch (err) {
            console.log('error using window.matchMedia');
        }

        // assume coarse input if touch events are supported
        return ('ontouchstart' in document.documentElement);
    }

    LayoutManager.prototype.getSavedLayout = function (layout) {

        return appSettings.get('layout');
    };

    LayoutManager.prototype.autoLayout = function () {

        // Take a guess at initial layout. The consuming app can override
        this.setLayout(this.getDefaultLayout(), false);
    };

    LayoutManager.prototype.getDefaultLayout = function () {

        if (this.getPlatformDefaultLayout) {
            var result = this.getPlatformDefaultLayout();
            if (result) {
                return result;
            }
        }

        if (browser.xboxOne || browser.ps4 || browser.chromecast || browser.netcast || browser.operaTv) {
            return 'tv';
        }

        if (browser.mobile) {
            return 'mobile';
        }

        if (browser.tv) {
            return 'tv';
        }

        if (isCoarseInput()) {
            return 'mobile';
        }

        if (self.Dashboard) {
            return 'desktop';
        }

        return 'tv';
    };

    LayoutManager.prototype.init = function () {
        var saved = this.getSavedLayout();
        if (saved) {
            this.setLayout(saved, false);
        } else {
            this.autoLayout();
        }
    };

    return new LayoutManager();
});