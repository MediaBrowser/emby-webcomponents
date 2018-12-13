define(['layoutManager', 'playbackManager', 'userSettings', 'alphaPicker', 'connectionManager', 'focusManager', 'loading', 'globalize'], function (layoutManager, playbackManager, userSettings, AlphaPicker, connectionManager, focusManager, loading, globalize) {
    'use strict';

    function initAlphaNumericShortcuts(instance) {

        require(['alphaNumericShortcuts'], function (AlphaNumericShortcuts) {
            instance.alphaNumericShortcuts = new AlphaNumericShortcuts({
                itemsContainer: instance.itemsContainer
            });
        });
    }

    function trySelectValue(instance, scroller, view, value) {

        if (instance.enablePaging()) {

            instance.startIndex = 0;
            instance.scrollOnNextRefresh = true;
            instance.itemsContainer.refreshItems();
            return;
        }

        var selectableItem;

        // If it's the symbol just pick the first card
        if (value === '#') {

            selectableItem = view.querySelector('.card,.listItem');

            if (selectableItem) {

                if (scroller) {
                    scroller.toStart(selectableItem, false);
                } else {
                    (selectableItem.querySelector('.cardContent-button') || selectableItem).focus();
                }
                return;
            }
        }

        selectableItem = view.querySelector('*[data-prefix^=\'' + value + '\']');

        if (selectableItem) {
            if (scroller) {
                scroller.toStart(selectableItem, false);
            } else {
                (selectableItem.querySelector('.cardContent-button') || selectableItem).focus();
            }
            return;
        }

        // go to the previous letter
        var values = instance.alphaPicker.values();
        var index = values.indexOf(value);

        if (index < values.length - 2) {
            trySelectValue(instance, scroller, view, values[index + 1]);
        } else {
            var all = view.querySelectorAll('.card,.listItem');
            selectableItem = all.length ? all[all.length - 1] : null;

            if (selectableItem) {
                if (scroller) {
                    scroller.toStart(selectableItem, false);
                } else {
                    (selectableItem.querySelector('.cardContent-button') || selectableItem).focus();
                }
            }
        }
    }

    function page(offset) {

        var startIndex = this.startIndex || 0;

        var newStartIndex = Math.max(0, startIndex + offset);

        if (newStartIndex !== startIndex) {

            this.startIndex = newStartIndex;

            this.scrollOnNextRefresh = true;
            this.itemsContainer.refreshItems();
        }
    }

    function nextPage() {

        var instance = this;

        page.call(instance, 100);
    }

    function previousPage() {

        var instance = this;

        page.call(instance, -100);
    }

    function onAlphaValueChanged() {

        var value = this.alphaPicker.value();
        var scroller = this.scroller;

        trySelectValue(this, scroller, this.itemsContainer, value);
    }

    function initAlphaPicker(instance, view) {

        instance.itemsContainer = view.querySelector('.itemsContainer');

        instance.alphaPicker = new AlphaPicker({
            element: instance.alphaPickerElement,
            itemsContainer: instance.itemsContainer,
            itemClass: ['card', 'listItem'],
            prefixes: instance.apiClient.isMinServerVersion('3.6.0.60') ? [] : null
        });

        instance.alphaPicker.on('alphavaluechanged', onAlphaValueChanged.bind(instance));
    }

    function showFilterMenu() {

        var instance = this;

        require(['filterMenu'], function (FilterMenu) {

            new FilterMenu().show({

                settingsKey: instance.getSettingsKey(),
                settings: instance.getFilters(),
                visibleSettings: instance.getVisibleFilters(),
                onChange: instance.itemsContainer.refreshItems.bind(instance.itemsContainer),
                parentId: instance.params.parentId,
                itemTypes: instance.getItemTypes ? instance.getItemTypes() : [],
                serverId: instance.apiClient.serverId(),
                filterMenuOptions: instance.getFilterMenuOptions()

            }).then(function () {

                refreshAfterSettingsChange(instance);
            });
        });
    }

    function updateAlphaPickerState(instance, numItems) {

        if (!instance.alphaPicker) {
            return;
        }

        var alphaPicker = instance.alphaPickerElement;
        if (!alphaPicker) {
            return;
        }
        var values = instance.getSortValues();

        if (numItems == null) {
            numItems = 100;
        }

        var elemWithPadding = instance.itemsContainer.classList.contains('padded-left') ?
            instance.itemsContainer :
            instance.itemsContainer.parentNode;

        if (values.sortBy === 'SortName' && values.sortOrder === 'Ascending' && numItems > 40) {
            alphaPicker.classList.remove('hide');

            if (layoutManager.tv) {
                elemWithPadding.classList.remove('padded-right-withalphapicker');
                elemWithPadding.classList.add('padded-left-withalphapicker');
                alphaPicker.classList.add('alphaPicker-fixed-left');
                alphaPicker.classList.remove('alphaPicker-fixed-right');
            }
            else {
                elemWithPadding.classList.remove('padded-left-withalphapicker');
                elemWithPadding.classList.add('padded-right-withalphapicker');
                alphaPicker.classList.remove('alphaPicker-fixed-left');
                alphaPicker.classList.add('alphaPicker-fixed-right');
            }

            instance.refreshPrefixes();

        } else {
            alphaPicker.classList.add('hide');
            elemWithPadding.classList.remove('padded-left-withalphapicker');
            elemWithPadding.classList.remove('padded-right-withalphapicker');
        }
    }

    function showSortMenu() {

        var instance = this;

        require(['sortMenu'], function (SortMenu) {

            new SortMenu().show({

                settingsKey: instance.getSettingsKey(),
                settings: instance.getSortValues(),
                onChange: instance.itemsContainer.refreshItems.bind(instance.itemsContainer),
                serverId: instance.params.serverId,
                sortOptions: instance.getSortMenuOptions()

            }).then(function () {

                updateSortText(instance);

                refreshAfterSettingsChange(instance);
            });
        });
    }

    function showViewSettingsMenu() {

        var instance = this;

        require(['viewSettings'], function (ViewSettings) {

            new ViewSettings().show({

                settingsKey: instance.getSettingsKey(),
                settings: instance.getViewSettings(),
                visibleSettings: instance.getVisibleViewSettings()

            }).then(function () {

                updateItemsContainerForViewType(instance);

                refreshAfterSettingsChange(instance);
            });
        });
    }

    function refreshAfterSettingsChange(instance) {

        instance.totalItemCount = null;
        instance.startIndex = 0;

        if (instance.alphaPicker && instance.enablePaging()) {
            instance.alphaPicker.value(null, false);
        }

        instance.scrollOnNextRefresh = true;

        instance.itemsContainer.refreshItems();
    }

    function updateItemsContainerForViewType(instance) {

        var settings = instance.getViewSettings();

        if (settings.imageType === 'list') {

            instance.itemsContainer.classList.remove('vertical-wrap');
            instance.itemsContainer.classList.add('vertical-list');

        } else {
            instance.itemsContainer.classList.add('vertical-wrap');
            instance.itemsContainer.classList.remove('vertical-list');
        }
    }

    function updateSortText(instance) {

        var btnSortText = instance.btnSortText;
        if (!btnSortText) {
            return;
        }

        var options = instance.getSortMenuOptions();
        var values = instance.getSortValues();

        var sortBy = values.sortBy;

        for (var i = 0, length = options.length; i < length; i++) {

            if (sortBy === options[i].value) {

                btnSortText.innerHTML = globalize.translate('sharedcomponents#SortByValue', options[i].name);
                break;
            }
        }

        var btnSortIcon = instance.btnSortIcon;
        if (!btnSortIcon) {
            return;
        }

        btnSortIcon.innerHTML = values.sortOrder === 'Descending' ? '&#xE5DB;' : '&#xE5D8;';
    }

    function bindAll(elems, eventName, fn) {
        for (var i = 0, length = elems.length; i < length; i++) {

            elems[i].addEventListener(eventName, fn);
        }
    }

    function play() {

        this.fetchData().then(function (result) {
            playbackManager.play({
                items: result.Items || result
            });
        });
    }

    function shuffle() {

        this.fetchData().then(function (result) {
            playbackManager.play({
                items: result.Items || result
            });
        });
    }

    function hideOrShowAll(elems, hide) {

        for (var i = 0, length = elems.length; i < length; i++) {

            if (hide) {
                elems[i].classList.add('hide');
            } else {
                elems[i].classList.remove('hide');
            }
        }
    }

    function afterRefresh(result) {

        if (this.enablePaging() && this.scrollOnNextRefresh) {
            window.scrollTo(0, 0);
        }

        this.scrollOnNextRefresh = false;

        if (this.totalItemCount == null) {

            if (result.TotalRecordCount != null) {
                this.totalItemCount = result.TotalRecordCount;
            } else {
                this.totalItemCount = result.Items ? result.Items.length : result.length;
            }
        }

        updateAlphaPickerState(this, this.totalItemCount);

        var startIndex = this.startIndex || 0;
        var i, length;

        var previousPageButtons = this.previousPageButtons;
        for (i = 0, length = previousPageButtons.length; i < length; i++) {

            previousPageButtons[i].disabled = startIndex <= 0;
        }

        var totalRecordCount = result.TotalRecordCount;
        if (totalRecordCount != null) {
            var nextPageButtons = this.nextPageButtons;
            for (i = 0, length = nextPageButtons.length; i < length; i++) {

                nextPageButtons[i].disabled = startIndex + 100 > totalRecordCount;
            }
        }
    }

    function ItemsTab(view, params) {
        this.view = view;
        this.params = params;

        if (params.serverId) {
            this.apiClient = connectionManager.getApiClient(params.serverId);
        }

        this.itemsContainer = view.querySelector('.itemsContainer');
        this.scroller = view.querySelector('.scrollFrameY');

        this.itemsContainer.fetchData = this.fetchData.bind(this);
        this.itemsContainer.getItemsHtml = this.getItemsHtml.bind(this);
        this.itemsContainer.afterRefresh = afterRefresh.bind(this);

        if (params.parentId) {
            this.itemsContainer.setAttribute('data-parentid', params.parentId);
        }

        var i, length;

        var btnViewSettings = view.querySelectorAll('.btnViewSettings');
        for (i = 0, length = btnViewSettings.length; i < length; i++) {

            btnViewSettings[i].addEventListener('click', showViewSettingsMenu.bind(this));
        }

        var filterButtons = view.querySelectorAll('.btnFilter');
        this.filterButtons = filterButtons;
        var hasVisibleFilters = this.getVisibleFilters().length;
        for (i = 0, length = filterButtons.length; i < length; i++) {

            var btnFilter = filterButtons[i];
            btnFilter.addEventListener('click', showFilterMenu.bind(this));

            if (hasVisibleFilters) {
                btnFilter.classList.remove('hide');
            } else {
                btnFilter.classList.add('hide');
            }
        }

        var nextPageButtons = view.querySelectorAll('.btnNextPage');
        this.nextPageButtons = nextPageButtons;
        for (i = 0, length = nextPageButtons.length; i < length; i++) {

            nextPageButtons[i].addEventListener('click', nextPage.bind(this));
        }

        var previousPageButtons = view.querySelectorAll('.btnPreviousPage');
        this.previousPageButtons = previousPageButtons;
        for (i = 0, length = previousPageButtons.length; i < length; i++) {

            previousPageButtons[i].addEventListener('click', previousPage.bind(this));
        }

        var sortButtons = view.querySelectorAll('.btnSort');
        this.sortButtons = sortButtons;
        for (i = 0, length = sortButtons.length; i < length; i++) {

            var sortButton = sortButtons[i];
            sortButton.addEventListener('click', showSortMenu.bind(this));

            if (params.type !== 'nextup') {
                sortButton.classList.remove('hide');
            }
        }
        this.btnSortText = view.querySelector('.btnSortText');
        this.btnSortIcon = view.querySelector('.btnSortIcon');

        this.enableAlphaNumericShortcuts = this.itemsContainer.getAttribute('data-alphanumericshortcuts') === 'true' && !layoutManager.mobile && !this.enablePaging();

        this.alphaPickerElement = view.querySelector('.alphaPicker');

        hideOrShowAll(view.querySelectorAll('.btnShuffle'), true);

        bindAll(view.querySelectorAll('.btnPlay'), 'click', play.bind(this));
        bindAll(view.querySelectorAll('.btnShuffle'), 'click', shuffle.bind(this));

        this.scrollOnNextRefresh = true;
    }

    ItemsTab.prototype.refreshPrefixes = function () {

        var instance = this;
        if (instance.prefixesLoaded) {
            return;
        }

        this.getPrefixes().then(function (prefixes) {
            instance.prefixesLoaded = true;
            instance.alphaPicker.setPrefixes(prefixes);
        });
    };

    ItemsTab.prototype.getPrefixes = function () {

        var queryInfo = this.getQueryInfo(false);

        var apiClient = this.apiClient;

        var query = queryInfo.query;
        query.SortBy = null;
        query.SortOrder = null;
        query.StartIndex = null;
        query.Limit = null;
        query.Fields = null;
        query.EnableImageTypes = null;
        query.ImageTypeLimit = null;
        query.NameStartsWithOrGreater = null;

        query.IncludeItemTypes = this.getPrefixQueryIncludeItemTypes().join(',');

        return apiClient.getPrefixes(apiClient.getCurrentUserId(), query).then(function (result) {
            return result.map(function (i) {
                return i.Name;
            });
        });
    };

    ItemsTab.prototype.getPrefixQueryIncludeItemTypes = function () {

        return this.getQueryIncludeItemTypes();
    };

    ItemsTab.prototype.getQueryIncludeItemTypes = function () {

        return this.getItemTypes();
    };

    ItemsTab.prototype.getBaseQuery = function () {

        var parentId = this.params.parentId;

        var sortValues = this.getSortValues();

        var fields = "BasicSyncInfo,MediaSourceCount";
        if (!layoutManager.mobile) {
            // needed for alpha-numeric shortcuts
            fields += ",SortName";
        }

        var settings = this.getViewSettings();
        if (settings.imageType === 'primary') {
            fields += ",PrimaryImageAspectRatio";
        }

        var query = {
            SortBy: sortValues.sortBy,
            SortOrder: sortValues.sortOrder,
            IncludeItemTypes: this.getQueryIncludeItemTypes().join(','),
            Recursive: true,
            Fields: fields,
            ImageTypeLimit: 1,
            EnableImageTypes: "Primary,Backdrop,Banner,Thumb,Disc,Logo",
            StartIndex: this.startIndex || 0,
            Limit: this.enablePaging() ? 100 : null,
            ParentId: parentId
        };

        var alphaPicker = this.alphaPicker;
        if (alphaPicker) {
            query.NameStartsWithOrGreater = alphaPicker.value();
        }

        return query;
    };

    ItemsTab.prototype.getQueryInfo = function (enableFilters) {

        var query = this.getBaseQuery();

        var queryFilters = [];
        var hasFilters;

        if (this.mode === 'unwatched') {
            queryFilters.push("IsUnplayed");
        }
        else if (this.mode === 'favorites') {
            queryFilters.push("IsFavorite");
        }

        if (enableFilters !== false) {
            var filters = this.getFilters();

            if (filters.SeriesStatus) {
                query.SeriesStatus = filters.SeriesStatus;
                hasFilters = true;
            }

            if (filters.IsPlayed) {
                queryFilters.push("IsPlayed");
                hasFilters = true;
            }
            if (filters.IsUnplayed) {
                queryFilters.push("IsUnplayed");
                hasFilters = true;
            }
            if (filters.IsFavorite) {
                queryFilters.push("IsFavorite");
                hasFilters = true;
            }
            if (filters.IsResumable) {
                queryFilters.push("IsResumable");
                hasFilters = true;
            }

            if (filters.Containers) {
                hasFilters = true;
                query.Containers = filters.Containers;
            }

            if (filters.GenreIds) {
                hasFilters = true;
                query.GenreIds = filters.GenreIds;
            }

            if (filters.OfficialRatings) {
                hasFilters = true;
                query.OfficialRatings = filters.OfficialRatings;
            }

            if (filters.StudioIds) {
                hasFilters = true;
                query.StudioIds = filters.StudioIds;
            }

            if (filters.Tags) {
                hasFilters = true;
                query.Tags = filters.Tags;
            }

            if (filters.Years) {
                hasFilters = true;
                query.Years = filters.Years;
            }

            if (filters.Is4K) {
                query.Is4K = true;
                hasFilters = true;
            }
            if (filters.IsHD) {
                query.IsHD = true;
                hasFilters = true;
            }
            if (filters.IsSD) {
                query.IsHD = false;
                hasFilters = true;
            }
            if (filters.Is3D) {
                query.Is3D = true;
                hasFilters = true;
            }
            if (filters.HasSubtitles) {
                query.HasSubtitles = true;
                hasFilters = true;
            }
            if (filters.HasTrailer) {
                query.HasTrailer = true;
                hasFilters = true;
            }
            if (filters.HasSpecialFeature) {
                query.HasSpecialFeature = true;
                hasFilters = true;
            }
            if (filters.HasThemeSong) {
                query.HasThemeSong = true;
                hasFilters = true;
            }
            if (filters.HasThemeVideo) {
                query.HasThemeVideo = true;
                hasFilters = true;
            }
        }

        query.Filters = queryFilters.length ? queryFilters.join(',') : null;

        var settings = this.getViewSettings();
        if (settings.groupItemsIntoCollections) {
            query.GroupItemsIntoCollections = true;
        }

        return {
            query: query,
            hasFilters: hasFilters
        };
    };

    ItemsTab.prototype.fetchData = function () {

        var queryInfo = this.getQueryInfo();

        this.setFilterStatus(queryInfo.hasFilters);

        var apiClient = this.apiClient;
        return apiClient.getItems(apiClient.getCurrentUserId(), queryInfo.query);
    };

    ItemsTab.prototype.getViewSettings = function () {

        var basekey = this.getSettingsKey();

        return {
            showTitle: userSettings.get(basekey + '-showTitle') !== 'false',
            showYear: userSettings.get(basekey + '-showYear') !== 'false',
            groupItemsIntoCollections: userSettings.get(basekey + '-groupItemsIntoCollections') === 'true',
            imageType: userSettings.get(basekey + '-imageType') || this.getDefaultImageType()
        };
    };

    ItemsTab.prototype.getDefaultImageType = function () {

        return 'primary';
    };

    ItemsTab.prototype.getSettingsKey = function () {

        return this.params.parentId + '-1';
    };

    ItemsTab.prototype.onResume = function (options) {

        if (options && options.refresh) {
            updateSortText(this);
            updateItemsContainerForViewType(this);
            loading.show();
        }

        var view = this.view;

        var scroller = this.scroller;
        if (scroller && scroller.resume) {
            scroller.resume();
        }

        var itemsContainer = this.itemsContainer;
        if (itemsContainer && itemsContainer.resume) {
            itemsContainer.resume();
        }

        if (this.enableAlphaPicker && !this.alphaPicker) {
            initAlphaPicker(this, view);
        }

        if (this.enableAlphaNumericShortcuts) {

            initAlphaNumericShortcuts(this);
        }

        var instance = this;
        var autoFocus = options.autoFocus;

        this.itemsContainer.resume(options).then(function (result) {

            loading.hide();

            if (autoFocus) {
                focusManager.autoFocus(instance.itemsContainer);
            }
        });
    };

    ItemsTab.prototype.refresh = function (options) {

        loading.show();

        var instance = this;
        var autoFocus = options.autoFocus;

        this.itemsContainer.refreshItems(options).then(function (result) {

            loading.hide();

            if (autoFocus) {
                focusManager.autoFocus(instance.itemsContainer);
            }
        });
    };

    ItemsTab.prototype.getVisibleViewSettings = function () {

        return [
            'showTitle',
            'showYear',
            'imageType'
        ];
    };

    ItemsTab.prototype.getFilters = function () {

        var basekey = this.getSettingsKey();

        return {
            IsPlayed: userSettings.getFilter(basekey + '-filter-IsPlayed') === 'true',
            IsUnplayed: userSettings.getFilter(basekey + '-filter-IsUnplayed') === 'true',
            IsFavorite: userSettings.getFilter(basekey + '-filter-IsFavorite') === 'true',
            IsResumable: userSettings.getFilter(basekey + '-filter-IsResumable') === 'true',
            Is4K: userSettings.getFilter(basekey + '-filter-Is4K') === 'true',
            IsHD: userSettings.getFilter(basekey + '-filter-IsHD') === 'true',
            IsSD: userSettings.getFilter(basekey + '-filter-IsSD') === 'true',
            Is3D: userSettings.getFilter(basekey + '-filter-Is3D') === 'true',
            VideoTypes: userSettings.getFilter(basekey + '-filter-VideoTypes'),
            SeriesStatus: userSettings.getFilter(basekey + '-filter-SeriesStatus'),
            HasSubtitles: userSettings.getFilter(basekey + '-filter-HasSubtitles'),
            HasTrailer: userSettings.getFilter(basekey + '-filter-HasTrailer'),
            HasSpecialFeature: userSettings.getFilter(basekey + '-filter-HasSpecialFeature'),
            HasThemeSong: userSettings.getFilter(basekey + '-filter-HasThemeSong'),
            HasThemeVideo: userSettings.getFilter(basekey + '-filter-HasThemeVideo'),
            GenreIds: userSettings.getFilter(basekey + '-filter-GenreIds'),
            StudioIds: userSettings.getFilter(basekey + '-filter-StudioIds'),
            Tags: userSettings.getFilter(basekey + '-filter-Tags'),
            Containers: userSettings.getFilter(basekey + '-filter-Containers'),
            OfficialRatings: userSettings.getFilter(basekey + '-filter-OfficialRatings'),
            Years: userSettings.getFilter(basekey + '-filter-Years')
        };
    };

    ItemsTab.prototype.getSortValues = function () {

        var basekey = this.getSettingsKey();

        return {
            sortBy: userSettings.getFilter(basekey + '-sortby') || this.getDefaultSortBy(),
            sortOrder: userSettings.getFilter(basekey + '-sortorder') === 'Descending' ? 'Descending' : 'Ascending'
        };
    };

    ItemsTab.prototype.getVisibleFilters = function () {

        return [
            'IsUnplayed',
            'IsPlayed',
            'IsFavorite',
            'IsResumable',
            'VideoType',
            'HasSubtitles',
            'HasTrailer',
            'HasSpecialFeature',
            'HasThemeSong',
            'HasThemeVideo'
        ];
    };

    ItemsTab.prototype.getDefaultSortBy = function () {

        return 'SortName';
    };

    function compareByName(a, b) {

        if (a.name < b.name) {
            return -1;
        }
        if (a.name > b.name) {
            return 1;
        }
        return 0;
    }

    ItemsTab.prototype.sortOptionsByName = function (options) {

        options.sort(compareByName);
    };

    ItemsTab.prototype.getSortMenuOptions = function () {

        var sortBy = [];

        var option = this.getNameSortOption();
        if (option) {
            sortBy.push(option);
        }

        option = this.getFolderSortOption();
        if (option) {
            sortBy.push(option);
        }

        option = this.getCommunityRatingSortOption();
        if (option) {
            sortBy.push(option);
        }

        option = this.getCriticRatingSortOption();

        if (option) {
            sortBy.push(option);
        }

        sortBy.push({
            name: globalize.translate('sharedcomponents#DateAdded'),
            value: 'DateCreated,SortName'
        });

        option = this.getDatePlayedSortOption();
        if (option) {
            sortBy.push(option);
        }

        sortBy.push({
            name: globalize.translate('sharedcomponents#ParentalRating'),
            value: 'OfficialRating,SortName'
        });

        option = this.getPlayCountSortOption();
        if (option) {
            sortBy.push(option);
        }

        sortBy.push({
            name: globalize.translate('sharedcomponents#ReleaseDate'),
            value: 'PremiereDate,ProductionYear,SortName'
        });

        sortBy.push({
            name: globalize.translate('sharedcomponents#Runtime'),
            value: 'Runtime,SortName'
        });

        this.sortOptionsByName(sortBy);

        return sortBy;
    };

    ItemsTab.prototype.getNameSortOption = function () {

        return {
            name: globalize.translate('sharedcomponents#Name'),
            value: 'SortName'
        };
    };

    ItemsTab.prototype.getFolderSortOption = function () {

        return null;
    };

    ItemsTab.prototype.getPlayCountSortOption = function () {

        return {
            name: globalize.translate('sharedcomponents#PlayCount'),
            value: 'PlayCount,SortName'
        };
    };

    ItemsTab.prototype.getDatePlayedSortOption = function () {

        return {
            name: globalize.translate('sharedcomponents#DatePlayed'),
            value: 'DatePlayed,SortName'
        };
    };

    ItemsTab.prototype.getCriticRatingSortOption = function () {

        return {
            name: globalize.translate('sharedcomponents#CriticRating'),
            value: 'CriticRating,SortName'
        };
    };

    ItemsTab.prototype.enablePaging = function () {

        return this.nextPageButtons.length;
    };

    ItemsTab.prototype.getCommunityRatingSortOption = function () {

        return {
            name: globalize.translate('sharedcomponents#CommunityRating'),
            value: 'CommunityRating,SortName'
        };
    };

    ItemsTab.prototype.getFilterMenuOptions = function () {

        var params = this.params;

        return {

        };
    };

    ItemsTab.prototype.getItemTypes = function () {

        return [];
    };

    ItemsTab.prototype.setFilterStatus = function (hasFilters) {

        this.hasFilters = hasFilters;

        var filterButtons = this.filterButtons;
        if (!filterButtons.length) {
            return;
        }

        for (var i = 0, length = filterButtons.length; i < length; i++) {

            var btnFilter = filterButtons[i];

            var bubble = btnFilter.querySelector('.filterButtonBubble');
            if (!bubble) {

                if (!hasFilters) {
                    continue;
                }

                btnFilter.insertAdjacentHTML('afterbegin', '<div class="filterButtonBubble">!</div>');
                btnFilter.classList.add('btnFilterWithBubble');
                bubble = btnFilter.querySelector('.filterButtonBubble');
            }

            if (hasFilters) {
                bubble.classList.remove('hide');
            } else {
                bubble.classList.add('hide');
            }
        }
    };

    ItemsTab.prototype.onPause = function () {

        var scroller = this.scroller;
        if (scroller && scroller.pause) {
            scroller.pause();
        }

        var itemsContainer = this.itemsContainer;
        if (itemsContainer && itemsContainer.pause) {
            itemsContainer.pause();
        }

        var alphaNumericShortcuts = this.alphaNumericShortcuts;
        if (alphaNumericShortcuts) {
            alphaNumericShortcuts.destroy();
            this.alphaNumericShortcuts = null;
        }
    };

    ItemsTab.prototype.destroy = function () {

        this.view = null;
        this.itemsContainer = null;
        this.params = null;
        this.apiClient = null;
        this.scroller = null;
        this.filterButtons = null;
        this.nextPageButtons = null;
        this.previousPageButtons = null;

        if (this.alphaPicker) {
            this.alphaPicker.destroy();
            this.alphaPicker = null;
        }
        this.sortButtons = null;
        this.btnSortText = null;
        this.btnSortIcon = null;
        this.alphaPickerElement = null;
        this.startIndex = null;
        this.prefixesLoaded = null;
        this.totalItemCount = null;
        this.scrollOnNextRefresh = null;
    };

    return ItemsTab;
});