define(['browser', 'appStorage', 'apphost', 'loading', 'connectionManager', 'globalize', 'appRouter', 'dom', 'css!./multiselect'], function (browser, appStorage, appHost, loading, connectionManager, globalize, appRouter, dom) {
    'use strict';

    var selectedItems = [];
    var selectedElements = [];
    var currentSelectionCommandsPanel;

    function hideSelections() {

        var selectionCommandsPanel = currentSelectionCommandsPanel;
        if (selectionCommandsPanel) {

            selectionCommandsPanel.parentNode.removeChild(selectionCommandsPanel);
            currentSelectionCommandsPanel = null;

            selectedItems = [];
            selectedElements = [];
            var elems = document.querySelectorAll('.itemSelectionPanel');
            for (var i = 0, length = elems.length; i < length; i++) {

                var parent = elems[i].parentNode;
                parent.removeChild(elems[i]);
                parent.classList.remove('withMultiSelect');
            }
        }
    }

    function onItemSelectionPanelClick(e, itemSelectionPanel) {

        // toggle the checkbox, if it wasn't clicked on

        var chkItemSelect = dom.parentWithClass(e.target, 'chkItemSelect');
        if (!chkItemSelect) {
            chkItemSelect = itemSelectionPanel.querySelector('.chkItemSelect');
        }

        if (chkItemSelect) {

            var newValue = !chkItemSelect.checked;
            chkItemSelect.checked = newValue;
            updateItemSelection(chkItemSelect, newValue);
        }

        e.preventDefault();
        e.stopPropagation();
        return false;
    }

    function updateItemSelection(chkItemSelect, selected) {

        var id = dom.parentWithAttribute(chkItemSelect, 'data-id').getAttribute('data-id');

        if (selected) {

            var current = selectedItems.filter(function (i) {
                return i === id;
            });

            if (!current.length) {
                selectedItems.push(id);
                selectedElements.push(chkItemSelect);
            }

        } else {
            selectedItems = selectedItems.filter(function (i) {
                return i !== id;
            });
            selectedElements = selectedElements.filter(function (i) {
                return i !== chkItemSelect;
            });
        }

        if (selectedItems.length) {
            var itemSelectionCount = document.querySelector('.itemSelectionCount');
            if (itemSelectionCount) {
                itemSelectionCount.innerHTML = selectedItems.length;
            }
        } else {
            hideSelections();
        }
    }

    function onSelectionChange(e) {
        updateItemSelection(this, this.checked);
    }

    function showSelection(item, isChecked) {

        var itemSelectionPanel = item.querySelector('.itemSelectionPanel');

        if (!itemSelectionPanel) {

            itemSelectionPanel = document.createElement('div');
            itemSelectionPanel.classList.add('itemSelectionPanel');

            var parent = item.querySelector('.cardBox') || item.querySelector('.cardContent');
            parent.classList.add('withMultiSelect');
            parent.appendChild(itemSelectionPanel);

            var cssClass = 'chkItemSelect';
            var checkedAttribute = isChecked ? ' checked' : '';
            itemSelectionPanel.innerHTML = '<label class="checkboxContainer"><input type="checkbox" is="emby-checkbox" data-outlineclass="multiSelectCheckboxOutline" class="' + cssClass + '"' + checkedAttribute + '/><span></span></label>';
            var chkItemSelect = itemSelectionPanel.querySelector('.chkItemSelect');
            chkItemSelect.addEventListener('change', onSelectionChange);
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

    function showMenuForSelectedItems(e) {

        var apiClient = connectionManager.currentApiClient();

        apiClient.getCurrentUser().then(function (user) {

            var menuItems = [];

            menuItems.push({
                name: globalize.translate('AddToCollection'),
                id: 'addtocollection',
                ironIcon: 'add'
            });

            menuItems.push({
                name: globalize.translate('AddToPlaylist'),
                id: 'playlist',
                ironIcon: 'playlist-add'
            });

            // TODO: Be more dynamic based on what is selected
            if (user.Policy.EnableContentDeletion) {
                menuItems.push({
                    name: globalize.translate('Delete'),
                    id: 'delete',
                    ironIcon: 'delete'
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
                    id: 'synclocal'
                });
            }

            menuItems.push({
                name: globalize.translate('GroupVersions'),
                id: 'groupvideos',
                ironIcon: 'call-merge'
            });

            menuItems.push({
                name: globalize.translate('MarkPlayed'),
                id: 'markplayed'
            });

            menuItems.push({
                name: globalize.translate('MarkUnplayed'),
                id: 'markunplayed'
            });

            menuItems.push({
                name: globalize.translate('RefreshMetadata'),
                id: 'refresh'
            });

            if (user.Policy.EnableContentDownloading) {
                menuItems.push({
                    name: globalize.translate('Sync'),
                    id: 'sync'
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
                                require(['collectionEditor'], function (collectionEditor) {

                                    new collectionEditor().show({
                                        items: items,
                                        serverId: serverId
                                    });
                                });
                                hideSelections();
                                break;
                            case 'playlist':
                                require(['playlistEditor'], function (playlistEditor) {
                                    new playlistEditor().show({
                                        items: items,
                                        serverId: serverId
                                    });
                                });
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

    function showSelections(initialCard) {

        require(['emby-checkbox'], function () {
            var cards = document.querySelectorAll('.card');
            for (var i = 0, length = cards.length; i < length; i++) {
                showSelection(cards[i], initialCard === cards[i]);
            }

            showSelectionCommands();
            updateItemSelection(initialCard, true);
        });
    }

    function onContainerClick(e) {

        var target = e.target;

        if (selectedItems.length) {

            var card = dom.parentWithClass(target, 'card');
            if (card) {
                var itemSelectionPanel = card.querySelector('.itemSelectionPanel');
                if (itemSelectionPanel) {
                    return onItemSelectionPanelClick(e, itemSelectionPanel);
                }
            }

            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }

    document.addEventListener('viewbeforehide', hideSelections);

    return function (options) {

        var self = this;

        var container = options.container;

        if (options.bindOnClick !== false) {
            container.addEventListener('click', onContainerClick);
        }

        self.showSelections = showSelections;

        self.onContainerClick = onContainerClick;

        self.destroy = function () {

            container.removeEventListener('click', onContainerClick);
        };
    };
});