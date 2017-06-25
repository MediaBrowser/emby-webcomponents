define(['cardBuilder', 'appSettings', 'dom', 'apphost', 'layoutManager', 'imageLoader', 'globalize', 'itemShortcuts', 'itemHelper', 'embyRouter', 'emby-button', 'paper-icon-button-light', 'emby-itemscontainer', 'emby-scroller', 'emby-linkbutton'], function (cardBuilder, appSettings, dom, appHost, layoutManager, imageLoader, globalize, itemShortcuts, itemHelper, embyRouter) {
    'use strict';

    function getDefaultSection(index) {

        switch (index) {

            case 0:
                return 'smalllibrarytiles';
            case 1:
                return 'activerecordings';
            case 2:
                return 'resume';
            case 3:
                return 'resumeaudio';
            case 4:
                return 'livetv';
            case 5:
                return 'nextup';
            case 6:
                return 'latestmedia';
            case 7:
                return 'none';
            default:
                return '';
        }
    }

    function loadSections(elem, apiClient, user, userSettings) {

        return getUserViews(apiClient, user.Id).then(function (userViews) {

            var i, length;
            var sectionCount = 7;

            var html = '';
            for (i = 0, length = sectionCount; i < length; i++) {

                html += '<div class="verticalSection section' + i + '"></div>';
            }

            elem.innerHTML = html;
            elem.classList.add('homeSectionsContainer');

            var promises = [];

            for (i = 0, length = sectionCount; i < length; i++) {

                promises.push(loadSection(elem, apiClient, user, userSettings, userViews, i));
            }

            return Promise.all(promises);
        });
    }

    function loadSection(page, apiClient, user, userSettings, userViews, index) {

        var userId = user.Id;

        var section = userSettings.get('homesection' + index) || getDefaultSection(index);

        if (section === 'folders') {
            section = getDefaultSection()[0];
        }

        var elem = page.querySelector('.section' + index);

        if (section === 'latestmedia') {
            return loadRecentlyAdded(elem, apiClient, user, userViews);
        }
        else if (section === 'librarytiles' || section === 'smalllibrarytiles' || section === 'smalllibrarytiles-automobile' || section === 'librarytiles-automobile') {
            return loadLibraryTiles(elem, apiClient, user, userSettings, 'smallBackdrop', userViews);
        }
        else if (section === 'librarybuttons') {
            return loadlibraryButtons(elem, apiClient, userId, userSettings, userViews);
        }
        else if (section === 'resume') {
            return loadResumeVideo(elem, apiClient, userId);
        }
        else if (section === 'resumeaudio') {
            return loadResumeAudio(elem, apiClient, userId);
        }
        else if (section === 'activerecordings') {
            return loadActiveRecordings(elem, apiClient, userId);
        }
        else if (section === 'nextup') {
            return loadNextUp(elem, apiClient, userId);
        }
        else if (section === 'onnow' || section === 'livetv') {
            return loadOnNow(elem, apiClient, user);
        }
        else if (section === 'latesttvrecordings') {
            return loadLatestLiveTvRecordings(elem, apiClient, userId);
        }
        else if (section === 'latestchannelmedia') {
            return loadLatestChannelMedia(elem, apiClient, userId);

        } else {

            elem.innerHTML = '';

            return Promise.resolve();
        }
    }

    function getUserViews(apiClient, userId) {

        return apiClient.getUserViews({}, userId || apiClient.getCurrentUserId()).then(function (result) {

            return result.Items;
        });
    }

    function enableScrollX() {
        return !layoutManager.desktop;
    }

    function getSquareShape() {
        return enableScrollX() ? 'overflowSquare' : 'square';
    }

    function getThumbShape() {
        return enableScrollX() ? 'overflowBackdrop' : 'backdrop';
    }

    function getPortraitShape() {
        return enableScrollX() ? 'overflowPortrait' : 'portrait';
    }

    function getLibraryButtonsHtml(items) {

        var html = "";

        html += '<div class="sectionTitleContainer">';
        html += '<h2 class="sectionTitle sectionTitle-cards padded-left">' + globalize.translate('sharedcomponents#HeaderMyMedia') + '</h2>';

        if (!layoutManager.tv) {
            html += '<button type="button" is="paper-icon-button-light" class="sectionTitleIconButton btnHomeScreenSettings"><i class="md-icon">&#xE8B8;</i></button>';
        }

        html += '</div>';

        html += '<div is="emby-itemscontainer" class="itemsContainer padded-left padded-right vertical-wrap focuscontainer-x" data-multiselect="false">';

        // "My Library" backgrounds
        for (var i = 0, length = items.length; i < length; i++) {

            var item = items[i];

            var icon;

            switch (item.CollectionType) {
                case "movies":
                    icon = "local_movies";
                    break;
                case "music":
                    icon = "library_music";
                    break;
                case "photos":
                    icon = "photo";
                    break;
                case "livetv":
                    icon = "live_tv";
                    break;
                case "tvshows":
                    icon = "live_tv";
                    break;
                case "games":
                    icon = "folder";
                    break;
                case "trailers":
                    icon = "local_movies";
                    break;
                case "homevideos":
                    icon = "video_library";
                    break;
                case "musicvideos":
                    icon = "video_library";
                    break;
                case "books":
                    icon = "folder";
                    break;
                case "channels":
                    icon = "folder";
                    break;
                case "playlists":
                    icon = "folder";
                    break;
                default:
                    icon = "folder";
                    break;
            }

            html += '<a is="emby-linkbutton" href="' + embyRouter.getRouteUrl(item) + '" class="raised homeLibraryButton"><i class="md-icon">' + icon + '</i><span>' + item.Name + '</span></a>';
        }

        html += '</div>';

        return html;
    }

    function loadlibraryButtons(elem, apiClient, userId, userSettings, userViews) {

        var html = getLibraryButtonsHtml(userViews);

        return getAppInfo(apiClient).then(function (infoHtml) {

            elem.innerHTML = html + infoHtml;

            bindHomeScreenSettingsIcon(elem, apiClient, userId, userSettings);

            if (infoHtml) {
                bindAppInfoEvents(elem);
            }
        });
    }

    function bindAppInfoEvents(elem) {

        getRequirePromise(['registrationServices']).then(function (registrationServices) {
            elem.querySelector('.appInfoSection').addEventListener('click', function (e) {

                if (dom.parentWithClass(e.target, 'card')) {
                    registrationServices.showPremiereInfo();
                }
            });
        });
    }

    /**
     * Returns a random integer between min (inclusive) and max (inclusive)
     * Using Math.round() will give you a non-uniform distribution!
     */
    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function getAppInfo(apiClient) {

        var frequency = 172800000;

        var cacheKey = 'lastappinfopresent5';
        var lastDatePresented = parseInt(appSettings.get(cacheKey) || '0');

        // Don't show the first time, right after installation
        if (!lastDatePresented) {
            appSettings.set(cacheKey, new Date().getTime());
            return Promise.resolve('');
        }

        if ((new Date().getTime() - lastDatePresented) < frequency) {
            return Promise.resolve('');
        }

        return getRequirePromise(['registrationServices']).then(function (registrationServices) {

            return registrationServices.validateFeature('dvr', {

                showDialog: false

            }).then(function () {

                appSettings.set(cacheKey, new Date().getTime());
                return '';

            }, function () {

                appSettings.set(cacheKey, new Date().getTime());

                var infos = [getPremiereInfo];

                if (appHost.supports('otherapppromotions')) {
                    infos.push(getTheaterInfo);
                }

                return infos[getRandomInt(0, infos.length - 1)]();
            });
        });
    }

    function getCard(img, shape) {

        shape = shape || 'backdropCard';
        var html = '<div class="card scalableCard ' + shape + ' ' + shape + '-scalable"><div class="cardBox"><div class="cardScalable"><div class="cardPadder cardPadder-backdrop"></div>';

        html += '<div class="cardContent">';

        html += '<div class="cardImage lazy" data-src="' + img + '"></div>';

        html += '</div>';

        html += '</div></div></div>';

        return html;
    }

    function getTheaterInfo() {

        var html = '';
        html += '<div class="verticalSection appInfoSection">';
        html += '<div class="sectionTitleContainer">';
        html += '<h2 class="sectionTitle sectionTitle-cards padded-left">Discover Emby Theater</h2>';
        html += '<button is="paper-icon-button-light" class="sectionTitleButton" onclick="this.parentNode.parentNode.remove();" class="autoSize"><i class="md-icon">close</i></button>';
        html += '</div>';

        var nameText = 'Emby Theater';
        html += '<div class="padded-left padded-right">';
        html += '<p class="sectionTitle-cards">A beautiful app for your TV and large screen tablet. ' + nameText + ' runs on Windows, Xbox One, Raspberry Pi, Samsung Smart TVs, Sony PS4, Web Browsers, and more.</p>';
        html += '<div class="itemsContainer vertical-wrap">';
        html += getCard('https://raw.githubusercontent.com/MediaBrowser/Emby.Resources/master/apps/theater1.png');
        html += getCard('https://raw.githubusercontent.com/MediaBrowser/Emby.Resources/master/apps/theater2.png');
        html += getCard('https://raw.githubusercontent.com/MediaBrowser/Emby.Resources/master/apps/theater3.png');
        html += '</div>';
        html += '</div>';
        html += '</div>';
        return html;
    }

    function getPremiereInfo() {

        var html = '';
        html += '<div class="verticalSection appInfoSection">';
        html += '<div class="sectionTitleContainer">';
        html += '<h2 class="sectionTitle sectionTitle-cards padded-left">Discover Emby Premiere</h2>';
        html += '<button is="paper-icon-button-light" class="sectionTitleButton" onclick="this.parentNode.parentNode.remove();" class="autoSize"><i class="md-icon">close</i></button>';
        html += '</div>';

        html += '<div class="padded-left padded-right">';
        html += '<p class="sectionTitle-cards">Enjoy Emby DVR, get free access to Emby apps, and more.</p>';
        html += '<div class="itemsContainer vertical-wrap">';
        html += getCard('https://raw.githubusercontent.com/MediaBrowser/Emby.Resources/master/apps/theater1.png');
        html += getCard('https://raw.githubusercontent.com/MediaBrowser/Emby.Resources/master/apps/theater2.png');
        html += getCard('https://raw.githubusercontent.com/MediaBrowser/Emby.Resources/master/apps/theater3.png');
        html += '</div>';
        html += '</div>';
        html += '</div>';
        return html;
    }

    function renderLatestSection(elem, apiClient, user, parent) {

        var limit = 12;

        if (enableScrollX()) {

            if (parent.CollectionType === 'music') {
                limit = 30;
            }
        }
        else {

            if (parent.CollectionType === 'tvshows') {
                limit = 5;
            } else if (parent.CollectionType === 'music') {
                limit = 9;
            } else {
                limit = 8;
            }
        }

        var options = {

            Limit: limit,
            Fields: "PrimaryImageAspectRatio,BasicSyncInfo",
            ImageTypeLimit: 1,
            EnableImageTypes: "Primary,Backdrop,Thumb",
            ParentId: parent.Id
        };

        return apiClient.getJSON(apiClient.getUrl('Users/' + user.Id + '/Items/Latest', options)).then(function (items) {

            var html = '';

            if (items.length) {

                html += '<div class="sectionTitleContainer padded-left">';
                if (!layoutManager.tv) {

                    html += '<a is="emby-linkbutton" href="' + embyRouter.getRouteUrl(parent, {

                        section: 'latest'

                    }) + '" class="more button-flat button-flat-mini sectionTitleTextButton">';
                    html += '<h2 class="sectionTitle sectionTitle-cards">';
                    html += globalize.translate('sharedcomponents#LatestFromLibrary', parent.Name);
                    html += '</h2>';
                    html += '<i class="md-icon">&#xE5CC;</i>';
                    html += '</a>';

                } else {
                    html += '<h2 class="sectionTitle sectionTitle-cards">' + globalize.translate('sharedcomponents#LatestFromLibrary', parent.Name) + '</h2>';
                }
                html += '</div>';

                if (enableScrollX()) {
                    html += '<div is="emby-scroller" class="padded-top-focusscale padded-bottom-focusscale" data-mousewheel="false" data-centerfocus="true"><div is="emby-itemscontainer" class="scrollSlider focuscontainer-x padded-left padded-right">';
                } else {
                    html += '<div is="emby-itemscontainer" class="itemsContainer padded-left padded-right vertical-wrap focuscontainer-x">';
                }

                var viewType = parent.CollectionType;

                var shape = viewType === 'movies' ?
                    getPortraitShape() :
                    viewType === 'music' ?
                        getSquareShape() :
                        getThumbShape();

                var supportsImageAnalysis = appHost.supports('imageanalysis');
                supportsImageAnalysis = false;
                var cardLayout = supportsImageAnalysis && (viewType === 'music' || viewType === 'movies' || viewType === 'tvshows' || viewType === 'musicvideos' || !viewType);

                html += cardBuilder.getCardsHtml({
                    items: items,
                    shape: shape,
                    preferThumb: viewType !== 'movies' && viewType !== 'music',
                    showUnplayedIndicator: false,
                    showChildCountIndicator: true,
                    context: 'home',
                    overlayText: false,
                    centerText: !cardLayout,
                    overlayPlayButton: viewType !== 'photos',
                    allowBottomPadding: !enableScrollX() && !cardLayout,
                    cardLayout: cardLayout,
                    showTitle: viewType === 'music' || viewType === 'tvshows' || viewType === 'movies' || !viewType || cardLayout,
                    showYear: viewType === 'movies' || viewType === 'tvshows' || !viewType,
                    showParentTitle: viewType === 'music' || viewType === 'tvshows' || !viewType || (cardLayout && (viewType === 'tvshows')),
                    vibrant: supportsImageAnalysis && cardLayout,
                    lines: 2
                });

                if (enableScrollX()) {
                    html += '</div>';
                }
                html += '</div>';
            }

            elem.innerHTML = html;
            imageLoader.lazyChildren(elem);
        });
    }

    function loadRecentlyAdded(elem, apiClient, user, userViews) {

        elem.classList.remove('verticalSection');

        var excludeViewTypes = ['playlists', 'livetv', 'boxsets', 'channels'];
        var excludeItemTypes = ['Channel'];

        for (var i = 0, length = userViews.length; i < length; i++) {

            var item = userViews[i];

            if (user.Configuration.LatestItemsExcludes.indexOf(item.Id) !== -1) {
                continue;
            }

            if (excludeViewTypes.indexOf(item.CollectionType || []) !== -1) {
                continue;
            }

            // not implemented yet
            if (excludeItemTypes.indexOf(item.Type) !== -1) {
                continue;
            }

            var frag = document.createElement('div');
            frag.classList.add('verticalSection');
            elem.appendChild(frag);

            renderLatestSection(frag, apiClient, user, item);
        }
    }

    function loadLatestChannelMedia(elem, apiClient, userId) {

        var screenWidth = dom.getWindowSize().innerWidth;

        var options = {

            Limit: enableScrollX() ? 12 : (screenWidth >= 2400 ? 10 : (screenWidth >= 1600 ? 10 : (screenWidth >= 1440 ? 8 : (screenWidth >= 800 ? 7 : 6)))),
            Fields: "PrimaryImageAspectRatio,BasicSyncInfo",
            Filters: "IsUnplayed",
            UserId: userId
        };

        return apiClient.getJSON(apiClient.getUrl("Channels/Items/Latest", options)).then(function (result) {

            var html = '';

            if (result.Items.length) {
                html += '<h2 class="sectionTitle sectionTitle-cards padded-left">' + globalize.translate('sharedcomponents#HeaderLatestChannelMedia') + '</h2>';

                if (enableScrollX()) {
                    html += '<div is="emby-scroller" class="padded-top-focusscale padded-bottom-focusscale" data-mousewheel="false" data-centerfocus="true"><div is="emby-itemscontainer" class="scrollSlider focuscontainer-x padded-left padded-right">';
                } else {
                    html += '<div is="emby-itemscontainer" class="itemsContainer padded-left padded-right vertical-wrap focuscontainer-x">';
                }

                html += cardBuilder.getCardsHtml({
                    items: result.Items,
                    shape: 'auto',
                    showTitle: true,
                    centerText: true,
                    lazy: true,
                    showDetailsMenu: true,
                    overlayPlayButton: true
                });

                if (enableScrollX()) {
                    html += '</div>';
                }
            }

            elem.innerHTML = html;
            imageLoader.lazyChildren(elem);
        });
    }

    function getRequirePromise(deps) {

        return new Promise(function (resolve, reject) {

            require(deps, resolve);
        });
    }

    function showHomeScreenSettings(elem, options) {
        return getRequirePromise(['homescreenSettingsDialog']).then(function (homescreenSettingsDialog) {

            return homescreenSettingsDialog.show(options).then(function () {

                dom.parentWithClass(elem, 'homeSectionsContainer').dispatchEvent(new CustomEvent('settingschange', {
                    cancelable: false
                }));
            });
        });
    }

    function bindHomeScreenSettingsIcon(elem, apiClient, userId, userSettings) {

        var btnHomeScreenSettings = elem.querySelector('.btnHomeScreenSettings');
        if (!btnHomeScreenSettings) {
            return;
        }

        btnHomeScreenSettings.addEventListener('click', function () {
            showHomeScreenSettings(elem, {
                serverId: apiClient.serverId(),
                userId: userId,
                userSettings: userSettings

            });
        });
    }

    function loadLibraryTiles(elem, apiClient, user, userSettings, shape, userViews) {

        var html = '';

        html += '<div>';

        if (userViews.length) {

            html += '<div class="sectionTitleContainer">';
            html += '<h2 class="sectionTitle sectionTitle-cards padded-left">' + globalize.translate('sharedcomponents#HeaderMyMedia') + '</h2>';

            if (!layoutManager.tv) {
                html += '<button type="button" is="paper-icon-button-light" class="sectionTitleIconButton btnHomeScreenSettings"><i class="md-icon">&#xE8B8;</i></button>';
            }

            html += '</div>';

            var scrollX = enableScrollX();

            if (enableScrollX()) {
                html += '<div is="emby-scroller" class="padded-top-focusscale padded-bottom-focusscale" data-mousewheel="false" data-centerfocus="true"><div is="emby-itemscontainer" class="scrollSlider focuscontainer-x padded-left padded-right">';
            } else {
                html += '<div is="emby-itemscontainer" class="itemsContainer padded-left padded-right vertical-wrap focuscontainer-x">';
            }

            html += cardBuilder.getCardsHtml({
                items: userViews,
                shape: scrollX ? 'overflowSmallBackdrop' : shape,
                showTitle: true,
                centerText: true,
                overlayText: false,
                lazy: true,
                transition: false,
                allowBottomPadding: !scrollX
            });

            if (enableScrollX()) {
                html += '</div>';
            }
            html += '</div>';
        }

        html += '</div>';

        return getAppInfo(apiClient).then(function (infoHtml) {

            elem.innerHTML = html + infoHtml;
            bindHomeScreenSettingsIcon(elem, apiClient, user.Id, userSettings);

            if (infoHtml) {
                bindAppInfoEvents(elem);
            }

            imageLoader.lazyChildren(elem);
        });
    }

    function loadResumeVideo(elem, apiClient, userId) {

        var screenWidth = dom.getWindowSize().innerWidth;

        var limit;

        if (enableScrollX()) {

            limit = 12;

        } else {

            limit = screenWidth >= 1920 ? 8 : (screenWidth >= 1600 ? 8 : (screenWidth >= 1200 ? 9 : 6));
            limit = Math.min(limit, 5);
        }

        var options = {

            SortBy: "DatePlayed",
            SortOrder: "Descending",
            Filters: "IsResumable",
            Limit: limit,
            Recursive: true,
            Fields: "PrimaryImageAspectRatio,BasicSyncInfo",
            CollapseBoxSetItems: false,
            ExcludeLocationTypes: "Virtual",
            ImageTypeLimit: 1,
            EnableImageTypes: "Primary,Backdrop,Thumb",
            EnableTotalRecordCount: false,
            MediaTypes: 'Video'
        };

        return apiClient.getItems(userId, options).then(function (result) {

            var html = '';

            if (result.Items.length) {
                html += '<h2 class="sectionTitle sectionTitle-cards padded-left">' + globalize.translate('sharedcomponents#HeaderContinueWatching') + '</h2>';

                if (enableScrollX()) {
                    html += '<div is="emby-scroller" class="padded-top-focusscale padded-bottom-focusscale" data-mousewheel="false" data-centerfocus="true"><div is="emby-itemscontainer" class="scrollSlider focuscontainer-x padded-left padded-right">';
                } else {
                    html += '<div is="emby-itemscontainer" class="itemsContainer padded-left padded-right vertical-wrap focuscontainer-x">';
                }

                var supportsImageAnalysis = appHost.supports('imageanalysis');
                supportsImageAnalysis = false;
                var cardLayout = supportsImageAnalysis;

                html += cardBuilder.getCardsHtml({
                    items: result.Items,
                    preferThumb: true,
                    shape: getThumbShape(),
                    overlayText: false,
                    showTitle: true,
                    showParentTitle: true,
                    lazy: true,
                    showDetailsMenu: true,
                    overlayPlayButton: true,
                    context: 'home',
                    centerText: !cardLayout,
                    allowBottomPadding: false,
                    cardLayout: cardLayout,
                    showYear: true,
                    lines: 2,
                    vibrant: cardLayout && supportsImageAnalysis
                });

                if (enableScrollX()) {
                    html += '</div>';
                }
                html += '</div>';
            }

            elem.innerHTML = html;

            imageLoader.lazyChildren(elem);
        });
    }

    function loadResumeAudio(elem, apiClient, userId) {

        var screenWidth = dom.getWindowSize().innerWidth;

        var limit;

        if (enableScrollX()) {

            limit = 12;

        } else {

            limit = screenWidth >= 1920 ? 8 : (screenWidth >= 1600 ? 8 : (screenWidth >= 1200 ? 9 : 6));
            limit = Math.min(limit, 5);
        }

        var options = {

            SortBy: "DatePlayed",
            SortOrder: "Descending",
            Filters: "IsResumable",
            Limit: limit,
            Recursive: true,
            Fields: "PrimaryImageAspectRatio,BasicSyncInfo",
            CollapseBoxSetItems: false,
            ExcludeLocationTypes: "Virtual",
            ImageTypeLimit: 1,
            EnableImageTypes: "Primary,Backdrop,Thumb",
            EnableTotalRecordCount: false,
            MediaTypes: 'Audio'
        };

        return apiClient.getItems(userId, options).then(function (result) {

            var html = '';

            if (result.Items.length) {
                html += '<h2 class="sectionTitle sectionTitle-cards padded-left">' + globalize.translate('sharedcomponents#HeaderContinueListening') + '</h2>';

                if (enableScrollX()) {
                    html += '<div is="emby-scroller" class="padded-top-focusscale padded-bottom-focusscale" data-mousewheel="false" data-centerfocus="true"><div is="emby-itemscontainer" class="scrollSlider focuscontainer-x padded-left padded-right">';
                } else {
                    html += '<div is="emby-itemscontainer" class="itemsContainer padded-left padded-right vertical-wrap focuscontainer-x">';
                }

                var cardLayout = false;

                html += cardBuilder.getCardsHtml({
                    items: result.Items,
                    preferThumb: true,
                    shape: getThumbShape(),
                    overlayText: false,
                    showTitle: true,
                    showParentTitle: true,
                    lazy: true,
                    showDetailsMenu: true,
                    overlayPlayButton: true,
                    context: 'home',
                    centerText: !cardLayout,
                    allowBottomPadding: false,
                    cardLayout: cardLayout,
                    showYear: true,
                    lines: 2
                });

                if (enableScrollX()) {
                    html += '</div>';
                }

                html += '</div>';
            }

            elem.innerHTML = html;

            imageLoader.lazyChildren(elem);
        });
    }

    function loadActiveRecordings(elem, apiClient, userId) {

        apiClient.getLiveTvRecordings({

            UserId: userId,
            IsInProgress: true,
            Fields: 'CanDelete,PrimaryImageAspectRatio,BasicSyncInfo',
            EnableTotalRecordCount: false,
            EnableImageTypes: "Primary,Thumb,Backdrop"

        }).then(function (result) {

            var html = '';

            if (result.Items.length) {

                html += '<h2 class="sectionTitle sectionTitle-cards padded-left">' + globalize.translate('sharedcomponents#HeaderActiveRecordings') + '</h2>';

                if (enableScrollX()) {
                    html += '<div is="emby-scroller" class="padded-top-focusscale padded-bottom-focusscale" data-mousewheel="false" data-centerfocus="true"><div is="emby-itemscontainer" class="scrollSlider focuscontainer-x padded-left padded-right">';
                } else {
                    html += '<div is="emby-itemscontainer" class="itemsContainer padded-left padded-right vertical-wrap focuscontainer-x">';
                }

                var supportsImageAnalysis = appHost.supports('imageanalysis');
                supportsImageAnalysis = false;
                var cardLayout = false;

                html += cardBuilder.getCardsHtml({
                    items: result.Items,
                    lazy: true,
                    allowBottomPadding: !enableScrollX(),
                    shape: enableScrollX() ? 'autooverflow' : 'auto',
                    defaultShape: getThumbShape(),
                    showTitle: false,
                    showParentTitleOrTitle: true,
                    showAirTime: true,
                    showAirEndTime: true,
                    showChannelName: true,
                    cardLayout: cardLayout,
                    preferThumb: 'auto',
                    coverImage: true,
                    overlayText: false,
                    centerText: !cardLayout,
                    overlayMoreButton: true
                    //action: 'play'

                });

                if (enableScrollX()) {
                    html += '</div>';
                }

                html += '</div>';
            }

            elem.innerHTML = html;

            imageLoader.lazyChildren(elem);
        });
    }

    function loadOnNow(elem, apiClient, user) {

        if (!user.Policy.EnableLiveTvAccess) {
            return Promise.resolve('');
        }

        elem.classList.remove('verticalSection');

        var userId = user.Id;
        return apiClient.getLiveTvRecommendedPrograms({

            userId: apiClient.getCurrentUserId(),
            IsAiring: true,
            limit: enableScrollX() ? 18 : 8,
            ImageTypeLimit: 1,
            EnableImageTypes: "Primary,Thumb,Backdrop",
            EnableTotalRecordCount: false,
            Fields: "ChannelInfo,PrimaryImageAspectRatio"

        }).then(function (result) {

            var html = '';

            if (result.Items.length) {

                html += '<div class="verticalSection">';
                html += '<div class="sectionTitleContainer padded-left">';

                html += '<h2 class="sectionTitle">' + globalize.translate('sharedcomponents#LiveTV') + '</h2>';

                html += '</div>';

                if (enableScrollX()) {
                    html += '<div is="emby-scroller" class="padded-top-focusscale padded-bottom-focusscale" data-mousewheel="false" data-centerfocus="true">';
                    html += '<div class="scrollSlider padded-left padded-right padded-top focuscontainer-x">';
                }
                else {
                    html += '<div class="padded-left padded-right padded-top focuscontainer-x">';
                }

                html += '<a style="margin:0;padding:.9em 1em;" is="emby-linkbutton" href="' + embyRouter.getRouteUrl('livetv', {

                    serverId: apiClient.serverId()

                }) + '" class="raised"><i class="md-icon">&#xE639;</i><span>' + globalize.translate('sharedcomponents#Programs') + '</span></a>';

                html += '<a style="margin:0 0 0 1em;padding:.9em 1em;" is="emby-linkbutton" href="' + embyRouter.getRouteUrl('livetv', {

                    serverId: apiClient.serverId(),
                    section: 'guide'

                }) + '" class="raised"><i class="md-icon">&#xE1B2;</i><span>' + globalize.translate('sharedcomponents#Guide') + '</span></a>';

                html += '<a style="margin:0 0 0 1em;padding:.9em 1em;" is="emby-linkbutton" href="' + embyRouter.getRouteUrl('recordedtv', {

                    serverId: apiClient.serverId()

                }) + '" class="raised"><i class="md-icon">&#xE333;</i><span>' + globalize.translate('sharedcomponents#Recordings') + '</span></a>';

                html += '<a style="margin:0 0 0 1em;padding:.9em 1em;" is="emby-linkbutton" href="' + embyRouter.getRouteUrl('livetv', {

                    serverId: apiClient.serverId(),
                    section: 'dvrschedule'

                }) + '" class="raised"><i class="md-icon">&#xE916;</i><span>' + globalize.translate('sharedcomponents#Schedule') + '</span></a>';

                html += '</div>';

                if (enableScrollX()) {
                    html += '</div>';
                }

                html += '</div>';
                html += '</div>';

                html += '<div class="verticalSection">';
                html += '<div class="sectionTitleContainer padded-left">';

                if (!layoutManager.tv) {

                    html += '<a is="emby-linkbutton" href="' + embyRouter.getRouteUrl('livetv', {

                        serverId: apiClient.serverId(),
                        section: 'onnow'

                    }) + '" class="more button-flat button-flat-mini sectionTitleTextButton">';
                    html += '<h2 class="sectionTitle sectionTitle-cards">';
                    html += globalize.translate('sharedcomponents#HeaderOnNow');
                    html += '</h2>';
                    html += '<i class="md-icon">&#xE5CC;</i>';
                    html += '</a>';

                } else {
                    html += '<h2 class="sectionTitle sectionTitle-cards">' + globalize.translate('sharedcomponents#HeaderOnNow') + '</h2>';
                }
                html += '</div>';

                if (enableScrollX()) {
                    html += '<div is="emby-scroller" class="padded-top-focusscale padded-bottom-focusscale" data-mousewheel="false" data-centerfocus="true"><div is="emby-itemscontainer" class="scrollSlider focuscontainer-x padded-left padded-right">';
                } else {
                    html += '<div is="emby-itemscontainer" class="itemsContainer padded-left padded-right vertical-wrap focuscontainer-x">';
                }

                html += cardBuilder.getCardsHtml({
                    items: result.Items,
                    preferThumb: 'auto',
                    inheritThumb: false,
                    shape: (enableScrollX() ? 'autooverflow' : 'auto'),
                    showParentTitleOrTitle: true,
                    showTitle: true,
                    centerText: true,
                    coverImage: true,
                    overlayText: false,
                    overlayPlayButton: true,
                    allowBottomPadding: !enableScrollX(),
                    showAirTime: true,
                    showChannelName: false,
                    showAirDateTime: false,
                    showAirEndTime: true,
                    defaultShape: getThumbShape()
                });

                if (enableScrollX()) {
                    html += '</div>';
                }

                html += '</div>';
                html += '</div>';
            }

            elem.innerHTML = html;

            imageLoader.lazyChildren(elem);
        });
    }

    function loadNextUp(elem, apiClient, userId) {

        var query = {

            Limit: enableScrollX() ? 24 : 15,
            Fields: "PrimaryImageAspectRatio,SeriesInfo,DateCreated,BasicSyncInfo",
            UserId: userId,
            ImageTypeLimit: 1,
            EnableImageTypes: "Primary,Backdrop,Banner,Thumb",
            EnableTotalRecordCount: false
        };

        apiClient.getNextUpEpisodes(query).then(function (result) {

            var html = '';

            if (result.Items.length) {

                html += '<div class="sectionTitleContainer padded-left">';
                if (!layoutManager.tv) {

                    html += '<a is="emby-linkbutton" href="' + embyRouter.getRouteUrl('nextup', {

                        serverId: apiClient.serverId()

                    }) + '" class="button-flat button-flat-mini sectionTitleTextButton">';
                    html += '<h2 class="sectionTitle sectionTitle-cards">';
                    html += globalize.translate('sharedcomponents#HeaderNextUp');
                    html += '</h2>';
                    html += '<i class="md-icon">&#xE5CC;</i>';
                    html += '</a>';

                } else {
                    html += '<h2 class="sectionTitle sectionTitle-cards">' + globalize.translate('sharedcomponents#HeaderNextUp') + '</h2>';
                }
                html += '</div>';

                if (enableScrollX()) {
                    html += '<div is="emby-scroller" class="padded-top-focusscale padded-bottom-focusscale" data-mousewheel="false" data-centerfocus="true"><div is="emby-itemscontainer" class="scrollSlider focuscontainer-x padded-left padded-right">';
                } else {
                    html += '<div is="emby-itemscontainer" class="itemsContainer padded-left padded-right vertical-wrap focuscontainer-x">';
                }

                var supportsImageAnalysis = appHost.supports('imageanalysis');
                supportsImageAnalysis = false;

                html += cardBuilder.getCardsHtml({
                    items: result.Items,
                    preferThumb: true,
                    shape: getThumbShape(),
                    overlayText: false,
                    showTitle: true,
                    showParentTitle: true,
                    lazy: true,
                    overlayPlayButton: true,
                    context: 'home',
                    centerText: !supportsImageAnalysis,
                    allowBottomPadding: !enableScrollX(),
                    cardLayout: supportsImageAnalysis,
                    vibrant: supportsImageAnalysis
                });

                if (enableScrollX()) {
                    html += '</div>';
                }

                html += '</div>';
            }

            elem.innerHTML = html;

            imageLoader.lazyChildren(elem);
        });
    }

    function loadLatestChannelItems(elem, apiClient, userId, options) {

        options = Object.assign(options || {}, {

            UserId: userId,
            SupportsLatestItems: true
        });

        return apiClient.getJSON(apiClient.getUrl("Channels", options)).then(function (result) {

            var channels = result.Items;

            var channelsHtml = channels.map(function (c) {

                return '<div id="channel' + c.Id + '"></div>';

            }).join('');

            elem.innerHTML = channelsHtml;

            for (var i = 0, length = channels.length; i < length; i++) {

                var channel = channels[i];

                loadLatestChannelItemsFromChannel(elem, apiClient, channel, i);
            }

        });
    }

    function loadLatestChannelItemsFromChannel(page, apiClient, channel, index) {

        var screenWidth = dom.getWindowSize().innerWidth;

        var options = {

            Limit: enableScrollX() ? 12 : (screenWidth >= 1600 ? 10 : (screenWidth >= 1440 ? 5 : (screenWidth >= 800 ? 6 : 6))),
            Fields: "PrimaryImageAspectRatio,BasicSyncInfo",
            Filters: "IsUnplayed",
            UserId: apiClient.getCurrentUserId(),
            ChannelIds: channel.Id
        };

        apiClient.getJSON(apiClient.getUrl("Channels/Items/Latest", options)).then(function (result) {

            var html = '';

            if (result.Items.length) {

                html += '<div class="verticalSection">';

                html += '<div class="sectionTitleContainer">';
                var text = globalize.translate('sharedcomponents#HeaderLatestFrom').replace('{0}', channel.Name);
                html += '<h2 class="sectionTitle sectionTitle-cards padded-left">' + text + '</h2>';
                if (!layoutManager.tv) {
                    html += '<a is="emby-linkbutton" href="' + embyRouter.getRouteUrl(channel) + '" class="raised raised-mini sectionTitleButton btnMore">' + globalize.translate('sharedcomponents#More') + '</a>';
                }
                html += '</div>';

                if (enableScrollX()) {
                    html += '<div is="emby-scroller" class="padded-top-focusscale padded-bottom-focusscale" data-mousewheel="false" data-centerfocus="true"><div is="emby-itemscontainer" class="scrollSlider focuscontainer-x padded-left padded-right">';
                } else {
                    html += '<div is="emby-itemscontainer" class="itemsContainer padded-left padded-right vertical-wrap focuscontainer-x">';
                }

                html += cardBuilder.getCardsHtml({
                    items: result.Items,
                    shape: enableScrollX() ? 'autooverflow' : 'auto',
                    showTitle: true,
                    centerText: true,
                    lazy: true,
                    showDetailsMenu: true,
                    overlayPlayButton: true,
                    allowBottomPadding: !enableScrollX()
                });

                if (enableScrollX()) {
                    html += '</div>';
                }
                html += '</div>';
                html += '</div>';
            }

            var elem = page.querySelector('#channel' + channel.Id + '');
            elem.innerHTML = html;
            imageLoader.lazyChildren(elem);
        });
    }

    function loadLatestLiveTvRecordings(elem, apiClient, userId) {

        return apiClient.getLiveTvRecordings({

            userId: userId,
            Limit: enableScrollX() ? 12 : 5,
            Fields: "PrimaryImageAspectRatio,BasicSyncInfo",
            IsInProgress: false,
            EnableTotalRecordCount: false,
            IsLibraryItem: false

        }).then(function (result) {

            var html = '';

            if (result.Items.length) {

                html += '<div class="sectionTitleContainer">';
                html += '<h2 class="sectionTitle sectionTitle-cards padded-left">' + globalize.translate('sharedcomponents#HeaderLatestRecordings') + '</h2>';
                if (!layoutManager.tv) {
                    //html += '<a href="livetv.html?tab=3" class="clearLink" style="margin-left:2em;"><button is="emby-button" type="button" class="raised more mini"><span>' + globalize.translate('sharedcomponents#More') + '</span></button></a>';
                    //html += '<button data-href="" type="button" is="emby-button" class="raised raised-mini sectionTitleButton btnMore">';
                    //html += '<span>' + globalize.translate('sharedcomponents#More') + '</span>';
                    //html += '</button>';
                }
                html += '</div>';
            }

            if (enableScrollX()) {
                html += '<div is="emby-scroller" class="padded-top-focusscale padded-bottom-focusscale" data-mousewheel="false" data-centerfocus="true"><div is="emby-itemscontainer" class="scrollSlider focuscontainer-x padded-left padded-right">';
            } else {
                html += '<div is="emby-itemscontainer" class="itemsContainer padded-left padded-right vertical-wrap focuscontainer-x">';
            }

            html += cardBuilder.getCardsHtml({
                items: result.Items,
                shape: enableScrollX() ? 'autooverflow' : 'auto',
                showTitle: true,
                showParentTitle: true,
                coverImage: true,
                lazy: true,
                showDetailsMenu: true,
                centerText: true,
                overlayText: false,
                overlayPlayButton: true,
                allowBottomPadding: !enableScrollX(),
                preferThumb: true,
                cardLayout: false

            });

            if (enableScrollX()) {
                html += '</div>';
            }

            html += '</div>';

            elem.innerHTML = html;
            imageLoader.lazyChildren(elem);
        });
    }

    return {
        loadLatestChannelMedia: loadLatestChannelMedia,
        loadLibraryTiles: loadLibraryTiles,
        loadResumeVideo: loadResumeVideo,
        loadResumeAudio: loadResumeAudio,
        loadActiveRecordings: loadActiveRecordings,
        loadNextUp: loadNextUp,
        loadLatestChannelItems: loadLatestChannelItems,
        loadLatestLiveTvRecordings: loadLatestLiveTvRecordings,
        getDefaultSection: getDefaultSection,
        loadSections: loadSections
    };
});