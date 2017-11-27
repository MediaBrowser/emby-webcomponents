define(['userSettings', 'alphaPicker', 'alphaNumericShortcuts', 'connectionManager', 'focusManager'], function (userSettings, AlphaPicker, AlphaNumericShortcuts, connectionManager, focusManager) {
    'use strict';

    function trySelectValue(instance, scroller, view, value) {

        var card;

        // If it's the symbol just pick the first card
        if (value === '#') {

            card = view.querySelector('.card');

            if (card) {
                scroller.toStart(card, false);
                return;
            }
        }

        card = view.querySelector('.card[data-prefix^=\'' + value + '\']');

        if (card) {
            scroller.toStart(card, false);
            return;
        }

        // go to the previous letter
        var values = instance.alphaPicker.values();
        var index = values.indexOf(value);

        if (index < values.length - 2) {
            trySelectValue(instance, scroller, view, values[index + 1]);
        } else {
            var all = view.querySelectorAll('.card');
            card = all.length ? all[all.length - 1] : null;

            if (card) {
                scroller.toStart(card, false);
            }
        }
    }

    function onAlphaValueChanged() {

        var value = this.alphaPicker.value();
        var scroller = this.scroller;

        trySelectValue(this, scroller, this.itemsContainer, value);
    }

    function initAlphaPicker(instance, view) {

        instance.itemsContainer = view.querySelector('.itemsContainer');

        instance.alphaPicker = new AlphaPicker({
            element: view.querySelector('.alphaPicker'),
            itemsContainer: instance.itemsContainer,
            itemClass: 'card'
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
                onChange: instance.itemsContainer.refreshItems.bind(instance.itemsContainer)

            }).then(function () {

                instance.itemsContainer.refreshItems();
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

                instance.itemsContainer.refreshItems();
            });
        });
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

        if (params.parentId) {
            this.itemsContainer.setAttribute('data-parentid', params.parentId);
        }

        var btnViewSettings = view.querySelector('.btnViewSettings');
        if (btnViewSettings) {
            btnViewSettings.addEventListener('click', showViewSettingsMenu.bind(this));
        }

        var btnFilter = view.querySelector('.btnFilter');
        this.btnFilter = btnFilter;
        if (btnFilter) {
            btnFilter.addEventListener('click', showFilterMenu.bind(this));
        }
    }

    function getSettingValue(key, defaultValue) {
    }

    ItemsTab.prototype.getViewSettings = function () {

        var basekey = this.getSettingsKey();

        return {
            showTitle: userSettings.get(basekey + '-showtitle') !== 'false',
            showYear: userSettings.get(basekey + '-showyear') !== 'false',
            imageType: userSettings.get(basekey + '-imagetype')
        };
    };

    ItemsTab.prototype.getSettingsKey = function () {

        return this.params.parentId;
    };

    ItemsTab.prototype.onResume = function (options) {

        var view = this.view;

        if (this.enableAlphaPicker && !this.alphaPicker) {
            initAlphaPicker(this, view);
        }

        if (this.enableAlphaNumericShortcuts !== false) {
            this.alphaNumericShortcuts = new AlphaNumericShortcuts({
                itemsContainer: this.itemsContainer
            });
        }

        var instance = this;
        var autoFocus = options.autoFocus;

        this.itemsContainer.resume(options).then(function (result) {
            if (autoFocus) {
                focusManager.autoFocus(instance.itemsContainer);
            }
        });
    };

    ItemsTab.prototype.getVisibleViewSettings = function () {

        return [
            'showtitle',
            'showyear',
            'imagetype'
        ];
    };

    ItemsTab.prototype.getFilters = function () {

        var basekey = this.getSettingsKey();

        return {
            IsPlayed: userSettings.getFilter(basekey + '-filter-IsPlayed') === 'true',
            IsUnplayed: userSettings.getFilter(basekey + '-filter-IsUnplayed') === 'true',
            IsFavorite: userSettings.getFilter(basekey + '-filter-IsFavorite') === 'true'
        };
    };

    ItemsTab.prototype.getVisibleFilters = function () {

        return [
            'IsUnplayed',
            'IsPlayed',
            'IsFavorite'
        ];
    };

    ItemsTab.prototype.setFilterStatus = function (hasFilters) {

        var btnFilter = this.btnFilter;
        if (!btnFilter) {
            return;
        }

        var bubble = btnFilter.querySelector('.filterButtonBubble');
        if (!bubble) {

            if (!hasFilters) {
                return;
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
    };

    ItemsTab.prototype.onPause = function () {

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
        this.btnFilter = null;

        if (this.alphaPicker) {
            this.alphaPicker.destroy();
            this.alphaPicker = null;
        }
    };

    return ItemsTab;
});