define(['itemsTab', 'cardBuilder', 'layoutManager', 'globalize', 'listView', 'emby-itemscontainer'], function (ItemsTab, cardBuilder, layoutManager, globalize, listView) {
    'use strict';

    function FoldersTab(view, params) {

        this.enableAlphaPicker = true;

        ItemsTab.call(this, view, params);
    }

    Object.assign(FoldersTab.prototype, ItemsTab.prototype);

    FoldersTab.prototype.fetchData = function () {

        var parentId = this.params.parentId;

        var sortValues = this.getSortValues();

        var query = {
            SortBy: sortValues.sortBy,
            SortOrder: sortValues.sortOrder,
            Fields: "PrimaryImageAspectRatio,BasicSyncInfo,SortName",
            ImageTypeLimit: 1,
            EnableImageTypes: "Primary,Backdrop,Banner,Thumb,Disc",
            StartIndex: this.startIndex || 0,
            Limit: this.nextPageButtons.length ? 100 : null,
            ParentId: parentId,
            NameStartsWithOrGreater: this.NameStartsWithOrGreater
        };

        var queryFilters = [];
        var hasFilters;

        var filters = this.getFilters();

        query.Filters = queryFilters.length ? queryFilters.join(',') : null;

        this.setFilterStatus(hasFilters);

        var apiClient = this.apiClient;
        return apiClient.getItems(apiClient.getCurrentUserId(), query);
    };

    FoldersTab.prototype.getItemsHtml = function (items) {

        var settings = this.getViewSettings();

        if (settings.imageType === 'list') {
            return listView.getListViewHtml({
                items: items
            });
        }

        var shape;
        var preferThumb;
        var preferDisc;

        if (settings.imageType === 'banner') {
            shape = 'banner';
        }
        else if (settings.imageType === 'disc') {
            shape = 'square';
            preferDisc = true;
        }
        else if (settings.imageType === 'thumb') {
            shape = 'backdrop';
            preferThumb = true;
        } else {
            shape = 'auto';
        }

        var cardLayout = false;

        return cardBuilder.getCardsHtml(items, {
            items: items,
            shape: shape,
            centerText: !cardLayout,
            preferThumb: preferThumb,
            preferDisc: preferDisc,
            overlayMoreButton: !layoutManager.tv,
            showTitle: settings.showTitle,
            overlayText: !settings.showTitle,
            cardLayout: cardLayout,
            context: 'folders'
        });
    };

    FoldersTab.prototype.getSettingsKey = function () {

        return ItemsTab.prototype.getSettingsKey.call(this) + '-folders';
    };

    FoldersTab.prototype.getViewSettings = function () {

        var settings = ItemsTab.prototype.getViewSettings.call(this);

        // set defaults
        settings.showTitle = settings.showTitle !== false;

        return settings;
    };

    FoldersTab.prototype.getDefaultSortBy = function () {

        return 'IsFolder,SortName';
    };

    FoldersTab.prototype.getFolderSortOption = function () {

        return {
            name: globalize.translate('sharedcomponents#Folders'),
            value: 'IsFolder,SortName'
        };
    };

    FoldersTab.prototype.getVisibleViewSettings = function () {

        return [
            'showTitle',
            'imageType'
        ];
    };

    FoldersTab.prototype.getVisibleFilters = function () {

        return [
        ];
    };

    return FoldersTab;
});