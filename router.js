define(['loading', 'globalize', 'events', 'viewManager', 'layoutManager', 'skinManager', 'pluginManager', 'backdrop', 'browser', 'pageJs', 'appSettings', 'apphost', 'connectionManager', 'userSettings', 'itemHelper'], function (loading, globalize, events, viewManager, layoutManager, skinManager, pluginManager, backdrop, browser, page, appSettings, appHost, connectionManager, userSettings, itemHelper) {
    'use strict';

    var appRouter = {
        showLocalLogin: function (serverId, manualLogin) {

            if (self.Dashboard) {
                return show('/login.html?serverid=' + serverId);
            }

            var pageName = manualLogin ? 'manuallogin' : 'login';

            return show('/startup/' + pageName + '.html?serverid=' + serverId);
        },
        showSelectServer: function () {

            if (self.Dashboard) {
                if (Dashboard.isConnectMode()) {
                    return show('/selectserver.html');
                } else {
                    return show('/login.html');
                }
            }
            return show('/startup/selectserver.html');
        },
        showWelcome: function () {

            if (self.Dashboard) {
                if (Dashboard.isConnectMode()) {
                    return show('/connectlogin.html?mode=welcome');
                } else {
                    return show('/login.html');
                }
            }

            return show('/startup/welcome.html');
        },
        showConnectLogin: function () {

            if (self.Dashboard) {
                return show('/connectlogin.html');
            }

            return show('/startup/connectlogin.html');
        },
        showSettings: function () {

            return show(getRouteUrl('settings'));
        },
        showUserMenu: function () {

            if (self.Dashboard) {
                return show(getRouteUrl('settings'));
            }

            return showBackMenuInternal(true);
        },
        showSearch: function () {
            return show('/search/search.html');
        },
        showGuide: function () {
            return show(appRouter.getRouteUrl('livetv', {
                serverId: connectionManager.currentApiClient().serverId(),
                section: 'guide'
            }));
        },
        showLiveTV: function () {
            return show(appRouter.getRouteUrl('livetv', {
                serverId: connectionManager.currentApiClient().serverId()
            }));
        },
        showRecordedTV: function () {
            return show(appRouter.getRouteUrl('recordedtv', {
                serverId: connectionManager.currentApiClient().serverId()
            }));
        },
        showFavorites: function () {
            return show(getHomeRoute() + '&tab=1');
        },
        showNowPlaying: function () {
            return show('/nowplaying/nowplaying.html');
        }
    };

    function beginConnectionWizard() {

        backdrop.clear();

        loading.show();

        connectionManager.connect({

            enableAutoLogin: appSettings.enableAutoLogin()

        }).then(function (result) {
            handleConnectionResult(result, loading);
        });
    }

    function handleConnectionResult(result, loading) {

        switch (result.State) {

            case 'SignedIn':
                {
                    loading.hide();
                    skinManager.loadUserSkin();
                }
                break;
            case 'ServerSignIn':
                {
                    result.ApiClient.getPublicUsers().then(function (users) {

                        if (users.length) {
                            appRouter.showLocalLogin(result.Servers[0].Id);
                        } else {
                            appRouter.showLocalLogin(result.Servers[0].Id, true);
                        }
                    });
                }
                break;
            case 'ServerSelection':
                {
                    appRouter.showSelectServer();
                }
                break;
            case 'ConnectSignIn':
                {
                    appRouter.showWelcome();
                }
                break;
            case 'ServerUpdateNeeded':
                {
                    appRouter.showSelectServer();
                }
                break;
            default:
                break;
        }
    }

    function loadContentUrl(ctx, route, request) {

        var url;

        if (route.contentPath && typeof (route.contentPath) === 'function') {
            url = route.contentPath(ctx.querystring);
        } else {
            url = route.contentPath || route.path;
        }

        if (url.indexOf('://') === -1) {

            // Put a slash at the beginning but make sure to avoid a double slash
            if (url.indexOf('/') !== 0) {

                url = '/' + url;
            }

            url = baseUrl() + url;
        }

        if (ctx.querystring && route.enableContentQueryString) {
            url += '?' + ctx.querystring;
        }

        require(['text!' + url], function (html) {

            loadContent(ctx, route, html, request);
        });
    }

    function handleRoute(ctx, route) {

        authenticate(ctx, route, function () {
            initRoute(ctx, route);
        });
    }

    function initRoute(ctx, route) {

        var onInitComplete = function (controllerFactory) {
            sendRouteToViewManager(ctx, route, controllerFactory);
        };

        require(route.dependencies || [], function () {

            if (route.controller) {
                require([route.controller], onInitComplete);
            } else {
                onInitComplete();
            }
        });
    }

    var currentViewLoadRequest;
    var currentRouteInfo;

    function cancelCurrentLoadRequest() {
        var currentRequest = currentViewLoadRequest;
        if (currentRequest) {
            currentRequest.cancel = true;
        }
    }

    var isHandlingBackToDefault;
    var isDummyBackToHome;

    function sendRouteToViewManager(ctx, route, controllerFactory) {

        if (isDummyBackToHome && route.type === 'home') {
            isDummyBackToHome = false;
            return;
        }

        cancelCurrentLoadRequest();

        var isBackNav = ctx.isBack;

        var currentRequest = Object.assign({}, route);

        currentRequest.url = baseUrl() + ctx.path;
        currentRequest.controllerFactory = controllerFactory;
        currentRequest.state = ctx.state;
        currentRequest.isBack = isBackNav;

        currentViewLoadRequest = currentRequest;

        if (!isBackNav) {
            // Don't force a new view for home due to the back menu
            //if (route.type !== 'home') {
            loadContentUrl(ctx, route, currentRequest);
            return;
            //}
        }
        viewManager.tryRestoreView(currentRequest, function () {

            // done
            currentRouteInfo = {
                route: route,
                path: ctx.path
            };

        }).catch(function (result) {

            if (!result || !result.cancelled) {
                loadContentUrl(ctx, route, currentRequest);
            }
        });
    }

    function onBeforeExit(e) {

        if (browser.web0s) {
            page.restorePreviousState();
        }
    }

    function normalizeImageOptions(options) {

        if (options.maxWidth || options.maxHeight || options.width || options.height) {

            var quality = 100;

            if (browser.tv || browser.slow) {

                if (browser.chrome) {
                    // webp support
                    quality = (options.type || 'Primary') === 'Primary' ? 40 : 50;
                } else {
                    quality = options.type === 'Backdrop' ? 60 : 50;
                }
            } else {
                quality = options.type === 'Backdrop' ? 70 : 90;
            }

            options.quality = quality;
        }
    }

    function getMaxBandwidth() {

        var connection = navigator.connection;

        if (connection) {

            var downlink = connection.downlink;
            if (downlink && downlink > 0 && downlink < Number.POSITIVE_INFINITY) {

                downlink *= 1000000;
                downlink *= 0.7;
                downlink = parseInt(downlink);
                return downlink;
            }

            downlink = connection.downlinkMax;
            if (downlink && downlink > 0 && downlink < Number.POSITIVE_INFINITY) {

                downlink *= 1000000;
                downlink *= 0.7;
                downlink = parseInt(downlink);
                return downlink;
            }
        }

        if (browser.iOS) {
            return 1500000;
        }

        return null;
    }

    function onNetworkChanged() {
        connectionManager.onNetworkChanged();
    }

    if (appHost.supports('multiserver') && navigator.connection && navigator.connection.addEventListener) {
        navigator.connection.addEventListener('change', onNetworkChanged);
    }

    function onApiClientCreated(e, newApiClient) {

        newApiClient.normalizeImageOptions = normalizeImageOptions;
        newApiClient.getMaxBandwidth = getMaxBandwidth;
    }

    function initApiClient(apiClient) {

        onApiClientCreated({}, apiClient);
    }

    function initApiClients() {

        connectionManager.getApiClients().forEach(initApiClient);

        events.on(connectionManager, 'apiclientcreated', onApiClientCreated);
    }

    function onAppResume() {
        var apiClient = connectionManager.currentApiClient();

        if (apiClient) {
            apiClient.ensureWebSocket();
        }
    }

    var firstConnectionResult;
    function start(options) {

        loading.show();

        initApiClients();

        events.on(appHost, 'beforeexit', onBeforeExit);
        events.on(appHost, 'resume', onAppResume);

        connectionManager.connect({

            enableAutoLogin: appSettings.enableAutoLogin()

        }).then(function (result) {

            firstConnectionResult = result;

            loading.hide();

            options = options || {};

            page({
                click: options.click !== false,
                hashbang: options.hashbang !== false,
                enableHistory: enableHistory()
            });
        });
    }

    function enableHistory() {

        // shows status bar on navigation
        if (browser.xboxOne && !browser.edgeUwp) {
            return false;
        }

        // Does not support history
        if (browser.orsay) {
            return false;
        }

        return true;
    }

    function enableNativeHistory() {
        return page.enableNativeHistory();
    }

    function authenticate(ctx, route, callback) {

        var firstResult = firstConnectionResult;
        if (firstResult) {

            firstConnectionResult = null;

            if (firstResult.State !== 'SignedIn' && !route.anonymous) {

                handleConnectionResult(firstResult, loading);
                return;
            }
        }

        var apiClient = connectionManager.currentApiClient();
        var pathname = ctx.pathname.toLowerCase();

        console.log('appRouter - processing path request ' + pathname);

        var isCurrentRouteStartup = currentRouteInfo ? currentRouteInfo.route.startup : true;
        var shouldExitApp = ctx.isBack && route.isDefaultRoute && isCurrentRouteStartup;

        if (!shouldExitApp && (!apiClient || !apiClient.isLoggedIn()) && !route.anonymous) {
            console.log('appRouter - route does not allow anonymous access, redirecting to login');
            beginConnectionWizard();
            return;
        }

        if (shouldExitApp) {
            if (appHost.supports('exit')) {
                appHost.exit();
                return;
            }
            return;
        }

        if (apiClient && apiClient.isLoggedIn()) {

            console.log('appRouter - user is authenticated');

            if (ctx.isBack && (route.isDefaultRoute || route.startup) && !isCurrentRouteStartup) {
                handleBackToDefault();
                return;
            }
            else if (route.isDefaultRoute) {
                console.log('appRouter - loading skin home page');
                loadUserSkinWithOptions(ctx);
                return;
            } else if (route.roles) {

                validateRoles(apiClient, route.roles).then(function () {

                    callback();

                }, beginConnectionWizard);
                return;
            }
        }

        console.log('appRouter - proceeding to ' + pathname);
        callback();
    }

    function loadUserSkinWithOptions(ctx) {

        require(['queryString'], function (queryString) {

            //var url = options.url;
            //var index = url.indexOf('?');
            var params = queryString.parse(ctx.querystring);

            skinManager.loadUserSkin({
                start: params.start
            });
        });
    }

    function validateRoles(apiClient, roles) {

        return Promise.all(roles.split(',').map(function (role) {
            return validateRole(apiClient, role);
        }));
    }

    function validateRole(apiClient, role) {

        if (role === 'admin') {

            return apiClient.getCurrentUser().then(function (user) {
                if (user.Policy.IsAdministrator) {
                    return Promise.resolve();
                }
                return Promise.reject();
            });
        }

        // Unknown role
        return Promise.resolve();
    }

    function handleBackToDefault() {

        if (!appHost.supports('exitmenu') && appHost.supports('exit')) {
            appHost.exit();
            return;
        }

        isDummyBackToHome = true;
        skinManager.loadUserSkin();

        if (isHandlingBackToDefault) {
            return;
        }

        // This must result in a call to either 
        // skinManager.loadUserSkin();
        // Logout
        // Or exit app

        showBackMenuInternal(false).then(function () {

            isHandlingBackToDefault = false;
        });
    }

    function showBackMenuInternal(showHome) {

        return new Promise(function (resolve, reject) {

            require(['backMenu'], function (showBackMenu) {
                showBackMenu({
                    showHome: showHome
                }).then(resolve);
            });
        });
    }

    function loadContent(ctx, route, html, request) {

        request.view = globalize.translateDocument(html, route.dictionary);

        viewManager.loadView(request);

        currentRouteInfo = {
            route: route,
            path: ctx.path
        };

        ctx.handled = true;
    }

    function getRequestFile() {
        var path = self.location.pathname || '';

        var index = path.lastIndexOf('/');
        if (index !== -1) {
            path = path.substring(index);
        } else {
            path = '/' + path;
        }

        if (!path || path === '/') {
            path = '/index.html';
        }

        return path;
    }

    function endsWith(str, srch) {

        return str.lastIndexOf(srch) === srch.length - 1;
    }

    var baseRoute = self.location.href.split('?')[0].replace(getRequestFile(), '');
    // support hashbang
    baseRoute = baseRoute.split('#')[0];
    if (endsWith(baseRoute, '/') && !endsWith(baseRoute, '://')) {
        baseRoute = baseRoute.substring(0, baseRoute.length - 1);
    }
    function baseUrl() {
        return baseRoute;
    }

    function getWindowLocationSearch(win) {

        var currentPath = currentRouteInfo ? (currentRouteInfo.path || '') : '';

        var index = currentPath.indexOf('?');
        var search = '';

        if (index !== -1) {
            search = currentPath.substring(index);
        }

        return search || '';
    }

    function param(name, url) {
        name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
        var regexS = "[\\?&]" + name + "=([^&#]*)";
        var regex = new RegExp(regexS, "i");

        var results = regex.exec(url || getWindowLocationSearch());
        if (results == null) {
            return "";
        } else {
            return decodeURIComponent(results[1].replace(/\+/g, " "));
        }
    }

    function back() {

        page.back();
    }

    function canGoBack() {

        var curr = current();

        if (!curr) {
            return false;
        }

        if (curr.type === 'home') {
            return false;
        }
        return page.canGoBack();
    }

    var resolveOnNextShow;

    function show(path, options) {

        if (path.indexOf('/') !== 0 && path.indexOf('://') === -1) {
            path = '/' + path;
        }

        var baseRoute = baseUrl();
        path = path.replace(baseRoute, '');

        if (currentRouteInfo && currentRouteInfo.path === path) {

            // can't use this with home right now due to the back menu
            if (currentRouteInfo.route.type !== 'home') {
                loading.hide();
                return Promise.resolve();
            }
        }

        return new Promise(function (resolve, reject) {

            resolveOnNextShow = resolve;
            page.show(path, options);
        });
    }

    document.addEventListener('viewshow', function () {
        var resolve = resolveOnNextShow;
        if (resolve) {
            resolveOnNextShow = null;
            resolve();
        }
    });

    function current() {
        return currentRouteInfo ? currentRouteInfo.route : null;
    }

    function getHomeRoute() {

        if (self.Dashboard) {
            return '/home.html';
        }

        if (layoutManager.tv && userSettings.get('tvhome') === 'horizontal') {
            return '/home_horiz/home.html';
        }

        return '/home/home.html';
    }

    function goHome() {

        return show(getHomeRoute());
    }

    function getRouteUrl(item, options) {

        if (!self.Dashboard) {
            if (item === 'downloads') {
                return '/offline/offline.html';
            }
            if (item === 'managedownloads') {
                return '/offline/managedownloads.html';
            }
            if (item === 'settings') {
                return '/settings/settings.html';
            }
        }

        if (item.url) {
            return item.url;
        }

        if (!options) {
            options = {};
        }
        var context = options ? options.context : null;

        // Handle search hints
        var id = item.Id || item.ItemId;
        var serverId = item.ServerId || options.serverId;

        if (item === 'settings') {
            return '/usermenu/usermenu.html';
        }
        if (item === 'wizard') {
            return '/wizardstart.html';
        }
        if (item === 'downloads') {
            return '/offline/offline.html';
        }
        if (item === 'downloadsettings') {
            return '/mysyncsettings.html';
        }
        if (item === 'premiere') {
            return '/supporterkey.html';
        }
        if (item === 'managedownloads') {
            return '/managedownloads.html';
        }
        if (item === 'manageserver') {
            return '/dashboard.html';
        }
        if (item === 'recordedtv') {
            return '/livetv/livetv.html?tab=3&serverId=' + serverId;
        }
        if (item === 'nextup') {
            return '/list/list.html' + '?type=nextup&serverId=' + serverId;
        }

        if (item === 'livetv' || item.CollectionType === 'livetv') {

            if (options.section === 'programs') {
                return '/livetv/livetv.html?tab=0&serverId=' + serverId;
            }
            if (options.section === 'guide') {
                return '/livetv/livetv.html?tab=1&serverId=' + serverId;
            }
            if (options.section === 'movies') {
                return '/list/list.html?type=Program&IsMovie=true&serverId=' + serverId;
            }
            if (options.section === 'shows') {
                return '/list/list.html?type=Program&IsSeries=true&IsMovie=false&IsNews=false&serverId=' + serverId;
            }
            if (options.section === 'sports') {
                return '/list/list.html?type=Program&IsSports=true&serverId=' + serverId;
            }
            if (options.section === 'kids') {
                return '/list/list.html?type=Program&IsKids=true&serverId=' + serverId;
            }
            if (options.section === 'news') {
                return '/list/list.html?type=Program&IsNews=true&serverId=' + serverId;
            }
            if (options.section === 'onnow') {
                return '/list/list.html' + '?type=Program&IsAiring=true&serverId=' + serverId;
            }
            if (options.section === 'dvrschedule') {
                return '/livetv/livetv.html?tab=4&serverId=' + serverId;
            }
            return '/livetv/livetv.html?serverId=' + serverId;
        }

        var url;

        if (item === 'list') {

            url = '/list/list.html?serverId=' + serverId + '&type=' + options.itemTypes;
            if (options.isFavorite) {
                url += '&IsFavorite=true';
            }

            return url;
        }

        var itemType = item.Type || (options ? options.itemType : null);

        if (itemType === "SeriesTimer") {
            return "/item/item.html?seriesTimerId=" + id + '&serverId=' + serverId;
        }

        if (itemType === "Device") {
            return "/devices/device.html?id=" + id;
        }

        if (itemType === "Plugin") {

            if (!Dashboard.allowPluginPages(item.Id)) {
                return null;
            }

            return '/' + item.ConfigPageUrl;
        }

        if (itemType === "User") {
            return "/useredit.html?userId=" + id;
        }

        if (item.Type === 'Genre') {

            url = 'list/list.html' + '?genreId=' + id + '&serverId=' + serverId;

            if (context === 'livetv') {
                url += "&type=Program";
            }

            if (options.parentId) {
                url += '&parentId=' + options.parentId;
            }
            return url;
        }
        if (itemType === 'GameGenre') {
            url = '/list/list.html?gameGenreId=' + id + '&serverId=' + serverId;
            if (options.parentId) {
                url += '&parentId=' + options.parentId;
            }
            return url;
        }
        if (itemType === 'MusicGenre') {
            url = '/list/list.html?musicGenreId=' + id + '&serverId=' + serverId;
            if (options.parentId) {
                url += '&parentId=' + options.parentId;
            }
            return url;
        }
        if (itemType === 'Studio') {
            url = '/list/list.html?studioId=' + id + '&serverId=' + serverId;
            if (options.parentId) {
                url += '&parentId=' + options.parentId;
            }
            return url;
        }
        if (itemType === 'Tag') {
            url = '/list/list.html?tagId=' + id + '&serverId=' + serverId;
            if (options.parentId) {
                url += '&parentId=' + options.parentId;
            }
            return url;
        }

        if (context !== 'folders' && item.Type === 'GameSystem') {
            url = '/list/list.html?type=Game&serverId=' + serverId;
            url += '&parentId=' + id;
            return url;
        }
        if (context !== 'folders' && !itemHelper.isLocalItem(item)) {
            if (item.CollectionType === 'movies') {
                url = '/movies/movies.html?serverId=' + serverId + '&parentId=' + id;

                if (options.section === 'latest') {
                    url += '&tab=1';
                }
                return url;
            }
            if (item.CollectionType === 'games') {
                url = '/games/games.html?serverId=' + serverId + '&parentId=' + id;

                return url;
            }
            if (item.CollectionType === 'musicvideos') {
                url = '/musicvideos/musicvideos.html?serverId=' + serverId + '&parentId=' + id;

                if (options.section === 'latest') {
                    url += '&tab=1';
                }
                return url;
            }
            if (item.CollectionType === 'homevideos') {
                url = '/homevideos/homevideos.html?serverId=' + serverId + '&parentId=' + id;

                if (options.section === 'latest') {
                    url += '&tab=1';
                }
                return url;
            }
            if (item.CollectionType === 'tvshows') {
                url = '/tv/tv.html?serverId=' + serverId + '&parentId=' + id;

                if (options.section === 'latest') {
                    url += '&tab=1';
                }
                return url;
            }
            if (item.CollectionType === 'music' || item.CollectionType === 'audiobooks') {
                url = '/music/music.html?serverId=' + serverId + '&parentId=' + id;
                return url;
            }
        }

        if (itemType === "Playlist") {
            return "/item/item.html?id=" + id + '&serverId=' + serverId;
        }
        if (itemType === "TvChannel") {
            return "/item/item.html?id=" + id + '&serverId=' + serverId;
        }
        if (itemType === "Program") {
            return "/item/item.html?id=" + id + '&serverId=' + serverId;
        }

        if (itemType === "BoxSet") {
            return "/item/item.html?id=" + id + '&serverId=' + serverId;
        }
        if (itemType === "MusicAlbum") {
            return "/item/item.html?id=" + id + '&serverId=' + serverId;
        }
        if (itemType === "MusicGenre") {
            return "/item/item.html?id=" + id + '&serverId=' + serverId;
        }
        if (itemType === "Person") {
            return "/item/item.html?id=" + id + '&serverId=' + serverId;
        }
        if (itemType === "Recording") {
            return "/item/item.html?id=" + id + '&serverId=' + serverId;
        }

        if (itemType === "MusicArtist") {
            return "/item/item.html?id=" + id + '&serverId=' + serverId;
        }

        var contextSuffix = context ? ('&context=' + context) : '';

        if (itemType === "Series" || itemType === "Season" || itemType === "Episode") {
            return "/item/item.html?id=" + id + contextSuffix + '&serverId=' + serverId;
        }

        if (item.IsFolder) {
            return id ? "/list/list.html?parentId=" + id + '&serverId=' + serverId : "#";
        }

        return "/item/item.html?id=" + id + '&serverId=' + serverId;
    }

    function showAlert(text) {

        return require(['alert']).then(function (responses) {

            return responses[0](text);
        });
    }

    function showItem(item, serverId, options) {

        if (typeof (item) === 'string') {
            var apiClient = serverId ? connectionManager.getApiClient(serverId) : connectionManager.currentApiClient();
            return apiClient.getItem(apiClient.getCurrentUserId(), item).then(function (item) {
                return appRouter.showItem(item, options);
            });
        } else {

            if (item.Type === 'Plugin') {

                if (!item.ConfigPageUrl) {

                    return showAlert(globalize.translate('NoPluginConfigurationMessage'));

                } else if (!Dashboard.allowPluginPages(item.Id)) {
                    return showAlert(globalize.translate('MessagePluginConfigurationRequiresLocalAccess'));
                }
            }

            if (arguments.length === 2) {
                options = arguments[1];
            }

            return show(appRouter.getRouteUrl(item, options), { item: item });
        }
    }

    function setTitle(title) {

        require(['appHeader'], function (appHeader) {
            appHeader.setTitle(title);
        });
    }

    function showVideoOsd() {

        return show('/videoosd/videoosd.html');
    }

    var allRoutes = [];

    function addRoute(path, newRoute) {

        page(path, newRoute, handleRoute);
        allRoutes.push(newRoute);
    }

    function getRoutes() {
        return allRoutes;
    }

    var backdropContainer;
    var backgroundContainer;
    function setTransparency(level) {

        if (!backdropContainer) {
            backdropContainer = document.querySelector('.backdropContainer');
        }
        if (!backgroundContainer) {
            backgroundContainer = document.querySelector('.backgroundContainer');
        }

        if (level === 'full' || level === 2) {
            backdrop.clear(true);
            document.documentElement.classList.add('transparentDocument');
            backgroundContainer.classList.add('backgroundContainer-transparent');
            backdropContainer.classList.add('hide');
        }
        else if (level === 'backdrop' || level === 1) {
            backdrop.externalBackdrop(true);
            document.documentElement.classList.add('transparentDocument');
            backgroundContainer.classList.add('backgroundContainer-transparent');
            backdropContainer.classList.add('hide');
        } else {
            backdrop.externalBackdrop(false);
            document.documentElement.classList.remove('transparentDocument');
            backgroundContainer.classList.remove('backgroundContainer-transparent');
            backdropContainer.classList.remove('hide');
        }
    }

    function pushState(state, title, url) {

        state.navigate = false;

        page.pushState(state, title, url);
    }

    function setBaseRoute() {
        var baseRoute = self.location.pathname.replace(getRequestFile(), '');
        if (baseRoute.lastIndexOf('/') === baseRoute.length - 1) {
            baseRoute = baseRoute.substring(0, baseRoute.length - 1);
        }

        console.log('Setting page base to ' + baseRoute);

        page.base(baseRoute);
    }

    setBaseRoute();

    function syncNow() {
        require(['localsync'], function (localSync) {
            localSync.sync();
        });
    }

    function invokeShortcut(id) {

        if (id.indexOf('library-') === 0) {

            id = id.replace('library-', '');

            id = id.split('_');

            return showItem(id[0], id[1]);

        } else if (id.indexOf('item-') === 0) {

            id = id.replace('item-', '');

            id = id.split('_');

            return showItem(id[0], id[1]);

        } else {

            id = id.split('_');

            return show(appRouter.getRouteUrl(id[0], {
                serverId: id[1]
            }));
        }
    }

    appRouter.addRoute = addRoute;
    appRouter.param = param;
    appRouter.back = back;
    appRouter.show = show;
    appRouter.start = start;
    appRouter.baseUrl = baseUrl;
    appRouter.canGoBack = canGoBack;
    appRouter.current = current;
    appRouter.beginConnectionWizard = beginConnectionWizard;
    appRouter.goHome = goHome;
    appRouter.showItem = showItem;
    appRouter.setTitle = setTitle;
    appRouter.setTransparency = setTransparency;
    appRouter.getRoutes = getRoutes;
    appRouter.getRouteUrl = getRouteUrl;
    appRouter.pushState = pushState;
    appRouter.enableNativeHistory = enableNativeHistory;
    appRouter.showVideoOsd = showVideoOsd;
    appRouter.handleAnchorClick = page.handleAnchorClick;
    appRouter.TransparencyLevel = {
        None: 0,
        Backdrop: 1,
        Full: 2
    };
    appRouter.invokeShortcut = invokeShortcut;

    return appRouter;
});
