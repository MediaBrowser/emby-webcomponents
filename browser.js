﻿define([], function () {
    'use strict';

    function isTv() {

        // This is going to be really difficult to get right
        var userAgent = navigator.userAgent.toLowerCase();

        if (userAgent.indexOf('tv') !== -1) {
            return true;
        }

        if (userAgent.indexOf('samsungbrowser') !== -1) {
            return true;
        }

        if (userAgent.indexOf('nintendo') !== -1) {
            return true;
        }

        if (userAgent.indexOf('viera') !== -1) {
            return true;
        }

        if (userAgent.indexOf('web0s') !== -1) {
            return true;
        }

        return false;
    }

    function isMobile(userAgent) {

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

        var lower = userAgent.toLowerCase();

        for (var i = 0, length = terms.length; i < length; i++) {
            if (lower.indexOf(terms[i]) !== -1) {
                return true;
            }
        }

        return false;
    }

    function isStyleSupported(prop, value) {

        if (typeof window === 'undefined') {
            return false;
        }

        // If no value is supplied, use "inherit"
        value = arguments.length === 2 ? value : 'inherit';
        // Try the native standard method first
        if ('CSS' in window && 'supports' in window.CSS) {
            return window.CSS.supports(prop, value);
        }
        // Check Opera's native method
        if ('supportsCSS' in window) {
            return window.supportsCSS(prop, value);
        }

        // need try/catch because it's failing on tizen

        try {
            // Convert to camel-case for DOM interactions
            var camel = prop.replace(/-([a-z]|[0-9])/ig, function (all, letter) {
                return (letter + '').toUpperCase();
            });
            // Create test element
            var el = document.createElement('div');
            // Check if the property is supported
            var support = (camel in el.style);
            if (support) {
                // Assign the property and value to invoke
                // the CSS interpreter
                el.style.cssText = prop + ':' + value;
                // Ensure both the property and value are
                // supported and return
                return el.style[camel] !== '';
            }
        } catch (err) {
        }

        return false;
    }

    function hasKeyboard(browser) {

        if (browser.touch) {
            return true;
        }

        if (browser.xboxOne) {
            return true;
        }

        if (browser.ps4) {
            return true;
        }

        if (browser.edgeUwp) {
            // This is OK for now, but this won't always be true
            // Should we use this?
            // https://gist.github.com/wagonli/40d8a31bd0d6f0dd7a5d
            return true;
        }

        if (browser.tv) {
            return true;
        }

        return false;
    }

    function iOSversion() {
        if (/iP(hone|od|ad)/.test(navigator.platform)) {
            // supports iOS 2.0 and later: <http://bit.ly/TJjs1V>
            var v = (navigator.appVersion).match(/OS (\d+)_(\d+)_?(\d+)?/);
            return [parseInt(v[1], 10), parseInt(v[2], 10), parseInt(v[3] || 0, 10)];
        }
    }

    var _supportsCssAnimation;
    var _supportsCssAnimationWithPrefix;
    function supportsCssAnimation(allowPrefix) {

        if (allowPrefix) {
            if (_supportsCssAnimationWithPrefix === true || _supportsCssAnimationWithPrefix === false) {
                return _supportsCssAnimationWithPrefix;
            }
        } else {
            if (_supportsCssAnimation === true || _supportsCssAnimation === false) {
                return _supportsCssAnimation;
            }
        }

        var animation = false,
            animationstring = 'animation',
            keyframeprefix = '',
            domPrefixes = ['Webkit', 'O', 'Moz'],
            pfx = '',
            elm = document.createElement('div');

        if (elm.style.animationName !== undefined) { animation = true; }

        if (animation === false && allowPrefix) {
            for (var i = 0; i < domPrefixes.length; i++) {
                if (elm.style[domPrefixes[i] + 'AnimationName'] !== undefined) {
                    pfx = domPrefixes[i];
                    animationstring = pfx + 'Animation';
                    keyframeprefix = '-' + pfx.toLowerCase() + '-';
                    animation = true;
                    break;
                }
            }
        }

        if (allowPrefix) {
            _supportsCssAnimationWithPrefix = animation;
            return _supportsCssAnimationWithPrefix;
        } else {
            _supportsCssAnimation = animation;
            return _supportsCssAnimation;
        }
    }

    var uaMatch = function (ua) {
        ua = ua.toLowerCase();

        var match = /(edge)[ \/]([\w.]+)/.exec(ua) ||
            /(opera)[ \/]([\w.]+)/.exec(ua) ||
            /(opr)[ \/]([\w.]+)/.exec(ua) ||
            /(chrome)[ \/]([\w.]+)/.exec(ua) ||
            /(safari)[ \/]([\w.]+)/.exec(ua) ||
            /(firefox)[ \/]([\w.]+)/.exec(ua) ||
            /(msie) ([\w.]+)/.exec(ua) ||
            ua.indexOf("compatible") < 0 && /(mozilla)(?:.*? rv:([\w.]+)|)/.exec(ua) ||
            [];

        var versionMatch = /(version)[ \/]([\w.]+)/.exec(ua);

        var platform_match = /(ipad)/.exec(ua) ||
            /(iphone)/.exec(ua) ||
            /(windows)/.exec(ua) ||
            /(android)/.exec(ua) ||
            [];

        var browser = match[1] || "";

        if (browser === "edge") {
            platform_match = [""];
        } else {
            if (ua.indexOf("windows phone") !== -1 || ua.indexOf("iemobile") !== -1) {

                // http://www.neowin.net/news/ie11-fakes-user-agent-to-fool-gmail-in-windows-phone-81-gdr1-update
                browser = "msie";
            }
            else if (ua.indexOf("like gecko") !== -1 && ua.indexOf('webkit') === -1 && ua.indexOf('opera') === -1 && ua.indexOf('chrome') === -1 && ua.indexOf('safari') === -1) {
                browser = "msie";
            }
        }

        if (browser === 'opr') {
            browser = 'opera';
        }

        var version;
        if (versionMatch && versionMatch.length > 2) {
            version = versionMatch[2];
        }

        version = version || match[2] || "0";

        var versionMajor = parseInt(version.split('.')[0]);

        if (isNaN(versionMajor)) {
            versionMajor = 0;
        }

        return {
            browser: browser,
            version: version,
            platform: platform_match[0] || "",
            versionMajor: versionMajor
        };
    };

    var userAgent = navigator.userAgent;

    var matched = uaMatch(userAgent);
    var browser = {};

    if (matched.browser) {
        browser[matched.browser] = true;
        browser.version = matched.version;
        browser.versionMajor = matched.versionMajor;
    }

    if (matched.platform) {
        browser[matched.platform] = true;
    }

    if (!browser.chrome && !browser.msie && !browser.edge && !browser.opera && userAgent.toLowerCase().indexOf("webkit") !== -1) {
        browser.safari = true;
    }

    if (userAgent.toLowerCase().indexOf("playstation 4") !== -1) {
        browser.ps4 = true;
        browser.tv = true;
    }

    if (isMobile(userAgent)) {
        browser.mobile = true;
    }

    browser.xboxOne = userAgent.toLowerCase().indexOf('xbox') !== -1;
    browser.animate = typeof document !== 'undefined' && document.documentElement.animate != null;
    browser.tizen = userAgent.toLowerCase().indexOf('tizen') !== -1 || self.tizen != null;
    browser.web0s = userAgent.toLowerCase().indexOf('Web0S'.toLowerCase()) !== -1;
    browser.edgeUwp = browser.edge && (userAgent.toLowerCase().indexOf('msapphost') !== -1 || userAgent.toLowerCase().indexOf('webview') !== -1);

    if (!browser.tizen) {
        browser.orsay = userAgent.toLowerCase().indexOf('smarthub') !== -1;
    }

    if (browser.edgeUwp) {
        browser.edge = true;
    }

    browser.tv = isTv();
    browser.operaTv = browser.tv && userAgent.toLowerCase().indexOf('opr/') !== -1;

    if (!isStyleSupported('display', 'flex')) {
        browser.noFlex = true;
    }

    if (browser.mobile || browser.tv) {
        browser.slow = true;
    }

    if (typeof document !== 'undefined') {
        if (('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch) {
            browser.touch = true;
        }
    }

    browser.keyboard = hasKeyboard(browser);
    browser.supportsCssAnimation = supportsCssAnimation;

    browser.osx = userAgent.toLowerCase().indexOf('os x') !== -1;
    browser.iOS = browser.ipad || browser.iphone || browser.ipod;

    browser.customElements = ('customElements' in self);
    browser.customBuiltInElements = browser.customElements && !browser.iOS && !browser.safari && customElements.upgrade;

    if (browser.iOS) {
        browser.iOSVersion = iOSversion();
        browser.iOSVersion = browser.iOSVersion[0] + (browser.iOSVersion[1] / 10);
    }

    browser.chromecast = browser.chrome && userAgent.toLowerCase().indexOf('crkey') !== -1;

    return browser;
});