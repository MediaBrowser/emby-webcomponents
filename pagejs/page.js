define([], function () {

    'use strict';

    /**
     * To work properly with the URL
     * history.location generated polyfill in https://github.com/devote/HTML5-History-API
     */

    var location = ('undefined' !== typeof window) && (window.history.location || window.location);

    /**
     * Perform initial dispatch.
     */

    var dispatch = true;

    /**
     * Base path.
     */

    var base = '';

    /**
     * Running flag.
     */

    var running;

    /**
     * HashBang option
     */

    var hashbang = false;

    var enableHistory = false;

    /**
     * Previous context, for capturing page exit events.
     */

    var prevContext;

    var prevPageContext;
    var backStack = [];

    var allRoutes = [];

    /**
      * Register `path` with callback `fn()`,
      * or route `path`, or redirection,
      * or `page.start()`.
      *
      *   page(fn);
      *   page('*', fn);
      *   page('/user/:id', load, user);
      *   page('/user/' + user.id, { some: 'thing' });
      *   page('/user/' + user.id);
      *   page('/from', '/to')
      *   page();
      *
      * @param {String|Function} path
      * @param {Function} fn...
      * @api public
      */

    function page(path, routeInfo, fn) {

        // route <path> to <callback ...>
        if ('function' === typeof fn) {

            page.callbacks[path.toUpperCase()] = {
                routeInfo: routeInfo,
                fn: fn
            };

            allRoutes.push(routeInfo);

        } else {
            page.start(path);
        }
    }

    page.getRoutes = function () {
        return allRoutes;
    };

    /**
     * Callback functions.
     */

    page.callbacks = {};

    /**
     * Current path being processed
     * @type {String}
     */
    page.current = '';

    /**
     * Number of pages navigated to.
     * @type {number}
     *
     *     page.len == 0;
     *     page('/login');
     *     page.len == 1;
     */

    page.len = 0;

    /**
     * Get or set basepath to `path`.
     *
     * @param {String} path
     * @api public
     */

    page.base = function (path) {
        if (0 === arguments.length) {
            return base;
        }
        base = path;
    };

    /**
   * Handle "populate" events.
   */

    var onpopstate = (function () {
        var loaded = false;
        if ('undefined' === typeof window) {
            return;
        }
        if (document.readyState === 'complete') {
            loaded = true;
        } else {
            window.addEventListener('load', function () {
                setTimeout(function () {
                    loaded = true;
                }, 0);
            });
        }
        return function onpopstate(e) {
            if (!loaded) {
                return;
            }
            if (ignorePopState(e)) {
                return;
            }
            if (e.state) {
                var path = e.state.path;
                page.replace(path, e.state, null, null, true);
            } else {
                page.show(location.pathname + location.hash, undefined, undefined, false, true);
            }
        };
    })();
    /**
     * Handle "click" events.
     */

    /**
     * Bind with the given `options`.
     *
     * Options:
     *
     *    - `click` bind to click events [true]
     *    - `popstate` bind to popstate [true]
     *    - `dispatch` perform initial dispatch [true]
     *
     * @param {Object} options
     * @api public
     */

    page.start = function (options) {
        options = options || {};
        if (running) {
            return;
        }
        running = true;
        if (false === options.dispatch) {
            dispatch = false;
        }
        if (false !== options.popstate) {
            window.addEventListener('popstate', onpopstate, false);
        }
        if (options.enableHistory != null) {
            enableHistory = options.enableHistory;
        }
        if (true === options.hashbang) {
            hashbang = true;
        }
        if (!dispatch) {
            return;
        }

        var url;

        if (hashbang && ~location.hash.indexOf('#!')) {

            url = location.hash.substr(2);

            var href = location.href.toString();
            if (href.indexOf('?') >= href.indexOf('#!')) {
                url += location.search;
            }
        }
        else {
            url = location.pathname + location.search + location.hash;
        }

        page.replace(url, null, true, dispatch);
    };

    /**
     * Show `path` with optional `state` object.
     *
     * @param {String} path
     * @param {Object} state
     * @param {Boolean} dispatch
     * @return {Context}
     * @api public
     */

    page.show = function (path, state, dispatch, push, isBack) {
        var ctx = new Context(path, state);
        ctx.isBack = isBack;
        page.current = ctx.path;
        if (false !== dispatch) {
            page.dispatch(ctx);
        }
        if (false !== ctx.handled && false !== push) {
            ctx.pushState();
        }
        return ctx;
    };

    page.restorePreviousState = function () {

        prevContext = prevPageContext;
        page.show(prevContext.pathname, prevContext.state, false, true, false);
    };

    /**
     * Goes back in the history
     * Back should always let the current route push state and then go back.
     *
     * @param {String} path - fallback path to go back if no more history exists, if undefined defaults to page.base
     * @param {Object} [state]
     * @api public
     */

    page.back = function (path, state) {

        if (enableHistory) {
            // Keep it simple and mimic browser back
            history.back();
            return;
        }

        if (page.len > 0) {
            // this may need more testing to see if all browsers
            // wait for the next tick to go back in history
            if (enableHistory) {
                history.back();
            } else {

                if (backStack.length > 2) {
                    backStack.length--;
                    var previousState = backStack[backStack.length - 1];
                    page.show(previousState.path, previousState.state, true, false, true);
                }
            }
            page.len--;
        } else if (path) {
            setTimeout(function () {
                page.show(path, state);
            });
        } else {
            setTimeout(function () {
                page.show(base, state);
            });
        }
    };

    page.enableNativeHistory = function () {
        return enableHistory;
    };

    page.canGoBack = function () {
        if (enableHistory) {
            return history.length > 1;
        }
        return (page.len || 0) > 0;
    };

    /**
     * Replace `path` with optional `state` object.
     *
     * @param {String} path
     * @param {Object} state
     * @return {Context}
     * @api public
     */


    page.replace = function (path, state, init, dispatch, isBack) {
        var ctx = new Context(path, state);
        ctx.isBack = isBack;
        page.current = ctx.path;
        ctx.init = init;
        ctx.save(); // save before dispatching, which may redirect
        if (false !== dispatch) {
            page.dispatch(ctx);
        }
        return ctx;
    };

    page.getRoute = function (path) {

        var callbacks = page.callbacks;

        var qsIndex = path.indexOf('?'),
            pathname = ~qsIndex ? path.slice(0, qsIndex) : path;

        var route = callbacks[pathname.toUpperCase()];

        return route ? route.routeInfo : null;
    };

    /**
     * Dispatch the given `ctx`.
     *
     * @param {Object} ctx
     * @api private
     */

    page.dispatch = function (ctx) {

        prevPageContext = prevContext;
        prevContext = ctx;

        var callbacks = page.callbacks;

        var path = ctx.path;
        if (path !== page.current) {
            ctx.handled = false;
            return;
        }

        var qsIndex = path.indexOf('?'),
            pathname = ~qsIndex ? path.slice(0, qsIndex) : path;

        var route = callbacks[pathname.toUpperCase()];

        return route.fn(ctx, route.routeInfo);
    };

    /**
     * Remove URL encoding from the given `str`.
     * Accommodates whitespace in both x-www-form-urlencoded
     * and regular percent-encoded form.
     *
     * @param {str} URL component to decode
     */
    function decodeURLEncodedURIComponent(val) {
        if (typeof val !== 'string') { return val; }
        return decodeURIComponent(val.replace(/\+/g, ' '));
    }

    /**
     * Initialize a new "request" `Context`
     * with the given `path` and optional initial `state`.
     *
     * @param {String} path
     * @param {Object} state
     * @api public
     */

    function Context(path, state) {
        if ('/' === path[0] && 0 !== path.indexOf(base)) {
            path = base + (hashbang ? '#!' : '') + path;
        }
        var i = path.indexOf('?');

        this.canonicalPath = path;
        this.path = path.replace(base, '') || '/';
        if (hashbang) {
            this.path = this.path.replace('#!', '') || '/';
        }

        this.title = document.title;
        this.state = state || {};
        this.state.path = path;
        this.querystring = ~i ? decodeURLEncodedURIComponent(path.slice(i + 1)) : '';
        this.pathname = decodeURLEncodedURIComponent(~i ? path.slice(0, i) : path);

        // fragment
        this.hash = '';
        if (!hashbang) {
            if (!~this.path.indexOf('#')) {
                return;
            }
            var parts = this.path.split('#');
            this.path = parts[0];
            this.hash = decodeURLEncodedURIComponent(parts[1]) || '';
            this.querystring = this.querystring.split('#')[0];
        }
    }

    /**
     * Expose `Context`.
     */

    page.Context = Context;

    /**
   * Push state.
   *
   * @api private
   */

    Context.prototype.pushState = function () {
        page.len++;

        if (enableHistory) {
            history.pushState(this.state, this.title, hashbang && this.path !== '/' ? '#!' + this.path : this.canonicalPath);
        } else {
            backStack.push({
                state: this.state,
                title: this.title,
                url: (hashbang && this.path !== '/' ? '#!' + this.path : this.canonicalPath),
                path: this.path
            });
        }
    };

    /**
     * Save the context state.
     *
     * @api public
     */

    Context.prototype.save = function () {

        if (enableHistory) {
            history.replaceState(this.state, this.title, hashbang && this.path !== '/' ? '#!' + this.path : this.canonicalPath);
        } else {
            backStack[page.len || 0] = {
                state: this.state,
                title: this.title,
                url: (hashbang && this.path !== '/' ? '#!' + this.path : this.canonicalPath),
                path: this.path
            };
        }
    };


    var previousPopState = {};

    function ignorePopState(event) {

        var state = event.state || {};

        if (previousPopState.navigate === false) {
            // Ignore
            previousPopState = state;
            return true;
        }

        previousPopState = state;
        return false;
    }

    page.pushState = function (state, title, url) {

        if (hashbang) {
            url = '#!' + url;
        }

        history.pushState(state, title, url);
        previousPopState = state;
    };

    function onclick(e, checkWhich) {

        if (1 !== which(e) && checkWhich !== false) {
            return;
        }

        if (e.metaKey || e.ctrlKey || e.shiftKey) {
            return;
        }
        if (e.defaultPrevented) {
            return;
        }


        // ensure link
        var el = e.target;

        while (el && 'A' !== el.nodeName) {
            el = el.parentNode;
        }
        if (!el || 'A' !== el.nodeName) {
            return;
        }


        // Ignore if tag has
        // 1. "download" attribute
        // 2. rel="external" attribute
        if (el.hasAttribute('download') || el.getAttribute('rel') === 'external') {
            return;
        }

        // ensure non-hash for the same path
        var link = el.getAttribute('href');
        if (link === '#') {
            e.preventDefault();
            return;
        }

        if (!hashbang && el.pathname === location.pathname && (el.hash || '#' === link)) {
            return;
        }

        // check target
        if (el.target) {
            return;
        }

        // x-origin
        if (!sameOrigin(el.href)) {
            return;
        }

        // rebuild path
        var path = el.pathname + el.search + (el.hash || '');

        // same page
        var orig = path;

        if (path.indexOf(base) === 0) {
            path = path.substr(base.length);
        }

        if (hashbang) {
            path = path.replace('#!', '');
        }

        if (base && orig === path) {
            // This is causing navigation to be canceled in edge uwp
            // If needed this can be changed to only be skipped when called via handleAnchorClick
            //return;
        }

        e.preventDefault();
        page.show(orig);
    }

    page.handleAnchorClick = onclick;

    /**
     * Event button.
     */

    function which(e) {
        e = e || window.event;
        return null === e.which ? e.button : e.which;
    }

    /**
     * Check if `href` is the same origin.
     */

    function sameOrigin(href) {
        var origin = location.protocol + '//' + location.hostname;
        if (location.port) {
            origin += ':' + location.port;
        }
        return (href && (0 === href.indexOf(origin)));
    }

    page.sameOrigin = sameOrigin;

    return page;

});