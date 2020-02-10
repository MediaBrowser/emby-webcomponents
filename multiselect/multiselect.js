define(['browser', 'appStorage', 'apphost', 'loading', 'connectionManager', 'globalize', 'appRouter', 'dom', 'css!./multiselect'], function (browser, appStorage, appHost, loading, connectionManager, globalize, appRouter, dom) {
    'use strict';

    var selectedItems = [];
    var selectedItemsMap = {};
    var selectedElements = [];
    var currentSelectionCommandsPanel;

    function hideSelections() {

        var selectionCommandsPanel = currentSelectionCommandsPanel;
        if (selectionCommandsPanel) {

            selectionCommandsPanel.parentNode.removeChild(selectionCommandsPanel);
            currentSelectionCommandsPanel = null;

            selectedItems = [];
            selectedItemsMap = {};
            selectedElements = [];

            var elems = document.querySelectorAll('.multi-select-active');
            var i, length;

            for (i = 0, length = elems.length; i < length; i++) {

                elems[i].classList.remove('multi-select-active');
            }

            elems = document.querySelectorAll('.chkCardSelect:checked');
            for (i = 0, length = elems.length; i < length; i++) {

                elems[i].checked = false;
            }

            elems = document.querySelectorAll('.item-multiselected');

            for (i = 0, length = elems.length; i < length; i++) {

                elems[i].classList.remove('item-multiselected');
            }
        }
    }

    function showSelectionCommands() {

        var selectionCommandsPanel = currentSelectionCommandsPanel;

        if (!selectionCommandsPanel) {

            selectionCommandsPanel = document.createElement('div');
            selectionCommandsPanel.classList.add('selectionCommandsPanel');

            document.body.appendChild(selectionCommandsPanel);
            currentSelectionCommandsPanel = selectionCommandsPanel;

            var html = '';

            html += '<button is="paper-icon-button-light" class="btnCloseSelectionPanel autoSize"><i class="md-icon">close</i></button>';
            html += '<h1 class="itemSelectionCount"></h1>';

            var moreIcon = '&#xE5D3;';
            html += '<button is="paper-icon-button-light" class="btnSelectionPanelOptions autoSize" style="margin-left:auto;"><i class="md-icon">' + moreIcon + '</i></button>';

            selectionCommandsPanel.innerHTML = html;

            selectionCommandsPanel.querySelector('.btnCloseSelectionPanel').addEventListener('click', hideSelections);

            var btnSelectionPanelOptions = selectionCommandsPanel.querySelector('.btnSelectionPanelOptions');

            dom.addEventListener(btnSelectionPanelOptions, 'click', showMenuForSelectedItems, { passive: true });
        }
    }

    function alertText(options) {

        return new Promise(function (resolve, reject) {

            require(['alert'], function (alert) {
                alert(options).then(resolve, resolve);
            });
        });
    }

    function deleteItems(apiClient, itemIds) {

        return new Promise(function (resolve, reject) {

            var msg = globalize.translate('ConfirmDeleteItem');
            var title = globalize.translate('HeaderDeleteItem');

            if (itemIds.length > 1) {
                msg = globalize.translate('ConfirmDeleteItems');
                title = globalize.translate('HeaderDeleteItems');
            }

            msg += '\n\n' + globalize.translate('AreYouSureToContinue');

            require(['confirm'], function (confirm) {

                confirm(msg, title).then(function () {
                    var promises = itemIds.map(function (itemId) {
                        apiClient.deleteItem(itemId);
                    });

                    Promise.all(promises).then(resolve, function () {

                        alertText(globalize.translate('ErrorDeletingItem')).then(reject, reject);
                    });
                }, reject);

            });
        });
    }

    function addToCollection(items, serverId) {

        return require(['addToList']).then(function (responses) {

            var AddToList = responses[0];

            return new AddToList().show({
                items: items,
                serverId: serverId,
                type: 'Collection'
            });
        });
    }

    function addToPlaylist(items, serverId) {

        return require(['addToList']).then(function (responses) {

            var AddToList = responses[0];

            return new AddToList().show({
                items: items,
                serverId: serverId,
                type: 'Playlist'
            });
        });
    }

    function showMenuForSelectedItems(e) {

        var apiClient = connectionManager.currentApiClient();

        apiClient.getCurrentUser().then(function (user) {

            var menuItems = [];

            menuItems.push({
                name: globalize.translate('HeaderAddToCollection'),
                id: 'addtocollection',
                ironIcon: 'add',
                icon: 'playlist_add'
            });

            menuItems.push({
                name: globalize.translate('HeaderAddToPlaylist'),
                id: 'playlist',
                icon: 'playlist_add'
            });

            // TODO: Be more dynamic based on what is selected
            if (user.Policy.EnableContentDeletion) {
                menuItems.push({
                    name: globalize.translate('Delete'),
                    id: 'delete',
                    icon: 'delete'
                });
            }

            if (user.Policy.EnableContentDownloading && appHost.supports('filedownload')) {
                //items.push({
                //    name: Globalize.translate('ButtonDownload'),
                //    id: 'download',
                //    ironIcon: 'file-download'
                //});
            }

            if (user.Policy.EnableContentDownloading && appHost.supports('sync')) {
                menuItems.push({
                    name: globalize.translate('Download'),
                    id: 'synclocal',
                    icon: 'cloud_download'
                });
            }

            if (user.Policy.EnableContentDownloading) {
                menuItems.push({
                    name: globalize.translate('HeaderDownloadToDots'),
                    id: 'sync',
                    icon: 'cloud_download'
                });
            }

            if (user.Policy.IsAdministrator) {
                menuItems.push({
                    name: globalize.translate('HeaderGroupVersions'),
                    id: 'groupvideos',
                    icon: 'call_merge'
                });
            }

            menuItems.push({
                name: globalize.translate('HeaderMarkPlayed'),
                id: 'markplayed',
                icon: 'check'
            });

            menuItems.push({
                name: globalize.translate('HeaderMarkUnplayed'),
                id: 'markunplayed',
                icon: 'remove'
            });

            if (user.Policy.IsAdministrator) {
                menuItems.push({
                    name: globalize.translate('HeaderRefreshMetadata'),
                    id: 'refresh',
                    icon: 'refresh'
                });
            }

            require(['actionsheet'], function (actionsheet) {

                actionsheet.show({
                    items: menuItems,
                    positionTo: e.target,
                    callback: function (id) {

                        var items = selectedItems.slice(0);
                        var serverId = apiClient.serverInfo().Id;

                        switch (id) {

                            case 'addtocollection':
                                addToCollection(items, serverId);
                                hideSelections();
                                break;
                            case 'playlist':
                                addToPlaylist(items, serverId);
                                hideSelections();
                                break;
                            case 'delete':
                                deleteItems(apiClient, items).then(dispatchNeedsRefresh);
                                hideSelections();
                                break;
                            case 'groupvideos':
                                combineVersions(apiClient, items);
                                break;
                            case 'markplayed':
                                items.forEach(function (itemId) {
                                    apiClient.markPlayed(apiClient.getCurrentUserId(), itemId);
                                });
                                hideSelections();
                                break;
                            case 'markunplayed':
                                items.forEach(function (itemId) {
                                    apiClient.markUnplayed(apiClient.getCurrentUserId(), itemId);
                                });
                                hideSelections();
                                break;
                            case 'refresh':
                                require(['refreshDialog'], function (refreshDialog) {
                                    new refreshDialog({
                                        itemIds: items,
                                        serverId: serverId

                                    }).show();
                                });
                                hideSelections();
                                break;
                            case 'sync':
                                require(['syncDialog'], function (syncDialog) {
                                    syncDialog.showMenu({
                                        items: items.map(function (i) {
                                            return {
                                                Id: i
                                            };
                                        }),
                                        serverId: serverId
                                    });
                                });
                                hideSelections();
                                break;
                            case 'synclocal':
                                require(['syncDialog'], function (syncDialog) {
                                    syncDialog.showMenu({
                                        items: items.map(function (i) {
                                            return {
                                                Id: i
                                            };
                                        }),
                                        isLocalSync: true,
                                        serverId: serverId
                                    });
                                });
                                hideSelections();
                                break;
                            default:
                                break;
                        }
                    }
                });

            });
        });
    }

    function dispatchNeedsRefresh() {

        var elems = [];

        var selectedElems = selectedElements;

        var i, length;
        for (i = 0, length = selectedElems.length; i < length; i++) {

            var selectedElem = selectedElems[i];
            var container = dom.parentWithAttribute(selectedElem, 'is', 'emby-itemscontainer');

            if (container && elems.indexOf(container) === -1) {
                elems.push(container);
            }
        }

        for (i = 0, length = elems.length; i < length; i++) {
            elems[i].notifyRefreshNeeded(true);
        }
    }

    function combineVersions(apiClient, selection) {

        if (selection.length < 2) {

            require(['alert'], function (alert) {
                alert({
                    text: globalize.translate('PleaseSelectTwoItems')
                });
            });
            return;
        }

        loading.show();

        apiClient.ajax({

            type: "POST",
            url: apiClient.getUrl("Videos/MergeVersions", { Ids: selection.join(',') })

        }).then(function () {

            loading.hide();
            dispatchNeedsRefresh();
            hideSelections();

        }, function () {
            loading.hide();
            hideSelections();
        });
    }

    function showSelections(chkItemSelect, selected) {

        if (!chkItemSelect.classList.contains('chkCardSelect')) {
            chkItemSelect = chkItemSelect.querySelector('.chkCardSelect');
        }

        if (selected == null) {
            selected = chkItemSelect.checked;
        }
        else {
            chkItemSelect.checked = selected;
        }

        var id = dom.parentWithAttribute(chkItemSelect, 'data-id').getAttribute('data-id');
        var card = dom.parentWithClass(chkItemSelect, 'card');

        if (selected) {

            card.querySelector('.cardBox').classList.add('item-multiselected');

            var current = selectedItems.filter(function (i) {
                return i === id;
            });

            if (!current.length) {
                selectedItems.push(id);
                selectedItemsMap[id] = true;
                selectedElements.push(chkItemSelect);
            }

        } else {
            card.querySelector('.cardBox').classList.remove('item-multiselected');

            selectedItems = selectedItems.filter(function (i) {
                return i !== id;
            });
            selectedItemsMap[id] = null;
            selectedElements = selectedElements.filter(function (i) {
                return i !== chkItemSelect;
            });
        }

        var container = dom.parentWithAttribute(chkItemSelect, 'is', 'emby-itemscontainer');

        if (selectedItems.length) {
            container.classList.add('multi-select-active');

            showSelectionCommands();

            var itemSelectionCount = document.querySelector('.itemSelectionCount');
            if (itemSelectionCount) {
                itemSelectionCount.innerHTML = selectedItems.length;
            }
        } else {
            hideSelections();
        }

    }
    function onContainerClick(e) {

        if (selectedItems.length) {

            var target = e.target;

            var card = dom.parentWithClass(target, 'card');
            if (card) {

                var chkItemSelectContainer = dom.parentWithClass(target, 'chkCardSelectContainer');
                if (!chkItemSelectContainer) {
                    var chkItemSelect = card.querySelector('.chkCardSelect');

                    showSelections(chkItemSelect, !chkItemSelect.checked);

                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            }
        }
    }

    document.addEventListener('viewbeforehide', hideSelections);

    function MultiSelect(options) {

        var self = this;
    }

    MultiSelect.prototype.showSelections = showSelections;
    MultiSelect.prototype.onContainerClick = onContainerClick;

    MultiSelect.isSelected = function (id) {

        return selectedItemsMap[id];
    };

    return MultiSelect;
});