define(['browser', 'layoutManager', 'globalize', 'datetime', 'playbackManager', 'connectionManager', 'require', 'mainTabsManager', 'serverNotifications', 'appRouter', 'apphost', 'events', 'paper-icon-button-light', 'material-icons', 'css!./appheader'], function (browser, layoutManager, globalize, datetime, playbackManager, connectionManager, require, mainTabsManager, serverNotifications, appRouter, appHost, events) {
    'use strict';

    var skinHeaderElement = document.querySelector('.skinHeader');
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
        var headerManageServerButton = document.querySelector('.headerManageServerButton');

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

            headerUserButton.innerHTML = '<img class="headerUserButtonImage" src="' + userImageUrl + '" />';

        } else {
            headerUserButton.innerHTML = '<i class="md-icon">&#xE7FD;</i>';
        }

        if (user) {

            headerUserButton.classList.remove('hide');

            if (user.Policy.IsAdministrator && self.Dashboard && layoutManager.desktop) {
                headerManageServerButton.classList.remove('hide');
            } else {
                headerManageServerButton.classList.add('hide');
            }

        } else {
            headerUserButton.classList.add('hide');
            headerManageServerButton.classList.add('hide');
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

    var libraryMenu;
    function onHeaderMenuButtonClick() {

        if (libraryMenu) {
            libraryMenu.onHardwareMenuButtonClick();
            return;
        }

        require(['libraryMenu'], function (a) {
            libraryMenu = a;
            libraryMenu.onHardwareMenuButtonClick();
        });
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

    function onManageServerButtonClick() {
        Dashboard.navigate('dashboard.html');
    }

    function onCastButtonClick() {
        var btn = this;

        require(['playerSelectionMenu'], function (playerSelectionMenu) {
            playerSelectionMenu.show(btn);
        });
    }

    function updateSkinHeaderBackdropFilter(skinHeader) {

        if (browser.android || layoutManager.tv) {

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

    function updateHomeButton(e) {

        if (userSignedIn && !layoutManager.tv && e.detail.homeButton !== false) {

            headerHomeButton.classList.remove('hide');
        } else {
            headerHomeButton.classList.add('hide');
        }
    }

    function updateMenuButton(e, view) {

        if (self.Dashboard && !layoutManager.tv && userSignedIn && e.detail.secondaryHeaderFeatures !== false && !view.classList.contains('type-interior')) {

            headerMenuButton.classList.remove('hide');
        } else {
            headerMenuButton.classList.add('hide');
        }
    }

    function updateBackButton(e) {

        var backButtonConfig = e.detail.backButton;

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

    function updateTitle(header, e, view) {

        var title = e.title || view.getAttribute('data-title');

        if (title) {
            header.setTitle(title);
        } else if (view.classList.contains('standalonePage')) {
            header.setDefaultTitle();
        }
    }

    function updateRightHeader(header, e, view) {

        if (e.detail.secondaryHeaderFeatures === false) {
            headerRight.classList.add('hide');
        } else {
            headerRight.classList.remove('hide');
        }
    }

    function updateHeaderBackground(header, e, view) {

        header.setTransparent(e.detail.transparentHeader);
    }

    function onViewShow(e) {

        var skinHeader = skinHeaderElement;

        if (e.detail.autoHideHeader === false) {
            skinHeader.classList.remove('skinHeader-withBackground');
        }

        skinHeader.dispatchEvent(new CustomEvent('forceclearheadroom', {
            cancelable: false
        }));

        updateBackButton(e);
        updateHomeButton(e);
        updateMenuButton(e, e.target);

        updateHeaderBackground(this, e, e.target);
        updateRightHeader(this, e, e.target);
        updateTitle(this, e, e.target);
    }

    function clearTabs() {

        mainTabsManager.setTabs(null);
    }

    function onViewBeforeShow(e) {

        if (e.detail.headerTabs) {

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

        if (e.detail.autoHideHeader !== false) {
            skinHeader.classList.add('skinHeader-withBackground');
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
        parent.querySelector('.headerManageServerButton').addEventListener('click', onManageServerButtonClick);
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
            parent.querySelector('.headerManageServerButton').removeEventListener('click', onManageServerButtonClick);
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

    function initHeadRoom(elem) {

        require(["headroom-window"], function (headroom) {

            headroom.add(elem);
        });
    }

    function render(instance) {

        instance.element = skinHeaderElement;

        updateSkinHeaderBackdropFilter(instance.element);

        return require(['text!./appheader.template.html']).then(function (responses) {

            instance.element.innerHTML = globalize.translateHtml(responses[0]);

            bindEvents(instance);
            setRemoteControlVisibility();

            initHeadRoom(instance.element);

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

        if (!pageTitleElement) {
            pageTitleElement = this.pageTitleElement = document.querySelector('.pageTitle');
        }
        if (pageTitleElement) {
            pageTitleElement.classList.add('pageTitleWithLogo');
            pageTitleElement.classList.add('pageTitleWithDefaultLogo');
            pageTitleElement.style.backgroundImage = null;
            pageTitleElement.innerHTML = '';
        }

        document.title = 'Emby';
    };

    AppHeader.prototype.setTitle = function (title) {

        if (title == null) {
            this.setDefaultTitle();
            return;
        }

        // hack alert
        if (title === '-') {
            title = '';
        }

        var html = title;

        var pageTitleElement = this.pageTitleElement;

        if (!pageTitleElement) {
            pageTitleElement = this.pageTitleElement = document.querySelector('.pageTitle');
        }

        if (pageTitleElement) {
            pageTitleElement.classList.remove('pageTitleWithLogo');
            pageTitleElement.classList.remove('pageTitleWithDefaultLogo');
            pageTitleElement.style.backgroundImage = null;
            pageTitleElement.innerHTML = html || '';
        }

        document.title = title || 'Emby';
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