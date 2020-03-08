define(['browser', 'appSettings', 'events', 'apphost'], function (browser, appSettings, events, appHost) {
    'use strict';

    var currentLayout;

    function setLayout(instance, layout, selectedLayout) {

        if (layout === selectedLayout) {
            instance[layout] = true;

            if (layout === 'tv') {
                document.documentElement.classList.add('layout-' + layout);
            }
        } else {
            instance[layout] = false;
            if (layout === 'tv') {
                document.documentElement.classList.remove('layout-' + layout);
            }
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

            var changed = currentLayout !== layout;
            currentLayout = layout;

            if (changed) {
                events.trigger(this, 'modechange');
            }
        }
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

    function isMobile() {

        var terms = [
            'mobi',
            'ipad',
            'iphone',
            'ipod',
            'silk',
            'gt-p1000',
            'nexus 7',
            'kindle fire',
            'opera mini'
        ];

        var lower = navigator.userAgent.toLowerCase();

        for (var i = 0, length = terms.length; i < length; i++) {
            if (lower.indexOf(terms[i]) !== -1) {
                return true;
            }
        }

        return false;
    }

    var isElectron = (navigator.userAgent || '').toLowerCase().indexOf('electron') !== -1;

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

        if (isMobile()) {
            return 'mobile';
        }

        if (browser.tv) {
            return 'tv';
        }

        if (isCoarseInput()) {
            return 'mobile';
        }

        if ((navigator.userAgent || '').toLowerCase().indexOf('electron') !== -1) {
            return 'tv';
        }

        if (window.location.href.toString().toLowerCase().indexOf('tv.emby') !== -1) {
            return 'tv';
        }

        return 'desktop';
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