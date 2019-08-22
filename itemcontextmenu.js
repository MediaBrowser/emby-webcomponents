define(['dom', 'apphost', 'globalize', 'connectionManager', 'itemHelper', 'appRouter', 'playbackManager', 'loading', 'appSettings', 'browser', 'actionsheet'], function (dom, appHost, globalize, connectionManager, itemHelper, appRouter, playbackManager, loading, appSettings, browser, actionsheet) {
    'use strict';

    function getCommands(options) {

        var item = options.item;

        var canPlay = playbackManager.canPlay(item);

        var commands = [];

        var user = options.user;

        var apiClient = connectionManager.getApiClient(item);

        var restrictOptions = ((browser.operaTv || browser.web0s) && apiClient.serverId() === '6da60dd6edfc4508bca2c434d4400816' && !user.Policy.IsAdministrator) ||
            (browser.tizen && !browser.tizenSideload);

        if (canPlay && item.MediaType !== 'Photo' && item.Type !== 'Program') {
            if (options.play !== false) {
                commands.push({
                    name: globalize.translate('Play'),
                    id: 'resume'
                });
            }

            if (options.playAllFromHere && item.Type !== 'Program' && item.Type !== 'Recording' && item.Type !== 'TvChannel') {
                commands.push({
                    name: globalize.translate('PlayAllFromHere'),
                    id: 'playallfromhere'
                });
            }
        }

        if (playbackManager.canQueue(item)) {

            if (options.queue !== false) {
                commands.push({
                    name: globalize.translate('HeaderAddToPlayQueue'),
                    id: 'queue'
                });
            }

            if (options.queue !== false) {
                commands.push({
                    name: globalize.translate('HeaderPlayNext'),
                    id: 'queuenext'
                });
            }

            //if (options.queueAllFromHere) {
            //    commands.push({
            //        name: globalize.translate('QueueAllFromHere'),
            //        id: 'queueallfromhere'
            //    });
            //}
        }

        if (item.IsFolder || item.Type === "MusicArtist" || item.Type === "MusicGenre") {
            if (item.CollectionType !== 'livetv') {
                if (canPlay && options.shuffle !== false) {
                    commands.push({
                        name: globalize.translate('Shuffle'),
                        id: 'shuffle'
                    });
                }
            }
        }

        if (item.MediaType === "Audio" || item.Type === "MusicAlbum" || item.Type === "MusicArtist") {
            if (options.instantMix !== false && !itemHelper.isLocalItem(item)) {
                commands.push({
                    name: globalize.translate('HeaderInstantMix'),
                    id: 'instantmix'
                });
            }
        }

        if (commands.length) {
            commands.push({
                divider: true
            });
        }

        if (!restrictOptions) {
            if (itemHelper.supportsAddingToCollection(item)) {
                commands.push({
                    name: globalize.translate('HeaderAddToCollection'),
                    id: 'addtocollection'
                });
            }

            if (itemHelper.supportsAddingToPlaylist(item)) {
                commands.push({
                    name: globalize.translate('HeaderAddToPlaylist'),
                    id: 'addtoplaylist'
                });
            }
        }

        if (user) {
            if ((item.Type === 'Timer') && user.Policy.EnableLiveTvManagement && options.cancelTimer !== false) {
                commands.push({
                    name: globalize.translate('HeaderCancelRecording'),
                    id: 'canceltimer'
                });
            }

            if ((item.Type === 'SeriesTimer') && user.Policy.EnableLiveTvManagement && options.cancelTimer !== false) {
                commands.push({
                    name: globalize.translate('HeaderCancelSeries'),
                    id: 'cancelseriestimer'
                });
            }
        }

        if (item.Type === 'VirtualFolder' && user.Policy.IsAdministrator) {
            commands.push({
                name: globalize.translate('ButtonChangeContentType'),
                id: 'changelibrarycontenttype'
            });
        }

        if (item.Type === 'Server') {
            commands.push({
                name: globalize.translate('Connect'),
                id: 'connecttoserver'
            });
        }

        if (!restrictOptions) {
            if (itemHelper.canConvert(item, user, apiClient)) {
                commands.push({
                    name: globalize.translate('Convert'),
                    id: 'convert'
                });
            }
        }

        if (user) {
            if (user.Policy.IsAdministrator && item.Type === 'User' && item.Id !== apiClient.getCurrentUserId()) {
                commands.push({
                    name: globalize.translate('Delete'),
                    id: 'delete'
                });
            }

            if (user.Policy.IsAdministrator && item.Type === 'Device' && item.Id !== apiClient.deviceId()) {
                commands.push({
                    name: globalize.translate('Delete'),
                    id: 'delete'
                });
            }
        }

        if (item.Type === 'Server') {
            commands.push({
                name: globalize.translate('Delete'),
                id: 'delete'
            });
        }

        if (item.CanDelete && options.deleteItem !== false) {

            if (item.Type === 'Playlist' || item.Type === 'BoxSet') {
                commands.push({
                    name: globalize.translate('Delete'),
                    id: 'delete'
                });
            } else {
                commands.push({
                    name: globalize.translate('Delete'),
                    id: 'delete'
                });
            }
        }

        if (!restrictOptions) {
            if (item.CanDownload && appHost.supports('filedownload')) {
                commands.push({
                    name: globalize.translate('Download'),
                    id: 'download'
                });
            }

            if (appHost.supports('sync') && options.syncLocal !== false) {
                if (itemHelper.canSync(user, item)) {
                    commands.push({
                        name: globalize.translate('Download'),
                        id: 'synclocal'
                    });
                }
            }

            var canEdit = itemHelper.canEdit(user, item);
            if (canEdit) {

                if (options.edit !== false && item.Type !== 'SeriesTimer') {

                    var text = (item.Type === 'Timer' || item.Type === 'SeriesTimer' || item.Type === 'User' || item.Type === 'VirtualFolder') ? globalize.translate('Edit') : globalize.translate('HeaderEditMetadata');

                    commands.push({
                        name: text,
                        id: 'edit'
                    });
                }
            }

            if (itemHelper.canEditImages(user, item)) {

                if (options.editImages !== false) {
                    commands.push({
                        name: globalize.translate('HeaderEditImages'),
                        id: 'editimages'
                    });
                }
            }

            if (itemHelper.canEditSubtitles(user, item)) {

                if (options.editSubtitles !== false) {
                    commands.push({
                        name: globalize.translate('HeaderEditSubtitles'),
                        id: 'editsubtitles'
                    });
                }
            }

            if (options.identify !== false) {
                if (itemHelper.canIdentify(user, item)) {
                    commands.push({
                        name: globalize.translate('Identify'),
                        id: 'identify'
                    });
                }
            }

            if (options.multiSelect) {
                commands.push({
                    name: globalize.translate('MultiSelect'),
                    id: 'multiselect'
                });
            }

            if (itemHelper.canRefreshMetadata(item, user)) {
                commands.push({
                    name: globalize.translate('HeaderRefreshMetadata'),
                    id: 'refresh'
                });
            }
        }

        if (item.PlaylistItemId && options.playlistId) {
            commands.push({
                name: globalize.translate('HeaderRemoveFromPlaylist'),
                id: 'removefromplaylist'
            });
        }

        if (options.collectionId) {
            commands.push({
                name: globalize.translate('HeaderRemoveFromCollection'),
                id: 'removefromcollection'
            });
        }

        if (item.Type === 'Plugin' && user.Policy.IsAdministrator && item.ConfigPageUrl) {
            commands.push({
                name: globalize.translate('Settings'),
                id: 'open'
            });
        }

        if (user) {
            if (item.Type === 'VirtualFolder' && user.Policy.IsAdministrator) {
                commands.push({
                    name: globalize.translate('Remove'),
                    id: 'removelibrary'
                });
                commands.push({
                    name: globalize.translate('Rename'),
                    id: 'renamelibrary'
                });
            }

            if (itemHelper.canRefreshMetadata(item, user) && (item.CollectionType || item.Type === 'CollectionFolder')) {
                commands.push({
                    name: globalize.translate('HeaderScanLibraryFiles'),
                    id: 'scan'
                });
            }
        }

        if (!restrictOptions) {
            if (options.share !== false) {
                if (itemHelper.canShare(item, user)) {
                    commands.push({
                        name: globalize.translate('Share'),
                        id: 'share'
                    });
                }
            }
        }

        if ((item.Type === 'Recording' && item.Status === 'InProgress') && user.Policy.EnableLiveTvManagement && options.cancelTimer !== false) {
            commands.push({
                name: globalize.translate('HeaderStopRecording'),
                id: 'canceltimer'
            });
        }

        if (!restrictOptions) {
            if (options.sync !== false) {
                if (itemHelper.canSync(user, item)) {
                    commands.push({
                        name: globalize.translate('Sync'),
                        id: 'sync'
                    });
                }
            }
        }

        if (item.Type === 'Plugin' && user.Policy.IsAdministrator) {
            commands.push({
                name: globalize.translate('Uninstall'),
                id: 'delete'
            });
        }

        if (options.openAlbum !== false && item.AlbumId && item.MediaType !== 'Photo') {
            commands.push({
                name: globalize.translate('HeaderViewAlbum'),
                id: 'album'
            });
        }

        if (options.openArtist !== false && item.ArtistItems && item.ArtistItems.length) {
            commands.push({
                name: globalize.translate('HeaderViewArtist'),
                id: 'artist'
            });
        }

        if (item.Type === 'Server') {
            if (apiClient.supportsWakeOnLan()) {
                commands.push({
                    name: globalize.translate('HeaderWakeServer'),
                    id: 'wakeserver'
                });
            }
        }

        return commands;
    }

    function getResolveFunction(resolve, id, changed, deleted) {

        return function () {
            resolve({
                command: id,
                updated: changed,
                deleted: deleted
            });
        };
    }

    function getResolveFn(id, changed, deleted) {

        return function () {
            return Promise.resolve({
                command: id,
                updated: changed,
                deleted: deleted
            });
        };
    }

    function executeCommand(item, id, options) {

        var itemId = item.Id;
        var serverId = item.ServerId;
        var apiClient = connectionManager.getApiClient(serverId);

        switch (id) {

            case 'edit':
                {
                    return editItem(apiClient, item, options.positionTo).then(getResolveFn(id, true), getResolveFn(id));
                }
            case 'renamelibrary':
                return renameVirtualFolder(apiClient, item, options.positionTo).then(getResolveFn(id, true), getResolveFn(id));
            case 'removelibrary':
                return deleteVirtualFolder(apiClient, item, options.positionTo).then(getResolveFn(id, true, true), getResolveFn(id));
            case 'changelibrarycontenttype':
                return changeVirtualFolderContentType(apiClient, item, options.positionTo).then(getResolveFn(id), getResolveFn(id));
            case 'playallfromhere':
                {
                    return getResolveFn(id)();
                }
            case 'queueallfromhere':
                {
                    return getResolveFn(id)();
                }
            case 'wakeserver':
                {
                    wakeServer(apiClient, item);
                    return getResolveFn(id)();
                }
            case 'connecttoserver':
                {
                    connectToServer(apiClient, item);
                    return getResolveFn(id)();
                }
            case 'open':
                {
                    appRouter.showItem(item);
                    return getResolveFn(id)();
                }
            case 'play':
                {
                    play(item, false);
                    return getResolveFn(id)();
                }
            case 'resume':
                {
                    play(item, true);
                    return getResolveFn(id)();
                }
            case 'queue':
                {
                    play(item, false, true);
                    return getResolveFn(id)();
                }
            case 'queuenext':
                {
                    play(item, false, true, true);
                    return getResolveFn(id)();
                }
            case 'shuffle':
                {
                    playbackManager.shuffle(item);
                    return getResolveFn(id)();
                }
            case 'instantmix':
                {
                    playbackManager.instantMix(item);
                    return getResolveFn(id)();
                }
            case 'album':
                {
                    appRouter.showItem(item.AlbumId, item.ServerId);
                    return getResolveFn(id)();
                }
            case 'artist':
                {
                    appRouter.showItem(item.ArtistItems[0].Id, item.ServerId);
                    return getResolveFn(id)();
                }
            case 'canceltimer':
                return deleteTimer(apiClient, item).then(getResolveFn(id, true, true), getResolveFn(id));
            case 'cancelseriestimer':
                return deleteSeriesTimer(apiClient, item).then(getResolveFn(id, true, true), getResolveFn(id));
            case 'refresh':
                {
                    refresh(apiClient, item);
                    return getResolveFn(id)();
                }
            case 'scan':
                {
                    scanFolder(apiClient, item);
                    return getResolveFn(id)();
                }
            case 'delete':
                {
                    return deleteItem(apiClient, item).then(getResolveFn(id, true, true), getResolveFn(id));
                }
            case 'multiselect':
                showMultiSelect(apiClient, item, options);
                return getResolveFn(id)();
            default:
                break;
        }

        return new Promise(function (resolve, reject) {

            switch (id) {

                case 'addtocollection':
                    {
                        require(['collectionEditor'], function (collectionEditor) {

                            new collectionEditor().show({
                                items: [itemId],
                                serverId: serverId

                            }).then(getResolveFunction(resolve, id, true), getResolveFunction(resolve, id));
                        });
                        break;
                    }
                case 'addtoplaylist':
                    {
                        require(['playlistEditor'], function (playlistEditor) {

                            new playlistEditor().show({
                                items: [itemId],
                                serverId: serverId

                            }).then(getResolveFunction(resolve, id, true), getResolveFunction(resolve, id));
                        });
                        break;
                    }
                case 'download':
                    {
                        require(['fileDownloader'], function (fileDownloader) {
                            var downloadHref = apiClient.getItemDownloadUrl(itemId, options.mediaSourceId);

                            fileDownloader.download([
                                {
                                    url: downloadHref,
                                    itemId: itemId,
                                    serverId: serverId
                                }]);

                            getResolveFunction(getResolveFunction(resolve, id), id)();
                        });

                        break;
                    }
                case 'editsubtitles':
                    {
                        require(['subtitleEditor'], function (subtitleEditor) {

                            subtitleEditor.show(itemId, serverId).then(getResolveFunction(resolve, id, true), getResolveFunction(resolve, id));
                        });
                        break;
                    }
                case 'editimages':
                    {
                        require(['imageEditor'], function (imageEditor) {

                            imageEditor.show({
                                itemId: itemId,
                                serverId: serverId

                            }).then(getResolveFunction(resolve, id, true), getResolveFunction(resolve, id));
                        });
                        break;
                    }
                case 'identify':
                    {
                        require(['itemIdentifier'], function (itemIdentifier) {

                            itemIdentifier.show(itemId, serverId).then(getResolveFunction(resolve, id, true), getResolveFunction(resolve, id));
                        });
                        break;
                    }
                case 'share':
                    {
                        navigator.share({
                            title: item.Name,
                            text: item.Overview,

                            url: item.Type === 'Photo' ? apiClient.getItemDownloadUrl(item.Id) : apiClient.getUrl('share').replace('/share', '')
                        });
                        break;
                    }
                case 'convert':
                    {
                        require(['syncDialog'], function (syncDialog) {
                            syncDialog.showMenu({
                                items: [item],
                                serverId: serverId,
                                mode: 'convert'
                            });
                        });
                        getResolveFunction(resolve, id)();
                        break;
                    }
                case 'sync':
                    {
                        require(['syncDialog'], function (syncDialog) {
                            syncDialog.showMenu({
                                items: [item],
                                serverId: serverId,
                                mode: 'sync'
                            });
                        });
                        getResolveFunction(resolve, id)();
                        break;
                    }
                case 'synclocal':
                    {
                        require(['syncDialog'], function (syncDialog) {
                            syncDialog.showMenu({
                                items: [item],
                                serverId: serverId,
                                mode: 'download'
                            });
                        });
                        getResolveFunction(resolve, id)();
                        break;
                    }
                case 'removefromplaylist':

                    apiClient.ajax({

                        url: apiClient.getUrl('Playlists/' + options.playlistId + '/Items', {
                            EntryIds: [item.PlaylistItemId].join(',')
                        }),

                        type: 'DELETE'

                    }).then(function () {

                        getResolveFunction(resolve, id, true)();
                    });

                    break;
                case 'removefromcollection':

                    apiClient.ajax({
                        type: "DELETE",
                        url: apiClient.getUrl("Collections/" + options.collectionId + "/Items", {

                            Ids: [item.Id].join(',')
                        })

                    }).then(function () {

                        getResolveFunction(resolve, id, true)();
                    });

                    break;
                default:
                    reject();
                    break;
            }
        });
    }

    function changeVirtualFolderContentType(page, virtualFolder) {

        return require(['alert']).then(function (responses) {
            var alert = responses[0];

            return alert({
                title: globalize.translate('HeaderChangeFolderType'),
                text: globalize.translate('HeaderChangeFolderTypeHelp')
            });
        });
    }

    function deleteVirtualFolder(apiClient, virtualFolder, button) {

        var msg = globalize.translate('MessageAreYouSureYouWishToRemoveMediaFolder');

        if (virtualFolder.Locations.length) {
            msg += "<br/><br/>" + globalize.translate("MessageTheFollowingLocationWillBeRemovedFromLibrary") + "<br/><br/>";
            msg += virtualFolder.Locations.join("<br/>");
        }

        return require(['confirm']).then(function (responses) {

            var confirm = responses[0];

            return confirm(msg, globalize.translate('HeaderRemoveMediaFolder')).then(function () {

                var refreshAfterChange = dom.parentWithClass(button, 'page').getAttribute('data-refreshlibrary') === 'true';

                return ApiClient.removeVirtualFolder(virtualFolder.Name, refreshAfterChange);
            });
        });
    }

    function renameVirtualFolder(apiClient, virtualFolder, button) {

        return require(['prompt']).then(function (responses) {

            var prompt = responses[0];

            return prompt({
                label: globalize.translate('LabelNewName'),
                confirmText: globalize.translate('ButtonRename')

            }).then(function (newName) {

                if (newName && newName !== virtualFolder.Name) {

                    var refreshAfterChange = dom.parentWithClass(button, 'page').getAttribute('data-refreshlibrary') === 'true';

                    return ApiClient.renameVirtualFolder(virtualFolder.Name, newName, refreshAfterChange);
                }
            });

        });
    }

    function showMultiSelect(apiClient, item, options) {

        var itemsContainer = dom.parentWithClass(options.positionTo, 'itemsContainer');
        itemsContainer.showMultiSelect(options.positionTo);
    }

    function deleteTimer(apiClient, item) {

        return require(['recordingHelper']).then(function (responses) {

            var timerId = item.TimerId || item.Id;

            var recordingHelper = responses[0];

            return recordingHelper.cancelTimerWithConfirmation(timerId, item.ServerId);
        });
    }

    function deleteSeriesTimer(apiClient, item) {

        return require(['recordingHelper']).then(function (responses) {

            var recordingHelper = responses[0];

            return recordingHelper.cancelSeriesTimerWithConfirmation(item.Id, item.ServerId);
        });
    }

    function play(item, resume, queue, queueNext) {

        var method = queue ? (queueNext ? 'queueNext' : 'queue') : 'play';

        var startPosition = item.StartPositionTicks || 0;
        if (resume) {
            startPosition = null;
        }

        if (item.Type === 'Program') {
            playbackManager[method]({
                ids: [item.ChannelId],
                startPositionTicks: startPosition,
                serverId: item.ServerId
            });
        } else {
            playbackManager[method]({
                items: [item],
                startPositionTicks: startPosition
            });
        }
    }

    function editVirtualFolder(item, button) {

        var view = dom.parentWithClass(button, 'page');
        var refreshLibrary = button ? view.getAttribute('data-refreshlibrary') === 'true' : false;

        return require(['medialibraryeditor']).then(function (responses) {

            var medialibraryeditor = responses[0];

            new medialibraryeditor().show({

                refresh: refreshLibrary,
                library: item

            });
        });
    }

    function editItem(apiClient, item, button) {

        return new Promise(function (resolve, reject) {

            var serverId = apiClient.serverInfo().Id;

            if (item.Type === 'Device' || item.Type === 'User') {

                appRouter.showItem(item);

            } else if (item.Type === 'Timer') {
                require(['recordingEditor'], function (recordingEditor) {

                    recordingEditor.show(item.Id, serverId).then(resolve, reject);
                });
            } else if (item.Type === 'VirtualFolder') {

                editVirtualFolder(item, button).then(resolve, reject);

            } else if (item.Type === 'SeriesTimer') {
                require(['seriesRecordingEditor'], function (recordingEditor) {

                    recordingEditor.show(item.Id, serverId).then(resolve, reject);
                });
            } else {
                require(['metadataEditor'], function (metadataEditor) {

                    metadataEditor.show(item.Id, serverId).then(resolve, reject);
                });
            }
        });
    }

    function deleteItem(apiClient, item) {

        return new Promise(function (resolve, reject) {

            require(['deleteHelper'], function (deleteHelper) {

                deleteHelper.deleteItem({

                    item: item,
                    navigate: false

                }).then(function () {

                    resolve(true);

                }, reject);

            });
        });
    }

    function connectToServer(apiClient, item) {

        loading.show();

        if (item.Type === 'AddServer') {
            return appRouter.showItem(item);
        }
        if (item.Type === 'EmbyConnect') {
            return appRouter.showConnectLogin();
        }

        // get the full object
        item = connectionManager.getServerInfo(item.Id) || item;

        connectionManager.connectToServer(item, {
            enableAutoLogin: appSettings.enableAutoLogin()

        }).then(function (result) {

            appRouter.handleConnectionResult(result);
        });
    }

    function wakeServer(apiClient, item) {

        require(['loadingDialog'], function (LoadingDialog) {

            var dlg = new LoadingDialog({
                title: globalize.translate('HeaderWakeServer'),
                text: globalize.translate('AttemptingWakeServer')
            });
            dlg.show();

            var afterWol = function () {
                setTimeout(function () {


                    apiClient.getPublicSystemInfo().then(onWolSuccess.bind(dlg), onWolFail.bind(dlg));

                }, 12000);
            };

            apiClient.wakeOnLan().then(afterWol, afterWol);
        });
    }

    function onWolSuccess() {

        var dlg = this;
        dlg.hide();
        dlg.destroy();

        require(['alert'], function (alert) {
            alert({
                text: globalize.translate('WakeServerSuccess'),
                title: globalize.translate('HeaderWakeServer')
            });
        });
    }

    function onWolFail() {

        var dlg = this;
        dlg.hide();
        dlg.destroy();

        require(['alert'], function (alert) {
            alert({
                text: globalize.translate('WakeServerError'),
                title: globalize.translate('HeaderWakeServer')
            });
        });
    }

    function refresh(apiClient, item, mode) {

        require(['refreshDialog'], function (refreshDialog) {
            new refreshDialog({
                itemIds: [item.Id],
                serverId: apiClient.serverInfo().Id,
                mode: mode
            }).show();
        });
    }

    function scanFolder(apiClient, item) {

        apiClient.refreshItem(item.Id, {

            Recursive: true,
            ImageRefreshMode: 'Default',
            MetadataRefreshMode: 'Default',
            ReplaceAllImages: false,
            ReplaceAllMetadata: false
        });
    }

    function show(options) {

        var commands = getCommands(options);

        if (!commands.length) {
            return Promise.reject();
        }

        return actionsheet.show({

            items: commands,
            positionTo: options.positionTo,

            resolveOnClick: ['share']

        }).then(function (id) {
            return executeCommand(options.item, id, options);
        });
    }

    return {
        getCommands: getCommands,
        show: show
    };
});