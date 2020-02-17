define(['loading', 'globalize', 'events', 'viewManager', 'layoutManager', 'skinManager', 'backdrop', 'browser', 'pageJs', 'appSettings', 'apphost', 'connectionManager', 'userSettings', 'itemHelper'], function (loading, globalize, events, viewManager, layoutManager, skinManager, backdrop, browser, page, appSettings, appHost, connectionManager, userSettings, itemHelper) {
    'use strict';

    var appRouter = {
        showLocalLogin: function (serverId, manualLogin) {

            var pageName = manualLogin ? 'manuallogin' : 'login';

            return show('/startup/' + pageName + '.html?serverId=' + serverId);
        },
        showSelectServer: function () {

            return show(getRouteUrl('selectserver'));
        },
        showWelcome: function () {

            if (appHost.supports('multiserver')) {
                return show('/startup/welcome.html');
            } else {
                return show('/startup/login.html?serverId=' + ApiClient.serverId());
            }
        },
        showConnectLogin: function () {

            return show(getRouteUrl('connectlogin'));
        },
        showSettings: function () {

            return show(getRouteUrl('settings', {
                serverId: connectionManager.currentApiClient().serverId()
            }));
        },
        showUserMenu: function () {

            return appRouter.showSettings();
        },
        showSearch: function () {
            return show(getRouteUrl('search'));
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

            return show('/videoosd/videoosd.html');
        }
    };

    function showLocalLoginFromApiClient(apiClient) {

        return apiClient.getPublicUsers().then(function (users) {

            if (users.length) {
                return appRouter.showLocalLogin(apiClient.serverId());
            } else {
                return appRouter.showLocalLogin(apiClient.serverId(), true);
            }
        });
    }

    function beginConnectionWizard() {

        backdrop.clear();

        loading.show();

        if (!appHost.supports('multiserver')) {
            return showLocalLoginFromApiClient(ApiClient);
        }

        return connectionManager.connect({

            enableAutoLogin: appSettings.enableAutoLogin()

        }).then(function (result) {
            return handleConnectionResult(result, false, true);
        });
    }

    function showServerUpdateNeededAlert() {

        require(['alert'], function (alert) {
            alert(globalize.translate('ServerUpdateNeeded', '<a href="https://emby.media">https://emby.media</a>')).then(function () {
                show('/startup/selectserver.html');
            });
        });
    }

    function handleConnectionResult(result, allowServerUpdateNeedAlert, useWelcomeForConnectSignIn) {

        switch (result.State) {

            case 'SignedIn':
                {
                    loading.hide();
                    skinManager.loadUserSkin();
                }
                break;
            case 'ServerSignIn':
                {
                    showLocalLoginFromApiClient(result.ApiClient);
                }
                break;
            case 'ServerSelection':
                {
                    if (appHost.supports('multiserver')) {
                        appRouter.showSelectServer();
                    }
                    else {
                        showLocalLoginFromApiClient(connectionManager.currentApiClient());
                    }
                }
                break;
            case 'ConnectSignIn':
                {
                    if (useWelcomeForConnectSignIn === true) {
                        appRouter.showWelcome();
                    } else {
                        appRouter.showConnectLogin();
                    }
                }
                break;
            case 'ServerUpdateNeeded':
                {
                    if (allowServerUpdateNeedAlert === false) {
                        appRouter.showSelectServer();
                    } else {
                        loading.hide();
                        showServerUpdateNeededAlert();
                    }
                }
                break;
            case 'Unavailable':
                {
                    loading.hide();

                    showAlert({
                        text: globalize.translate("MessageUnableToConnectToServer"),
                        title: globalize.translate("HeaderConnectionFailure")
                    });
                }
                break;
            default:
                break;
        }
    }

    function loadTranslationFromConfigPage(apiClient, configPage) {

        var languages = configPage.Translations;

        if (!languages || !languages.length) {
            return Promise.resolve();
        }

        var translations = (languages || []).map(function (i) {
            return {
                lang: i,
                path: apiClient.getUrl("web/strings", { PluginId: configPage.PluginId, Locale: i })
            };
        });

        return globalize.loadStrings({
            name: 'plugin-' + configPage.PluginId,
            translations: translations
        });
    }

    var loadedTranslations = {};
    function loadPluginTranslations(pageName) {

        if (loadedTranslations[pageName]) {
            return Promise.resolve();
        }

        loadedTranslations[pageName] = true;

        var apiClient = ApiClient;

        return apiClient.getJSON(apiClient.getUrl("web/configurationpages", { Name: pageName })).then(function (configPages) {

            if (configPages.length) {
                return loadTranslationFromConfigPage(apiClient, configPages[0]);
            }
        });
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

        var promises = [require(['text!' + url])];

        if (self.Dashboard) {
            request.isPluginPage = request.url.toLowerCase().indexOf('/configurationpage') !== -1;

            if (request.isPluginPage) {
                promises.push(loadPluginTranslations(getParameterByName('name', request.url)));
            }
        }

        Promise.all(promises).then(function (responses) {

            var html = responses[0][0];

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

        if (route.controller) {
            require([route.controller], onInitComplete);
        } else {
            onInitComplete();
        }
    }

    var currentViewLoadRequest;
    var currentRouteInfo;

    function cancelCurrentLoadRequest() {
        var currentRequest = currentViewLoadRequest;
        if (currentRequest) {
            currentRequest.cancel = true;
        }
    }

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

            var type = options.type;

            if (layoutManager.mobile) {

                if (browser.chrome) {
                    // webp support
                    quality = !type || type === 'Primary' ? 40 : 50;
                } else {
                    quality = type === 'Backdrop' ? 60 : 50;
                }
            } else {
                quality = type === 'Backdrop' ? 70 : 90;
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

        // a default for mobile devices
        if (!browser.tv && !browser.ps4 && !browser.xboxOne && !browser.edgeUwp && !browser.chromecast) {
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

        connectionManager.onAppResume();
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
                hashbang: options.hashbang !== false
            });
        });
    }

    function enableNativeHistory() {
        return !browser.orsay;
    }

    function authenticate(ctx, route, callback) {

        var firstResult = firstConnectionResult;
        if (firstResult) {

            firstConnectionResult = null;

            if (firstResult.State !== 'SignedIn' && !route.anonymous) {

                handleConnectionResult(firstResult, false, true);
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

                validateAccessToRoute(apiClient, route).then(function () {

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

    function validateAccessToRoute(apiClient, route) {

        if (!route.roles) {
            return Promise.resolve();
        }

        return apiClient.getCurrentUser().then(function (user) {
            return validateUserAccessToRoute(route, user);
        });
    }

    function validateUserAccessToRoute(route, user) {

        var roles = (route.roles || '').split(',');

        if (roles.indexOf('admin') !== -1 && !user.Policy.IsAdministrator) {
            return false;
        }

        if (roles.indexOf('EnableUserPreferenceAccess') !== -1 && !user.Policy.EnableUserPreferenceAccess) {
            return false;
        }

        return true;
    }

    function handleBackToDefault() {

        if (appHost.supports('exit')) {

            if (!appHost.supports('exitmenu')) {
                appHost.exit();
                return;
            }
        }

        isDummyBackToHome = true;
        skinManager.loadUserSkin();

        if (self.Dashboard) {
            return;
        }

        // This must result in a call to either
        // skinManager.loadUserSkin();
        // Logout
        // Or exit app

        showBackMenuInternal(false);
    }

    function showBackMenuInternal(showHome) {

        return require(['backMenu']).then(function (responses) {

            return responses[0]({
                showHome: showHome
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
            return '/home';
        }

        if (layoutManager.tv && userSettings.get('tvhome') === 'horizontal' && !browser.netcast) {
            return '/home_horiz/home.html';
        }

        return '/home';
    }

    function goHome() {

        return show(getHomeRoute());
    }

    function getRouteInfo(url) {

        return page.getRoute(url);
    }

    function getRouteUrl(item, options) {

        if (!self.Dashboard) {
            if (item === 'managedownloads') {
                return '/offline/managedownloads.html';
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

        if (item === 'home') {
            return getHomeRoute();
        }
        if (item === 'search') {
            return '/search';
        }
        if (item === 'connectlogin') {
            return '/startup/connectlogin.html';
        }
        if (item === 'selectserver') {
            return '/startup/selectserver.html';
        }
        if (item === 'settings') {

            if (serverId) {
                return '/settings?serverId=' + serverId;
            }
            return '/settings';
        }
        if (item === 'wizard') {
            return '/wizardstart.html';
        }
        if (item === 'downloads') {
            return '/list/list.html' + '?parentId=downloads';
        }
        if (item === 'downloadsettings') {
            return '/settings/download.html';
        }
        if (item === 'premiere') {
            return '/embypremiere';
        }
        if (item === 'managedownloads') {
            return '/managedownloads.html';
        }
        if (item === 'manageserver') {
            return '/dashboard';
        }
        if (item === 'recordedtv') {
            return '/livetv?tab=3&serverId=' + serverId;
        }
        if (item === 'nextup') {
            return '/list/list.html' + '?type=nextup&serverId=' + serverId;
        }

        if (item === "PluginCatalog") {
            return "/plugins/plugincatalog.html";
        }

        if (item === 'livetv' || item.CollectionType === 'livetv') {

            if (options.section === 'programs') {
                return '/livetv?tab=0&serverId=' + serverId;
            }
            if (options.section === 'guide') {
                return '/livetv?tab=1&serverId=' + serverId;
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
                return '/livetv?tab=4&serverId=' + serverId;
            }
            return '/livetv?serverId=' + serverId;
        }

        var url;

        if (item === 'list') {

            url = '/list/list.html?serverId=' + serverId + '&type=' + options.itemTypes;
            if (options.isFavorite) {
                url += '&IsFavorite=true';
            }
            if (options.artistId) {
                url += '&artistId=' + options.artistId;
            }
            if (options.albumArtistId) {
                url += '&albumArtistId=' + options.albumArtistId;
            }

            return url;
        }

        var itemType = item.Type || (options ? options.itemType : null);

        if (itemType === "EmbyConnect") {
            return getRouteUrl('connectlogin');
        }

        if (itemType === "Downloads") {
            return getRouteUrl('downloads');
        }

        if (itemType === "SelectServer") {
            return getRouteUrl('selectserver');
        }

        if (itemType === "ForgotPassword") {
            return '/startup/forgotpassword.html?serverId=' + serverId;
        }

        if (itemType === "ManualLogin") {
            url = '/startup/manuallogin.html?serverId=' + serverId;

            if (item.Username) {
                url += '&user=' + encodeURIComponent(item.Username);
            }

            return url;
        }

        if (itemType === "SeriesTimer") {
            return "/item?seriesTimerId=" + id + '&serverId=' + serverId;
        }

        if (itemType === "Device") {
            return "/devices/device.html?id=" + id;
        }

        if (itemType === "AddServer") {
            return "/startup/manualserver.html";
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
                url = '/movies?serverId=' + serverId + '&parentId=' + id;

                if (options.section === 'latest') {
                    url += '&tab=1';
                }
                return url;
            }
            if (item.CollectionType === 'games') {
                url = '/games?serverId=' + serverId + '&parentId=' + id;

                return url;
            }
            if (item.CollectionType === 'musicvideos') {
                url = '/musicvideos?serverId=' + serverId + '&parentId=' + id;

                if (options.section === 'latest') {
                    url += '&tab=1';
                }
                return url;
            }
            if (item.CollectionType === 'homevideos') {
                url = '/homevideos?serverId=' + serverId + '&parentId=' + id;

                if (options.section === 'latest') {
                    url += '&tab=1';
                }
                return url;
            }
            if (item.CollectionType === 'tvshows') {
                url = '/tv?serverId=' + serverId + '&parentId=' + id;

                if (options.section === 'latest') {
                    url += '&tab=1';
                }
                return url;
            }
            if (item.CollectionType === 'music' || item.CollectionType === 'audiobooks') {
                url = '/music?serverId=' + serverId + '&parentId=' + id;
                return url;
            }
        }

        if (itemType === "Playlist" ||
            itemType === "TvChannel" ||
            itemType === "Program" ||
            itemType === "BoxSet" ||
            itemType === "MusicAlbum" ||
            itemType === "MusicGenre" ||
            itemType === "Person" ||
            itemType === "Recording" ||
            itemType === "MusicArtist") {
            return "/item?id=" + id + '&serverId=' + serverId;
        }

        var contextSuffix = context ? ('&context=' + context) : '';

        if (itemType === "Series" || itemType === "Season" || itemType === "Episode") {
            return "/item?id=" + id + contextSuffix + '&serverId=' + serverId;
        }

        if (item.IsFolder) {
            return id ? "/list/list.html?parentId=" + id + '&serverId=' + serverId : "#";
        }

        return "/item?id=" + id + '&serverId=' + serverId;
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

            else if (item.Type === 'Server') {
                return Promise.reject();
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

    function showVideoOsd(options) {

        var url = '/videoosd/videoosd.html';

        if (options && options.controls) {
            url += '?controls=true';
        }

        return show(url);
    }

    function defineRoute(newRoute) {

        var baseRoute = baseUrl();

        var path = newRoute.path;

        path = path.replace(baseRoute, '');

        console.log('Defining route: ' + path);

        addRoute(path, newRoute);
    }

    function addRoute(path, newRoute) {

        if (path && newRoute) {
            page(path, newRoute, handleRoute);
        }
        else {
            defineRoute(path);
        }
    }

    function getRoutes() {
        return page.getRoutes();
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

    function logout() {

        require(['playbackManager'], function (playbackManager) {

            loading.show();

            playbackManager.stop();

            connectionManager.logout().then(beginConnectionWizard);
        });
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
    appRouter.getRouteInfo = getRouteInfo;
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
    appRouter.logout = logout;
    appRouter.handleConnectionResult = handleConnectionResult;
    appRouter.validateUserAccessToRoute = validateUserAccessToRoute;

    return appRouter;
});
