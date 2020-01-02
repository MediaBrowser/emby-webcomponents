define(['dom', 'backdrop', 'browser', 'layoutManager', 'globalize', 'datetime', 'playbackManager', 'connectionManager', 'require', 'mainTabsManager', 'serverNotifications', 'appRouter', 'apphost', 'events', 'navdrawer', 'navDrawerContent', 'paper-icon-button-light', 'material-icons', 'css!./appheader', 'emby-select'], function (dom, backdrop, browser, layoutManager, globalize, datetime, playbackManager, connectionManager, require, mainTabsManager, serverNotifications, appRouter, appHost, events, navDrawerInstance, navDrawerContent) {
    'use strict';

    var skinHeaderElement = document.querySelector('.skinHeader');
    var skinBodyElement = document.querySelector('.skinBody');
    var mainDrawerElement = document.querySelector('.mainDrawer');
    var hasPhysicalBackButton = appHost.supports('physicalbackbutton');
    var userSignedIn = false;

    var headerHomeButton;
    var headerMenuButton;
    var headerBackButton;
    var headerCastButton;
    var selectedPlayerText;
    var headerLeft;
    var headerRight;
    var currentServerId;
    var isUserAdmin;

    function updateClock() {

        var clock = this.clockElement;

        if (clock) {
            clock.innerHTML = datetime.getDisplayTime(new Date()).toLowerCase();
        }
    }

    function onLocalUserSignedOut(e) {

        userSignedIn = false;
        document.querySelector('.headerSearchButton').classList.add('hide');
        updateUserInHeader(null);
        setRemoteControlVisibility();
    }

    function getUserImageUrl(user, apiClient, options) {

        options = options || {};
        options.type = "Primary";

        if (user.PrimaryImageTag) {

            options.tag = user.PrimaryImageTag;
            return apiClient.getUserImageUrl(user.Id, options);
        }

        return null;
    }

    function updateUserInHeader(user) {

        var headerUserButton = document.querySelector('.headerUserButton');
        var headerSettingsButton = document.querySelector('.headerSettingsButton');

        var userImageUrl;

        if (user) {
            if (user.PrimaryImageTag) {

                var apiClient = connectionManager.getApiClient(user.ServerId);

                var height = Math.round((38 * Math.max(window.devicePixelRatio || 1, 2)));

                userImageUrl = getUserImageUrl(user, apiClient, {
                    height: height
                });
            }
        }

        if (userImageUrl) {

            headerUserButton.innerHTML = '<img class="headerUserButtonImage paper-icon-button-img" src="' + userImageUrl + '" />';

        } else {
            headerUserButton.innerHTML = '<i class="md-icon">&#xE7FD;</i>';
        }

        if (user) {

            headerUserButton.classList.remove('hide');

            if (!layoutManager.tv) {
                headerSettingsButton.classList.remove('hide');
            } else {
                headerSettingsButton.classList.add('hide');
            }

            isUserAdmin = user.Policy.IsAdministrator;

        } else {
            headerUserButton.classList.add('hide');
            headerSettingsButton.classList.add('hide');
            isUserAdmin = false;
        }
    }

    function onUserUpdated(e, apiClient, data) {

        if (apiClient.getCurrentUserId() === data.Id && apiClient.serverId() === currentServerId && apiClient.isMinServerVersion('3.6.0.32')) {

            updateUserInHeader(data);
        }
    }

    function resetPremiereButton() {

        if (window.AndroidAppHost || (window.webkit && window.webkit.messageHandlers)) {
            return;
        }

        if (!window.Dashboard) {
            return;
        }

        require(['registrationServices', 'emby-button'], function (registrationServices) {

            registrationServices.validateFeature('themes',
                {
                    viewOnly: true,
                    showDialog: false

                }).then(removePremiereButton, function () {
                    addPremiereButton(registrationServices);
                });

        });
    }

    function addPremiereButton(registrationServices) {

        var html = '<button is="emby-button" class="raised button-submit btnHeaderPremiere headerButton" style="margin-right:1em;padding-top:.5em;padding-bottom:.5em;">' + globalize.translate('HeaderBecomeProjectSupporter') + '</button>';

        if (document.querySelector('.btnHeaderPremiere')) {
            return;
        }

        document.querySelector('.headerRight').insertAdjacentHTML('afterbegin', html);

        document.querySelector('.btnHeaderPremiere').addEventListener('click', function () {
            registrationServices.validateFeature('themes', {
                viewOnly: true

            }).then(resetPremiereButton);
        });
    }

    function removePremiereButton() {

        var btn = document.querySelector('.btnHeaderPremiere');
        if (btn) {
            btn.parentNode.removeChild(btn);
        }
    }

    function onLocalUserSignedIn(e, serverId, userId) {

        currentServerId = serverId;

        userSignedIn = true;
        document.querySelector('.headerSearchButton').classList.remove('hide');

        var apiClient = connectionManager.getApiClient(serverId);
        apiClient.getUser(userId).then(updateUserInHeader);

        resetPremiereButton();
        setRemoteControlVisibility();
    }

    function onHeaderMenuButtonClick() {

        navDrawerInstance.toggle();
    }

    function onHomeClick() {
        appRouter.goHome();
    }

    function onBackClick() {
        appRouter.back();
    }

    function onSearchClick() {
        appRouter.showSearch();
    }

    function onNowPlayingClick() {
        appRouter.showNowPlaying();
    }

    function onUserButtonClick() {
        appRouter.showUserMenu();
    }

    function onSettingsButtonClick() {

        if (!self.Dashboard || !isUserAdmin) {
            appRouter.showUserMenu();
            return;
        }

        appRouter.show(appRouter.getRouteUrl('manageserver'));
    }

    function onCastButtonClick() {
        var btn = this;

        require(['playerSelectionMenu'], function (playerSelectionMenu) {
            playerSelectionMenu.show(btn);
        });
    }

    function updateSkinHeaderBackdropFilter(skinHeader) {

        if (layoutManager.tv) {

            skinHeaderElement.classList.add('nobackdropfilter');

        } else {
            skinHeaderElement.classList.remove('nobackdropfilter');
        }
    }

    function onLayoutModeChange() {
        updateSkinHeaderBackdropFilter(skinHeaderElement);

        this.destroyClock();
        this.loadClock();
    }

    function updateCastIcon() {

        var btnCast = headerCastButton;

        if (!btnCast) {
            return;
        }

        var info = playbackManager.getPlayerInfo();

        if (info && !info.isLocalPlayer) {

            btnCast.querySelector('i').innerHTML = '&#xE308;';
            btnCast.classList.add('active');
            selectedPlayerText.innerHTML = info.deviceName || info.name;

        } else {
            btnCast.querySelector('i').innerHTML = '&#xE307;';
            btnCast.classList.remove('active');

            selectedPlayerText.innerHTML = '';
        }
    }

    function onPlaybackStart(e, player, state) {

        if (layoutManager.tv && state.NowPlayingItem && state.NowPlayingItem.MediaType === 'Audio') {

            document.querySelector('.headerAudioPlayerButton').classList.remove('hide');

            if (state.IsFirstItem && state.IsFullscreen) {
                onNowPlayingClick();
            }

        } else {
            document.querySelector('.headerAudioPlayerButton').classList.add('hide');
        }
    }

    function onPlaybackStop(e, stopInfo) {

        if (stopInfo.nextMediaType !== 'Audio') {
            document.querySelector('.headerAudioPlayerButton').classList.add('hide');
        }
    }

    function setRemoteControlVisibility(parent) {

        if (appHost.supports('remotecontrol') && !layoutManager.tv && userSignedIn) {
            headerCastButton.classList.remove('hide');
            selectedPlayerText.classList.remove('hide');
        } else {
            headerCastButton.classList.add('hide');
            selectedPlayerText.classList.add('hide');
        }
    }

    function updateHomeButton(detail) {

        if (userSignedIn && !layoutManager.tv && detail.homeButton !== false) {

            headerHomeButton.classList.remove('hide');
        } else {
            headerHomeButton.classList.add('hide');
        }
    }

    function updateMenuButton(detail, view) {

        if (!layoutManager.tv && userSignedIn && detail.drawer !== false && !detail.settingsTheme) {

            headerMenuButton.classList.remove('hide');
        } else {
            headerMenuButton.classList.add('hide');
        }
    }

    function updateBackButton(detail) {

        var backButtonConfig = detail.backButton;

        if (backButtonConfig !== false && appRouter.canGoBack()) {

            if (hasPhysicalBackButton && backButtonConfig !== true) {
                headerBackButton.classList.add('hide');
            } else {
                headerBackButton.classList.remove('hide');
            }
        } else {
            headerBackButton.classList.add('hide');
        }
    }

    function updateTitle(header, detail, view) {

        if (detail.defaultTitle) {
            header.setDefaultTitle();
            return;
        }

        var title = detail.title;

        if (title) {
            header.setTitle(globalize.translate(title));
            return;
        }

        title = view.getAttribute('data-title');

        if (title) {
            header.setTitle(title);
        }
    }

    function updateRightHeader(header, detail, view) {

        if (detail.secondaryHeaderFeatures === false) {
            headerRight.classList.add('hide');
        } else {
            headerRight.classList.remove('hide');
        }
    }

    var windowHeadroom;
    function loadWindowHeadroom() {

        require(['headroom-window'], function (headroom) {

            windowHeadroom = headroom;
            windowHeadroom.add(skinHeaderElement);
        });
    }

    function setWindowHeadroomEnabled(enabled) {

        if (!windowHeadroom && !enabled) {

            return;
        }

        if (windowHeadroom) {

            if (enabled) {
                windowHeadroom.add(skinHeaderElement);
            } else {
                windowHeadroom.remove(skinHeaderElement);
            }

            return;
        }

        loadWindowHeadroom();
    }

    function getScrollingElement() {
        return document.scrollingElement || document.documentElement;
    }

    function updateWindowScroll(detail, view) {

        var scrollingElement = getScrollingElement();

        if (enableWindowScroll(detail, view)) {
            scrollingElement.classList.remove('noScrollY');
            scrollingElement.classList.add('overflowYScroll');
            skinBodyElement.classList.add('skinBody-withWindowScroll');
        } else {
            scrollingElement.classList.add('noScrollY');
            scrollingElement.classList.remove('overflowYScroll');
            skinBodyElement.classList.remove('skinBody-withWindowScroll');
        }
    }

    function updateDrawerLayout(detail) {

        detail.drawerInline = detail.settingsTheme && detail.drawer !== false && !layoutManager.tv;

        var drawerStyle = detail.drawerInline ? 2 : 0;

        if (drawerStyle === 2) {

            //skinBodyElement.classList.remove('skinBody-withPartialDrawer');
            //mainDrawerElement.classList.remove('mainDrawer-open-partial');

            skinBodyElement.classList.add('skinBody-withFullDrawer');
            mainDrawerElement.classList.add('mainDrawer-open-full');
            mainDrawerElement.classList.add('mainDrawer-docked');

        } else if (drawerStyle === 1) {

            skinBodyElement.classList.remove('skinBody-withFullDrawer');
            mainDrawerElement.classList.remove('mainDrawer-open-full');

            skinBodyElement.classList.add('skinBody-withPartialDrawer');
            mainDrawerElement.classList.add('mainDrawer-open-partial');
            mainDrawerElement.classList.add('mainDrawer-docked');

        } else {
            skinBodyElement.classList.remove('skinBody-withFullDrawer');
            //skinBodyElement.classList.remove('skinBody-withPartialDrawer');

            mainDrawerElement.classList.remove('mainDrawer-open-full');
            //mainDrawerElement.classList.remove('mainDrawer-open-partial');
            mainDrawerElement.classList.remove('mainDrawer-docked');
        }
    }

    function onViewShow(e) {

        var skinHeader = skinHeaderElement;

        var detail = e.detail;

        if (detail.clearBackdrop) {
            backdrop.clear();
        }

        if (detail.headerBackground === false) {
            skinHeader.classList.remove('skinHeader-withBackground');
        }

        skinHeader.dispatchEvent(new CustomEvent('forceclearheadroom', {
            cancelable: false
        }));

        setWindowHeadroomEnabled(detail.autoHideHeader);

        updateDrawerLayout(detail);

        updateBackButton(detail);
        updateHomeButton(detail);
        updateMenuButton(detail, e.target);

        this.setTransparent(detail.transparentHeader);

        updateRightHeader(this, detail, e.target);
        updateTitle(this, detail, e.target);

        navDrawerContent.onViewShow(e);

        if (!detail.isRestored && enableWindowScroll(detail)) {
            // Scroll back up so in case vertical scroll was messed with
            window.scrollTo(0, 0);
        }
    }

    function clearTabs() {

        mainTabsManager.setTabs(null);
    }

    function enableWindowScroll(detail, view) {

        // This is unfortunate, but using an embedded scroller in the iOS wkwebview doesn't work well
        // https://emby.media/community/index.php?/topic/77097-so-many-bugs-when-are-we-getting-the-fixes/
        // When a text box or select is clicked, the native UI slides up and resizes the webview
        // This causes things to get out of wack and click events to be received on the wrong elements
        // It appears to be a bug in wkwebview
        var windowScroll = detail.windowScroll;
        var elem;

        if (windowScroll === 2 && !layoutManager.tv && browser.iOS) {

            if (view) {
                elem = view.querySelector('.padded-top-page');
                if (elem) {
                    elem.classList.remove('padded-top-page');
                }
                view.classList.add('page-withiOSScrollHack');
            }

            return true;
        }
        else if (windowScroll === 3 && !layoutManager.tv) {

            if (view) {
                elem = view.querySelector('.padded-top-page');
                if (elem) {
                    elem.classList.remove('padded-top-page');
                }
            }

            return true;
        }

        return windowScroll === true;
    }

    function onViewBeforeShow(e) {

        var detail = e.detail;
        var view = e.target;

        if (detail.headerTabs) {

            headerLeft.classList.add('headerPartFixedWidth');
            headerRight.classList.add('headerPartFixedWidth');
        } else {
            clearTabs();
            headerLeft.classList.remove('headerPartFixedWidth');
            headerRight.classList.remove('headerPartFixedWidth');
        }

        var skinHeader = skinHeaderElement;

        skinHeader.dispatchEvent(new CustomEvent('clearheadroom', {
            cancelable: false
        }));

        if (detail.headerBackground !== false) {
            skinHeader.classList.add('skinHeader-withBackground');
        }

        updateWindowScroll(detail, view);
    }

    function mapViews(views, selectedId) {

        var items = [];

        for (var i = 0, length = views.length; i < length; i++) {

            var view = views[i];

            items.push({
                name: view.Name,
                id: view.Id,
                selected: view.Id === selectedId
            });
        }

        return items;
    }

    function onCancelled() {
        return Promise.resolve();
    }

    function showLibrarySelection(button, selectedId, serverId) {

        connectionManager.getApiClient(serverId).getUserViews().then(function (result) {

            require(['actionsheet']).then(function (responses) {

                var actionSheet = responses[0];

                return actionSheet.show({

                    items: mapViews(result.Items, selectedId),
                    positionTo: button,
                    type: 'select'

                }).then(function (id) {

                    appRouter.showItem(id, serverId);

                }, onCancelled);
            });
        });
    }

    function onPageTitleClick(e) {

        var btnHeaderSelectLibrary = dom.parentWithClass(e.target, 'btnHeaderSelectLibrary');
        if (btnHeaderSelectLibrary) {

            showLibrarySelection(btnHeaderSelectLibrary, btnHeaderSelectLibrary.getAttribute('data-id'), btnHeaderSelectLibrary.getAttribute('data-serverid'));
        }
    }

    var boundLayoutModeChangeFn;

    function bindEvents(instance) {

        var parent = instance.element;

        headerBackButton = parent.querySelector('.headerBackButton');
        headerHomeButton = parent.querySelector('.headerHomeButton');
        headerMenuButton = parent.querySelector('.headerMenuButton');
        headerCastButton = parent.querySelector('.headerCastButton');
        selectedPlayerText = parent.querySelector('.headerSelectedPlayer');

        headerLeft = parent.querySelector('.headerLeft');
        headerRight = parent.querySelector('.headerRight');

        headerBackButton.addEventListener('click', onBackClick);
        headerHomeButton.addEventListener('click', onHomeClick);
        parent.querySelector('.headerSearchButton').addEventListener('click', onSearchClick);
        parent.querySelector('.headerAudioPlayerButton').addEventListener('click', onNowPlayingClick);
        headerCastButton.addEventListener('click', onCastButtonClick);
        parent.querySelector('.headerUserButton').addEventListener('click', onUserButtonClick);
        parent.querySelector('.headerSettingsButton').addEventListener('click', onSettingsButtonClick);
        headerMenuButton.addEventListener('click', onHeaderMenuButtonClick);

        boundLayoutModeChangeFn = onLayoutModeChange.bind(instance);

        events.on(layoutManager, 'modechange', boundLayoutModeChangeFn);
        events.on(playbackManager, 'playerchange', updateCastIcon);
        events.on(playbackManager, 'playbackstart', onPlaybackStart);
        events.on(playbackManager, 'playbackstop', onPlaybackStop);

        events.on(connectionManager, 'localusersignedin', onLocalUserSignedIn);
        events.on(connectionManager, 'localusersignedout', onLocalUserSignedOut);
        events.on(serverNotifications, 'UserUpdated', onUserUpdated);

        document.addEventListener('viewbeforeshow', onViewBeforeShow);
        document.addEventListener('viewshow', onViewShow.bind(instance));

        var pageTitleElement = instance.pageTitleElement = parent.querySelector('.pageTitle');
        pageTitleElement.addEventListener('click', onPageTitleClick);

        resetPremiereButton();
        events.on(connectionManager, 'resetregistrationinfo', resetPremiereButton);
    }

    function unbindEvents(instance) {

        var parent = instance.element;

        if (parent) {
            parent.querySelector('.headerBackButton').removeEventListener('click', onBackClick);
            parent.querySelector('.headerHomeButton').removeEventListener('click', onHomeClick);
            parent.querySelector('.headerSearchButton').removeEventListener('click', onSearchClick);
            parent.querySelector('.headerAudioPlayerButton').removeEventListener('click', onNowPlayingClick);
            parent.querySelector('.headerCastButton').removeEventListener('click', onCastButtonClick);
            parent.querySelector('.headerUserButton').removeEventListener('click', onUserButtonClick);
            parent.querySelector('.headerSettingsButton').removeEventListener('click', onSettingsButtonClick);
            parent.querySelector('.headerMenuButton').removeEventListener('click', onHeaderMenuButtonClick);
        }

        events.off(layoutManager, 'modechange', boundLayoutModeChangeFn);
        events.off(playbackManager, 'playerchange', updateCastIcon);
        events.off(playbackManager, 'playbackstart', onPlaybackStart);
        events.off(playbackManager, 'playbackstop', onPlaybackStop);

        events.off(connectionManager, 'localusersignedin', onLocalUserSignedIn);
        events.off(connectionManager, 'localusersignedout', onLocalUserSignedOut);
        events.off(serverNotifications, 'UserUpdated', onUserUpdated);
        events.off(connectionManager, 'resetregistrationinfo', resetPremiereButton);

        document.removeEventListener('viewbeforeshow', onViewBeforeShow);
        document.removeEventListener('viewshow', onViewShow);
    }

    function render(instance) {

        instance.element = skinHeaderElement;

        updateSkinHeaderBackdropFilter(instance.element);

        return require(['text!./appheader.template.html']).then(function (responses) {

            instance.element.innerHTML = globalize.translateHtml(responses[0]);

            bindEvents(instance);
            setRemoteControlVisibility();

            instance.loadClock();
        });
    }

    function AppHeader() {

    }

    AppHeader.prototype.init = function () {

        return render(this);
    };

    AppHeader.prototype.loadClock = function () {

        if (!layoutManager.tv) {
            this.destroyClock();
            return;
        }

        var elem = document.querySelector('.headerClock');
        elem.classList.remove('hide');

        this.clockElement = elem;
        this.clockInterval = setInterval(updateClock.bind(this), 50000);

        updateClock.call(this);
    };

    AppHeader.prototype.setDefaultTitle = function (title) {

        var pageTitleElement = this.pageTitleElement;

        if (pageTitleElement) {
            pageTitleElement.classList.add('pageTitleWithLogo');
            pageTitleElement.classList.add('pageTitleWithDefaultLogo');
            pageTitleElement.style.backgroundImage = null;
            pageTitleElement.innerHTML = '';
        }

        document.title = 'Emby';
    };

    function getTitleHtml(title) {

        if (!title) {
            return '';
        }

        if (typeof (title) === 'string') {
            return title;
        }

        var item = title;

        title = item.Name || '';

        if (!layoutManager.tv) {

            var serverId;
            var itemId;

            if (item.IsFolder) {
                serverId = item.ServerId;
                itemId = item.Id;
            }
            else {

                if (window.location.href.toString().toLowerCase().indexOf('livetv') !== -1 &&
                    window.location.href.toString().toLowerCase().indexOf('livetvsetup') === -1) {
                    serverId = connectionManager.currentApiClient().serverId();
                    itemId = 'livetv';
                }
            }

            if (serverId && itemId) {
                title = '<div class="pageTitleTextHide">' + title + '</div><button data-serverid="' + serverId + '" data-id="' + itemId + '" is="emby-button" type="button" class="button-flat btnHeaderSelectLibrary"><span>' + title + '</span><i class="md-icon button-icon">arrow_drop_down</i></button>';
            }
        }

        return title;
    }

    AppHeader.prototype.setTitle = function (title) {

        if (title == null) {
            this.setDefaultTitle();
            return;
        }

        // hack alert
        if (title === '-') {
            title = '';
        }

        var html = getTitleHtml(title);

        var pageTitleElement = this.pageTitleElement;

        if (pageTitleElement) {
            pageTitleElement.classList.remove('pageTitleWithLogo');
            pageTitleElement.classList.remove('pageTitleWithDefaultLogo');
            pageTitleElement.style.backgroundImage = null;
            pageTitleElement.innerHTML = html || '';
        }

        if (!title) {
            document.title = 'Emby';
        }
        else if (typeof (title) === 'string') {
            document.title = title;
        }
        else {
            document.title = title.Name || 'Emby';
        }
    };

    AppHeader.prototype.setTransparent = function (transparent) {
        if (transparent) {
            skinHeaderElement.classList.add('semiTransparent');
        } else {
            skinHeaderElement.classList.remove('semiTransparent');
        }
    };

    AppHeader.prototype.destroyClock = function () {

        var interval = this.clockInterval;
        if (interval) {
            clearInterval(interval);
        }

        var elem = this.clockElement;
        if (elem) {
            elem.classList.add('hide');
        }

        this.clockElement = null;
        this.clockInterval = null;
    };

    AppHeader.prototype.destroy = function () {

        var self = this;

        this.destroyClock();

        unbindEvents(this);

        self.element = null;
    };

    return new AppHeader();
});