define(['browser', 'connectionManager', 'cardBuilder', 'registrationServices', 'appSettings', 'dom', 'apphost', 'layoutManager', 'imageLoader', 'globalize', 'itemShortcuts', 'itemHelper', 'appRouter', 'emby-button', 'paper-icon-button-light', 'emby-itemscontainer', 'emby-scroller', 'emby-linkbutton'], function (browser, connectionManager, cardBuilder, registrationServices, appSettings, dom, appHost, layoutManager, imageLoader, globalize, itemShortcuts, itemHelper, appRouter) {
    'use strict';

    function getDefaultSection(index) {

        switch (index) {

            case 0:
                return 'smalllibrarytiles';
            case 1:
                return 'resume';
            case 2:
                return 'resumeaudio';
            case 3:
                return 'livetv';
            case 4:
                return 'nextup';
            case 5:
                return 'latestmedia';
            case 6:
                return 'none';
            default:
                return '';
        }
    }

    function getAllSectionsToShow(userSettings, sectionCount) {

        var sections = [];

        for (var i = 0, length = sectionCount; i < length; i++) {

            var section = userSettings.get('homesection' + i) || getDefaultSection(i);

            if (section === 'folders') {
                section = getDefaultSection(0);
            }

            sections.push(section);
        }

        return sections;
    }

    function loadSections(elem, apiClient, user, userSettings) {

        var i, length;
        var sectionCount = 7;

        var html = '';
        for (i = 0, length = sectionCount; i < length; i++) {

            html += '<div class="verticalSection section' + i + '"></div>';

            if (i === 0) {
                html += '<div class="verticalSection section-downloads hide"></div>';
                html += '<div class="verticalSection section-appinfo hide"></div>';
            }
        }

        elem.innerHTML = html;
        elem.classList.add('homeSectionsContainer');

        var promises = [];
        var sections = getAllSectionsToShow(userSettings, sectionCount);

        for (i = 0, length = sections.length; i < length; i++) {

            promises.push(loadSection(elem, apiClient, user, userSettings, sections, i));

            if (i === 0) {
                promises.push(loadDownloadsSection(elem.querySelector('.section-downloads'), apiClient, user));
                promises.push(loadAppInfoSection(elem.querySelector('.section-appinfo'), apiClient));
            }
        }

        return Promise.all(promises).then(function () {

            return resume(elem, {
                refresh: true,
                returnPromise: false
            });
        });
    }

    function destroySections(elem) {

        var elems = elem.querySelectorAll('.itemsContainer');
        var i, length;

        for (i = 0, length = elems.length; i < length; i++) {

            elems[i].fetchData = null;
            elems[i].parentContainer = null;
            elems[i].getItemsHtml = null;
        }

        elem.innerHTML = '';
    }

    function pause(elem) {

        var elems = elem.querySelectorAll('.itemsContainer');
        var i, length;
        for (i = 0, length = elems.length; i < length; i++) {

            elems[i].pause();
        }
    }

    function resume(elem, options) {

        var elems = elem.querySelectorAll('.itemsContainer');
        var i, length;
        var promises = [];

        for (i = 0, length = elems.length; i < length; i++) {
            promises.push(elems[i].resume(options));
        }

        var promise = Promise.all(promises);

        if (!options || options.returnPromise !== false) {
            return promise;
        }

        return promises[0];
    }

    function loadSection(page, apiClient, user, userSettings, allSections, index) {

        var section = allSections[index];
        var userId = apiClient.getCurrentUserId();

        var elem = page.querySelector('.section' + index);

        if (section === 'latestmedia') {
            return loadRecentlyAdded(elem, apiClient, user);
        }
        else if (section === 'librarytiles' || section === 'smalllibrarytiles' || section === 'smalllibrarytiles-automobile' || section === 'librarytiles-automobile') {
            return loadLibraryTiles(elem, apiClient, userSettings, allSections);
        }
        else if (section === 'librarybuttons') {
            return loadlibraryButtons(elem, apiClient, userSettings, allSections);
        }
        else if (section === 'resume') {
            loadResumeVideo(elem, apiClient, userId);
        }
        else if (section === 'resumeaudio') {
            loadResumeAudio(elem, apiClient, userId);
        }
        else if (section === 'activerecordings') {
            loadLatestLiveTvRecordings(elem, true, apiClient, userId);
        }
        else if (section === 'nextup') {
            loadNextUp(elem, apiClient, userId);
        }
        else if (section === 'onnow' || section === 'livetv') {
            return loadOnNow(elem, apiClient, user);
        }
        else {

            elem.innerHTML = '';

            return Promise.resolve();
        }
        return Promise.resolve();
    }

    function getUserViews(apiClient, userId) {

        return apiClient.getUserViews({}, userId || apiClient.getCurrentUserId()).then(function (result) {

            return result.Items;
        });
    }

    function getSquareShape() {
        return 'square';
    }

    function getThumbShape() {
        return 'backdrop';
    }

    function getPortraitShape() {
        return 'autooverflow';
    }

    function getLibraryButtonItemsHtml(items) {

        var html = '';

        for (var i = 0, length = items.length; i < length; i++) {

            var item = items[i];

            var icon = cardBuilder.getDefaultIcon(item);

            html += '<div class="smallBackdropCard flex"><a is="emby-linkbutton" href="' + appRouter.getRouteUrl(item) + '" class="raised block flex-grow" style="margin:.5em;text-align:left;"><i class="md-icon">' + icon + '</i><span style="margin-left:.5em;">' + item.Name + '</span></a></div>';
        }

        return html;
    }

    function getLibraryButtonsHtml(items) {

        var html = "";

        html += '<div class="verticalSection verticalSection-extrabottompadding">';
        html += '<div class="sectionTitleContainer sectionTitleContainer-cards">';
        html += '<h2 class="sectionTitle sectionTitle-cards padded-left">' + globalize.translate('HeaderMyMedia') + '</h2>';

        if (!layoutManager.tv) {
            html += '<button type="button" is="paper-icon-button-light" class="sectionTitleIconButton btnHomeScreenSettings noautofocus"><i class="md-icon button-icon">&#xE5D3;</i></button>';
        }

        html += '</div>';

        html += '<div is="emby-itemscontainer" class="itemsContainer padded-left padded-right vertical-wrap focuscontainer-x" data-multiselect="false">';

        // "My Library" backgrounds
        for (var i = 0, length = items.length; i < length; i++) {

            var item = items[i];

            var icon = cardBuilder.getDefaultIcon(item);

            html += '<div class="smallBackdropCard flex"><a is="emby-linkbutton" href="' + appRouter.getRouteUrl(item) + '" class="raised block flex-grow" style="margin:.5em;text-align:left;"><i class="md-icon">' + icon + '</i><span style="margin-left:.5em;">' + item.Name + '</span></a></div>';
        }

        html += '</div>';
        html += '</div>';

        return html;
    }

    function getUserViewsFetchFn(serverId) {

        return function () {

            var apiClient = connectionManager.getApiClient(serverId);

            return getUserViews(apiClient, apiClient.getCurrentUserId());
        };
    }

    function loadlibraryButtons(elem, apiClient, userSettings) {

        var html = '';
        html += '<div class="sectionTitleContainer sectionTitleContainer-cards">';
        html += '<h2 class="sectionTitle sectionTitle-cards padded-left">' + globalize.translate('HeaderMyMedia') + '</h2>';

        if (!layoutManager.tv) {
            html += '<button type="button" is="paper-icon-button-light" class="sectionTitleIconButton btnHomeScreenSettings noautofocus"><i class="md-icon button-icon">&#xE5D3;</i></button>';
        }

        html += '</div>';

        html += '<div is="emby-itemscontainer" class="itemsContainer padded-left padded-right vertical-wrap focuscontainer-x" data-multiselect="false">';

        html += '</div>';

        elem.classList.add('hide');
        elem.innerHTML = html;

        bindHomeScreenSettingsIcon(elem, apiClient.getCurrentUserId(), apiClient.serverId());

        var itemsContainer = elem.querySelector('.itemsContainer');
        itemsContainer.fetchData = getUserViewsFetchFn(apiClient.serverId());
        itemsContainer.getItemsHtml = getLibraryButtonItemsHtml;
        itemsContainer.parentContainer = elem;
    }

    function bindAppInfoEvents(elem) {

        var itemsContainer = elem.querySelector('.itemsContainer');

        if (!itemsContainer) {
            return;
        }

        itemsContainer.addEventListener('click', function (e) {

            if (dom.parentWithClass(e.target, 'card')) {
                registrationServices.showPremiereInfo();
            }
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

        if (browser.orsay) {
            return Promise.resolve('');
        }

        var frequency = 172800000;

        var cacheKey = 'lastappinfopresent5';
        var lastDatePresented = parseInt(appSettings.get(cacheKey) || '0');

        // Don't show the first time, right after installation
        if (!lastDatePresented) {
            appSettings.set(cacheKey, Date.now());
            return Promise.resolve('');
        }

        if ((Date.now() - lastDatePresented) < frequency) {
            return Promise.resolve('');
        }

        return registrationServices.validateFeature('dvr', {

            showDialog: false,
            viewOnly: true

        }).then(function () {

            appSettings.set(cacheKey, Date.now());
            return '';

        }, function () {

            appSettings.set(cacheKey, Date.now());

            var infos = [getPremiereInfo];

            if (appHost.supports('otherapppromotions')) {
                infos.push(getTheaterInfo);
            }

            return infos[getRandomInt(0, infos.length - 1)]();
        });
    }

    function getCard(img, shape) {

        shape = shape || 'backdropCard';
        var html = '<div class="card scalableCard ' + shape + ' ' + shape + '-scalable"><div class="cardBox"><div class="cardScalable"><div class="cardPadder cardPadder-backdrop"></div>';

        html += '<div class="cardContent">';

        html += '<div class="cardImage" loading="lazy" style="background-image:url(' + img + ');"></div>';

        html += '</div>';

        html += '</div></div></div>';

        return html;
    }

    function getTheaterInfo() {

        var html = '';
        html += '<div class="sectionTitleContainer sectionTitleContainer-cards">';
        html += '<h2 class="sectionTitle sectionTitle-cards padded-left">Discover Emby Theater</h2>';
        html += '</div>';

        var nameText = 'Emby Theater';
        html += '<div class="padded-left padded-right">';
        html += '<p class="sectionTitle-cards">A beautiful app for your TV and large screen tablet. ' + nameText + ' runs on Windows, Xbox One, Raspberry Pi, Samsung Smart TVs, Sony PS4, Web Browsers, and more.</p>';
        html += '<div class="itemsContainer vertical-wrap" is="emby-itemscontainer">';
        html += getCard('https://raw.githubusercontent.com/MediaBrowser/Emby.Resources/master/apps/theater1.png');
        html += getCard('https://raw.githubusercontent.com/MediaBrowser/Emby.Resources/master/apps/theater2.png');
        html += getCard('https://raw.githubusercontent.com/MediaBrowser/Emby.Resources/master/apps/theater3.png');
        html += '</div>';
        html += '</div>';
        return html;
    }

    function getPremiereInfo() {

        var html = '';
        html += '<div class="sectionTitleContainer sectionTitleContainer-cards">';
        html += '<h2 class="sectionTitle sectionTitle-cards padded-left">Discover Emby Premiere</h2>';
        html += '</div>';

        html += '<div class="padded-left padded-right">';
        html += '<p class="sectionTitle-cards">Enjoy Emby DVR, get free access to Emby apps, and more.</p>';
        html += '<div class="itemsContainer vertical-wrap" is="emby-itemscontainer">';
        html += getCard('https://raw.githubusercontent.com/MediaBrowser/Emby.Resources/master/apps/theater1.png');
        html += getCard('https://raw.githubusercontent.com/MediaBrowser/Emby.Resources/master/apps/theater2.png');
        html += getCard('https://raw.githubusercontent.com/MediaBrowser/Emby.Resources/master/apps/theater3.png');
        html += '</div>';
        html += '</div>';
        return html;
    }

    function getFetchLatestItemsFn(serverId, parentId, collectionType) {

        return function () {

            var apiClient = connectionManager.getApiClient(serverId);

            var limit = 16;

            if (collectionType === 'music') {
                limit = 30;
            }

            var options = {

                Limit: limit,
                Fields: "PrimaryImageAspectRatio,BasicSyncInfo,ProductionYear,Status,EndDate",
                ImageTypeLimit: 1,
                EnableImageTypes: "Primary,Backdrop,Thumb",
                ParentId: parentId
            };

            return apiClient.getLatestItems(options);
        };
    }

    function getLatestItemsHtmlFn(itemType, viewType, enableTvPosters) {

        return function (items) {

            var cardLayout = false;

            return cardBuilder.getCardsHtml({
                items: items,
                shape: 'autooverflow',
                preferThumb: 'auto',
                showUnplayedIndicator: false,
                showChildCountIndicator: true,
                context: 'home',
                overlayText: false,
                centerText: true,
                overlayPlayButton: viewType !== 'photos',
                showTitle: viewType !== 'photos',
                showYear: viewType === 'movies' || viewType === 'tvshows' || !viewType,
                showParentTitle: viewType === 'music' || viewType === 'tvshows' || !viewType,
                lines: 2
            });
        };
    }

    function renderLatestSection(elem, apiClient, parent) {

        var html = '';
        html += '<div class="sectionTitleContainer sectionTitleContainer-cards padded-left">';
        if (!layoutManager.tv) {

            html += '<a is="emby-linkbutton" href="' + appRouter.getRouteUrl(parent, {

                section: 'latest'

            }) + '" class="more button-flat button-flat-mini sectionTitleTextButton">';
            html += '<h2 class="sectionTitle sectionTitle-cards">';
            html += globalize.translate('LatestFromLibrary', parent.Name);
            html += '<i class="md-icon">&#xE5CC;</i></h2>';
            html += '</a>';

        } else {
            html += '<h2 class="sectionTitle sectionTitle-cards">' + globalize.translate('LatestFromLibrary', parent.Name) + '</h2>';
        }
        html += '</div>';

        var monitor = parent.CollectionType === 'music' || parent.CollectionType === 'audiobooks' ?
            'markplayed' :
            'videoplayback,markplayed';

        html += '<div data-parentid="' + parent.Id + '" is="emby-scroller" data-mousewheel="false" data-centerfocus="true" class="padded-top-focusscale padded-bottom-focusscale"><div is="emby-itemscontainer" class="itemsContainer scrollSlider focuscontainer-x padded-left padded-right" data-monitor="' + monitor + '">';

        html += '</div>';
        html += '</div>';

        elem.innerHTML = html;

        var itemsContainer = elem.querySelector('.itemsContainer');
        itemsContainer.fetchData = getFetchLatestItemsFn(apiClient.serverId(), parent.Id, parent.CollectionType);
        itemsContainer.getItemsHtml = getLatestItemsHtmlFn(parent.Type, parent.CollectionType);
        itemsContainer.parentContainer = elem;

    }

    function loadRecentlyAdded(elem, apiClient, user) {

        return getUserViews(apiClient, apiClient.getCurrentUserId()).then(function (userViews) {

            elem.classList.remove('verticalSection');

            var excludeViewTypes = ['playlists', 'livetv', 'boxsets', 'channels'];

            for (var i = 0, length = userViews.length; i < length; i++) {

                var item = userViews[i];

                if (user.Configuration.LatestItemsExcludes.indexOf(item.Id) !== -1) {
                    continue;
                }

                if (excludeViewTypes.indexOf(item.CollectionType || []) !== -1) {
                    continue;
                }

                var frag = document.createElement('div');
                frag.classList.add('verticalSection');
                frag.classList.add('hide');
                elem.appendChild(frag);

                renderLatestSection(frag, apiClient, item);
            }
        });
    }

    function bindHomeScreenSettingsIcon(elem, userId, serverId) {

        var btnHomeScreenSettings = elem.querySelector('.btnHomeScreenSettings');
        if (!btnHomeScreenSettings) {
            return;
        }

        btnHomeScreenSettings.addEventListener('click', function () {
            appRouter.show('settings/homescreen.html?userId=' + userId + '&serverId=' + serverId);
        });
    }

    function getDownloadsFetchFn(serverId) {

        return function () {

            var apiClient = connectionManager.getApiClient(serverId);

            return apiClient.getLatestOfflineItems ? apiClient.getLatestOfflineItems({

                Limit: 20,
                Filters: 'IsNotFolder'

            }) : Promise.resolve([]);
        };
    }

    function getDownloadItemsHtml(items) {

        return cardBuilder.getCardsHtml({
            items: items,
            preferThumb: 'auto',
            inheritThumb: false,
            shape: 'autooverflow',
            overlayText: false,
            showTitle: true,
            showParentTitle: true,
            lazy: true,
            showDetailsMenu: true,
            overlayPlayButton: true,
            context: 'home',
            centerText: true,
            allowBottomPadding: false,
            showYear: true,
            lines: 2
        });
    }

    function getLibraryTilesHtml(items) {

        return cardBuilder.getCardsHtml({
            items: items,
            shape: 'smallBackdrop',
            showTitle: true,
            centerText: true,
            overlayText: false,
            lazy: true,
            transition: false,
            hoverPlayButton: false
        });
    }

    function loadAppInfoSection(elem, apiClient, userSettings, allSections) {

        elem.classList.add('hide');

        getAppInfo().then(function (html) {

            elem.innerHTML = html;

            bindAppInfoEvents(elem);

            if (html) {
                elem.classList.remove('hide');
            } else {
                elem.classList.add('hide');
            }

        });

        return Promise.resolve();
    }

    function loadDownloadsSection(elem, apiClient, user) {

        elem.classList.add('hide');

        if (!appHost.supports('sync') || !user.Policy.EnableContentDownloading) {
            return Promise.resolve();
        }

        var html = '';
        html += '<div class="sectionTitleContainer sectionTitleContainer-cards padded-left padded-right">';

        html += '<a is="emby-linkbutton" href="' + appRouter.getRouteUrl('downloads') + '" class="more button-flat button-flat-mini sectionTitleTextButton">';
        html += '<h2 class="sectionTitle sectionTitle-cards">';
        html += globalize.translate('Downloads');
        html += '<i class="md-icon">&#xE5CC;</i></h2>';
        html += '</a>';

        if (!layoutManager.tv) {
            html += '<a is="emby-linkbutton" href="' + appRouter.getRouteUrl('managedownloads') + '" class="sectionTitleIconButton"><i class="md-icon">&#xE8B8;</i></a>';
        }

        html += '</div>';

        html += '<div is="emby-scroller" class="padded-top-focusscale padded-bottom-focusscale" data-mousewheel="false" data-centerfocus="true"><div is="emby-itemscontainer" class="itemsContainer scrollSlider focuscontainer-x padded-left padded-right">';
        html += '</div>';
        html += '</div>';

        elem.innerHTML = html;

        var itemsContainer = elem.querySelector('.itemsContainer');
        itemsContainer.fetchData = getDownloadsFetchFn(apiClient.serverId());
        itemsContainer.getItemsHtml = getDownloadItemsHtml;
        itemsContainer.parentContainer = elem;
    }

    function loadLibraryTiles(elem, apiClient, userSettings, allSections) {

        var html = '';
        html += '<div class="sectionTitleContainer sectionTitleContainer-cards">';
        html += '<h2 class="sectionTitle sectionTitle-cards padded-left">' + globalize.translate('HeaderMyMedia') + '</h2>';

        if (!layoutManager.tv) {
            html += '<button type="button" is="paper-icon-button-light" class="sectionTitleIconButton btnHomeScreenSettings noautofocus"><i class="md-icon button-icon">&#xE5D3;</i></button>';
        }

        html += '</div>';

        if (!layoutManager.desktop) {
            html += '<div is="emby-scroller" class="padded-top-focusscale padded-bottom-focusscale" data-mousewheel="false" data-centerfocus="true"><div is="emby-itemscontainer" class="itemsContainer scrollSlider focuscontainer-x padded-left padded-right">';
            html += '</div>';
            html += '</div>';
        } else {
            html += '<div is="emby-itemscontainer" class="itemsContainer padded-left padded-right vertical-wrap focuscontainer-x">';
            html += '</div>';
        }

        elem.classList.add('hide');
        elem.innerHTML = html;

        bindHomeScreenSettingsIcon(elem, apiClient.getCurrentUserId(), apiClient.serverId());

        var itemsContainer = elem.querySelector('.itemsContainer');
        itemsContainer.fetchData = getUserViewsFetchFn(apiClient.serverId());
        itemsContainer.getItemsHtml = getLibraryTilesHtml;
        itemsContainer.parentContainer = elem;
    }

    function getContinueWatchingFetchFn(serverId) {

        return function () {

            var apiClient = connectionManager.getApiClient(serverId);

            var options = {

                Limit: 12,
                Recursive: true,
                Fields: "PrimaryImageAspectRatio,BasicSyncInfo,ProductionYear",
                ImageTypeLimit: 1,
                EnableImageTypes: "Primary,Backdrop,Thumb",
                EnableTotalRecordCount: false,
                MediaTypes: 'Video'
            };

            return apiClient.getResumableItems(apiClient.getCurrentUserId(), options);
        };
    }

    function getContinueWatchingItemsHtml(items) {

        var cardLayout = false;

        return cardBuilder.getCardsHtml({
            items: items,
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
    }

    function loadResumeVideo(elem, apiClient, userId) {

        var html = '';
        html += '<h2 class="sectionTitle sectionTitle-cards padded-left">' + globalize.translate('HeaderContinueWatching') + '</h2>';

        html += '<div is="emby-scroller" data-mousewheel="false" data-centerfocus="true" class="padded-top-focusscale padded-bottom-focusscale"><div is="emby-itemscontainer" class="itemsContainer scrollSlider focuscontainer-x padded-left padded-right" data-monitor="videoplayback,markplayed">';

        html += '</div>';
        html += '</div>';

        elem.classList.add('hide');
        elem.innerHTML = html;

        var itemsContainer = elem.querySelector('.itemsContainer');
        itemsContainer.fetchData = getContinueWatchingFetchFn(apiClient.serverId());
        itemsContainer.getItemsHtml = getContinueWatchingItemsHtml;
        itemsContainer.parentContainer = elem;
    }

    function getContinueListeningFetchFn(serverId) {

        return function () {

            var apiClient = connectionManager.getApiClient(serverId);

            var options = {

                Limit: 12,
                Recursive: true,
                Fields: "PrimaryImageAspectRatio,BasicSyncInfo,ProductionYear",
                ImageTypeLimit: 1,
                EnableImageTypes: "Primary,Backdrop,Thumb",
                EnableTotalRecordCount: false,
                MediaTypes: 'Audio'
            };

            return apiClient.getResumableItems(apiClient.getCurrentUserId(), options);
        };
    }

    function getContinueListeningItemsHtml(items) {

        var cardLayout = false;

        return cardBuilder.getCardsHtml({
            items: items,
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
    }

    function loadResumeAudio(elem, apiClient, userId) {

        var html = '';
        html += '<h2 class="sectionTitle sectionTitle-cards padded-left">' + globalize.translate('HeaderContinueListening') + '</h2>';

        html += '<div is="emby-scroller" data-mousewheel="false" data-centerfocus="true" class="padded-top-focusscale padded-bottom-focusscale"><div is="emby-itemscontainer" class="itemsContainer scrollSlider focuscontainer-x padded-left padded-right" data-monitor="audioplayback,markplayed">';

        html += '</div>';
        html += '</div>';

        elem.classList.add('hide');
        elem.innerHTML = html;

        var itemsContainer = elem.querySelector('.itemsContainer');
        itemsContainer.fetchData = getContinueListeningFetchFn(apiClient.serverId());
        itemsContainer.getItemsHtml = getContinueListeningItemsHtml;
        itemsContainer.parentContainer = elem;
    }

    function bindUnlockClick(elem) {

        var btnUnlock = elem.querySelector('.btnUnlock');
        if (btnUnlock) {
            btnUnlock.addEventListener('click', function (e) {

                registrationServices.validateFeature('livetv', {

                    viewOnly: true

                }).then(function () {

                    dom.parentWithClass(elem, 'homeSectionsContainer').dispatchEvent(new CustomEvent('settingschange', {
                        cancelable: false
                    }));
                });
            });
        }
    }

    function getOnNowFetchFn(serverId) {

        return function () {

            var apiClient = connectionManager.getApiClient(serverId);

            return apiClient.getLiveTvChannels({

                userId: apiClient.getCurrentUserId(),
                IsAiring: true,
                limit: 24,
                ImageTypeLimit: 1,
                EnableImageTypes: "Primary,Thumb,Backdrop",
                EnableTotalRecordCount: false,
                Fields: "ProgramPrimaryImageAspectRatio"
            });
        };
    }

    function getOnNowItemsHtml(items) {

        var cardLayout = false;

        return cardBuilder.getCardsHtml({
            items: items,
            preferThumb: 'auto',
            inheritThumb: false,
            shape: 'autooverflow',
            centerText: true,
            overlayText: false,
            lines: 3,
            showTitle: false,
            showCurrentProgramParentTitle: true,
            showCurrentProgramTitle: true,
            showCurrentProgramTime: true,
            showCurrentProgramImage: true,
            showAirDateTime: false,
            showParentTitle: false,
            overlayPlayButton: true,
            defaultShape: 'portrait'
        });
    }

    function loadOnNow(elem, apiClient, user) {

        if (!user.Policy.EnableLiveTvAccess) {
            return Promise.resolve();
        }

        var promises = [];

        promises.push(registrationServices.validateFeature('livetv',
            {
                viewOnly: true,
                showDialog: false
            }).then(function () {
                return true;
            }, function () {
                return false;
            }));

        var userId = apiClient.getCurrentUserId();

        promises.push(apiClient.getLiveTvChannels({

            userId: apiClient.getCurrentUserId(),
            limit: 1,
            ImageTypeLimit: 1,
            EnableTotalRecordCount: false,
            EnableImages: false,
            EnableUserData: false

        }));

        return Promise.all(promises).then(function (responses) {

            var registered = responses[0];
            var result = responses[1];
            var html = '';

            if (result.Items.length && registered) {

                elem.classList.remove('padded-left');
                elem.classList.remove('padded-right');
                elem.classList.remove('padded-bottom');
                elem.classList.remove('verticalSection');

                html += '<div class="verticalSection">';
                html += '<div class="sectionTitleContainer sectionTitleContainer-cards padded-left">';

                html += '<h2 class="sectionTitle sectionTitle-cards">' + globalize.translate('LiveTV') + '</h2>';

                html += '</div>';

                html += '<div is="emby-scroller" class="padded-top-focusscale padded-bottom-focusscale" data-mousewheel="false" data-centerfocus="true" data-scrollbuttons="false">';
                html += '<div class="scrollSlider padded-left padded-right padded-top padded-bottom focuscontainer-x">';

                html += '<a style="margin-left:.8em;margin-right:0;" is="emby-linkbutton" href="' + appRouter.getRouteUrl('livetv', {

                    serverId: apiClient.serverId(),
                    section: 'programs'

                }) + '" class="raised"><span>' + globalize.translate('Programs') + '</span></a>';

                html += '<a style="margin-left:.5em;margin-right:0;" is="emby-linkbutton" href="' + appRouter.getRouteUrl('livetv', {

                    serverId: apiClient.serverId(),
                    section: 'guide'

                }) + '" class="raised"><span>' + globalize.translate('Guide') + '</span></a>';

                html += '<a style="margin-left:.5em;margin-right:0;" is="emby-linkbutton" href="' + appRouter.getRouteUrl('recordedtv', {

                    serverId: apiClient.serverId()

                }) + '" class="raised"><span>' + globalize.translate('Recordings') + '</span></a>';

                html += '<a style="margin-left:.5em;margin-right:0;" is="emby-linkbutton" href="' + appRouter.getRouteUrl('livetv', {

                    serverId: apiClient.serverId(),
                    section: 'dvrschedule'

                }) + '" class="raised"><span>' + globalize.translate('Schedule') + '</span></a>';

                html += '</div>';

                html += '</div>';

                html += '</div>';
                html += '</div>';

                html += '<div class="verticalSection">';
                html += '<div class="sectionTitleContainer sectionTitleContainer-cards padded-left">';

                if (!layoutManager.tv) {

                    html += '<a is="emby-linkbutton" href="' + appRouter.getRouteUrl('livetv', {

                        serverId: apiClient.serverId(),
                        section: 'onnow'

                    }) + '" class="more button-flat button-flat-mini sectionTitleTextButton">';
                    html += '<h2 class="sectionTitle sectionTitle-cards">';
                    html += globalize.translate('HeaderOnNow');
                    html += '<i class="md-icon">&#xE5CC;</i></h2>';
                    html += '</a>';

                } else {
                    html += '<h2 class="sectionTitle sectionTitle-cards">' + globalize.translate('HeaderOnNow') + '</h2>';
                }
                html += '</div>';

                html += '<div is="emby-scroller" data-mousewheel="false" data-centerfocus="true" class="padded-top-focusscale padded-bottom-focusscale"><div is="emby-itemscontainer" class="itemsContainer scrollSlider focuscontainer-x padded-left padded-right" data-refreshinterval="300000">';

                html += '</div>';

                html += '</div>';
                html += '</div>';

                elem.innerHTML = html;

                var itemsContainer = elem.querySelector('.itemsContainer');
                itemsContainer.parentContainer = elem;
                itemsContainer.fetchData = getOnNowFetchFn(apiClient.serverId());
                itemsContainer.getItemsHtml = getOnNowItemsHtml;

            } else if (result.Items.length && !registered) {

                elem.classList.add('padded-left');
                elem.classList.add('padded-right');
                elem.classList.add('padded-bottom');

                html += '<h2 class="sectionTitle">' + globalize.translate('LiveTvRequiresUnlock') + '</h2>';
                html += '<button is="emby-button" type="button" class="raised button-submit block btnUnlock">';
                html += '<span>' + globalize.translate('HeaderBecomeProjectSupporter') + '</span>';
                html += '</button>';

                elem.innerHTML = html;
            }

            bindUnlockClick(elem);
        });
    }

    function getNextUpFetchFn(serverId) {

        return function () {

            var apiClient = connectionManager.getApiClient(serverId);

            return apiClient.getNextUpEpisodes({

                Limit: 24,
                Fields: "PrimaryImageAspectRatio,SeriesInfo,DateCreated,BasicSyncInfo",
                UserId: apiClient.getCurrentUserId(),
                ImageTypeLimit: 1,
                EnableImageTypes: "Primary,Backdrop,Banner,Thumb",
                EnableTotalRecordCount: false
            });
        };
    }

    function getNextUpItemsHtml(items) {

        var cardLayout = false;

        return cardBuilder.getCardsHtml({
            items: items,
            preferThumb: true,
            shape: getThumbShape(),
            overlayText: false,
            showTitle: true,
            showParentTitle: true,
            lazy: true,
            overlayPlayButton: true,
            context: 'home',
            centerText: !cardLayout,
            cardLayout: cardLayout
        });
    }

    function loadNextUp(elem, apiClient, userId) {

        var html = '';
        html += '<div class="sectionTitleContainer sectionTitleContainer-cards padded-left">';
        if (!layoutManager.tv) {

            html += '<a is="emby-linkbutton" href="' + appRouter.getRouteUrl('nextup', {

                serverId: apiClient.serverId()

            }) + '" class="button-flat button-flat-mini sectionTitleTextButton">';
            html += '<h2 class="sectionTitle sectionTitle-cards">';
            html += globalize.translate('HeaderNextUp');
            html += '<i class="md-icon">&#xE5CC;</i></h2>';
            html += '</a>';

        } else {
            html += '<h2 class="sectionTitle sectionTitle-cards">' + globalize.translate('HeaderNextUp') + '</h2>';
        }
        html += '</div>';

        html += '<div is="emby-scroller" data-mousewheel="false" data-centerfocus="true" class="padded-top-focusscale padded-bottom-focusscale"><div is="emby-itemscontainer" class="itemsContainer scrollSlider focuscontainer-x padded-left padded-right" data-monitor="videoplayback,markplayed">';

        html += '</div>';

        html += '</div>';

        elem.classList.add('hide');
        elem.innerHTML = html;

        var itemsContainer = elem.querySelector('.itemsContainer');
        itemsContainer.fetchData = getNextUpFetchFn(apiClient.serverId());
        itemsContainer.getItemsHtml = getNextUpItemsHtml;
        itemsContainer.parentContainer = elem;
    }

    function getLatestRecordingsFetchFn(serverId, activeRecordingsOnly) {

        return function () {

            var apiClient = connectionManager.getApiClient(serverId);

            return apiClient.getLiveTvRecordings({

                userId: apiClient.getCurrentUserId(),
                Limit: 12,
                Fields: "PrimaryImageAspectRatio,BasicSyncInfo,ProductionYear",
                EnableTotalRecordCount: false,
                IsLibraryItem: activeRecordingsOnly ? null : false,
                IsInProgress: activeRecordingsOnly ? true : null

            });
        };
    }

    function getLatestRecordingItemsHtml(activeRecordingsOnly) {

        return function (items) {
            var cardLayout = false;

            return cardBuilder.getCardsHtml({
                items: items,
                shape: 'autooverflow',
                showTitle: true,
                showParentTitle: true,
                lazy: true,
                showDetailsMenu: true,
                centerText: true,
                overlayText: false,
                showYear: true,
                lines: 2,
                overlayPlayButton: !activeRecordingsOnly,
                preferThumb: true,
                cardLayout: false,
                overlayMoreButton: activeRecordingsOnly,
                action: activeRecordingsOnly ? 'none' : null,
                centerPlayButton: activeRecordingsOnly
            });
        };
    }

    function loadLatestLiveTvRecordings(elem, activeRecordingsOnly, apiClient, userId) {

        var title = activeRecordingsOnly ?
            globalize.translate('HeaderActiveRecordings') :
            globalize.translate('HeaderLatestRecordings');

        var html = '';

        html += '<div class="sectionTitleContainer sectionTitleContainer-cards">';
        html += '<h2 class="sectionTitle sectionTitle-cards padded-left">' + title + '</h2>';
        if (!layoutManager.tv) {
            //html += '<a href="livetv.html?tab=3" class="clearLink" style="margin-left:2em;"><button is="emby-button" type="button" class="raised more mini"><span>' + globalize.translate('More') + '</span></button></a>';
            //html += '<button data-href="" type="button" is="emby-button" class="raised raised-mini sectionTitleButton btnMore">';
            //html += '<span>' + globalize.translate('More') + '</span>';
            //html += '</button>';
        }
        html += '</div>';

        html += '<div is="emby-scroller" data-mousewheel="false" data-centerfocus="true" class="padded-top-focusscale padded-bottom-focusscale"><div is="emby-itemscontainer" class="itemsContainer scrollSlider focuscontainer-x padded-left padded-right">';

        html += '</div>';

        html += '</div>';

        elem.classList.add('hide');
        elem.innerHTML = html;

        var itemsContainer = elem.querySelector('.itemsContainer');
        itemsContainer.fetchData = getLatestRecordingsFetchFn(apiClient.serverId(), activeRecordingsOnly);
        itemsContainer.getItemsHtml = getLatestRecordingItemsHtml(activeRecordingsOnly);
        itemsContainer.parentContainer = elem;
    }

    return {
        getDefaultSection: getDefaultSection,
        loadSections: loadSections,
        destroySections: destroySections,
        pause: pause,
        resume: resume
    };
});