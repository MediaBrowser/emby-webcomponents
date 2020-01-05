define(['dom', 'userSettings', 'apphost', 'globalize', 'connectionManager', 'itemHelper', 'appRouter', 'playbackManager', 'loading', 'appSettings', 'browser', 'actionsheet'], function (dom, userSettings, appHost, globalize, connectionManager, itemHelper, appRouter, playbackManager, loading, appSettings, browser, actionsheet) {
    'use strict';

    function getCommands(options) {

        var commands = [];

        var item = options.item;

        if (browser.netcast && item.Type !== 'Server') {
            return commands;
        }

        var canPlay = playbackManager.canPlay(item);

        var user = options.user;

        var apiClient = connectionManager.getApiClient(item);

        var restrictOptions = ((browser.operaTv || browser.web0s || browser.netcast) && apiClient.serverId() === '6da60dd6edfc4508bca2c434d4400816') ||
            (browser.tizen && !browser.tizenSideload);

        if (canPlay && item.MediaType !== 'Photo' && item.Type !== 'Program') {
            if (options.play !== false) {
                commands.push({
                    name: globalize.translate('Play'),
                    id: 'resume',
                    icon: 'play_arrow'
                });
            }

            if (options.playAllFromHere && item.Type !== 'Program' && item.Type !== 'Recording' && item.Type !== 'TvChannel') {
                commands.push({
                    name: globalize.translate('PlayAllFromHere'),
                    id: 'playallfromhere',
                    icon: 'play_arrow'
                });
            }
        }

        if (playbackManager.canQueue(item)) {

            if (options.queue !== false) {
                commands.push({
                    name: globalize.translate('HeaderAddToPlayQueue'),
                    id: 'queue',
                    icon: 'playlist_add'
                });
            }

            if (options.queue !== false) {
                commands.push({
                    name: globalize.translate('HeaderPlayNext'),
                    id: 'queuenext',
                    icon: 'playlist_add'
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
                        id: 'shuffle',
                        icon: 'shuffle'
                    });
                }
            }
        }

        if (item.MediaType === "Audio" || item.Type === "MusicAlbum" || item.Type === "MusicArtist") {
            if (options.instantMix !== false && !itemHelper.isLocalItem(item)) {
                commands.push({
                    name: globalize.translate('HeaderInstantMix'),
                    id: 'instantmix',
                    icon: 'shuffle'
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
                    id: 'addtocollection',
                    icon: 'playlist_add'
                });
            }

            if (itemHelper.supportsAddingToPlaylist(item)) {
                commands.push({
                    name: globalize.translate('HeaderAddToPlaylist'),
                    id: 'addtoplaylist',
                    icon: 'playlist_add'
                });
            }
        }

        if (user) {
            if ((item.Type === 'Timer') && user.Policy.EnableLiveTvManagement && options.cancelTimer !== false) {
                commands.push({
                    name: globalize.translate('HeaderCancelRecording'),
                    id: 'canceltimer',
                    icon: 'fiber_manual_record'
                });
            }

            if ((item.Type === 'SeriesTimer') && user.Policy.EnableLiveTvManagement && options.cancelTimer !== false) {
                commands.push({
                    name: globalize.translate('HeaderCancelSeries'),
                    id: 'cancelseriestimer',
                    icon: 'fiber_smart_record'
                });
            }
        }

        if (item.Type === 'VirtualFolder' && user.Policy.IsAdministrator) {
            commands.push({
                name: globalize.translate('ButtonChangeContentType'),
                id: 'changelibrarycontenttype',
                icon: 'edit'
            });
        }

        if (item.Type === 'Server') {
            commands.push({
                name: globalize.translate('Connect'),
                id: 'connecttoserver',
                icon: '&#xE63E;'
            });
        }

        if (!restrictOptions) {
            if (itemHelper.canConvert(item, user, apiClient)) {
                commands.push({
                    name: globalize.translate('Convert'),
                    id: 'convert',
                    icon: 'transform'
                });
            }
        }

        if (user) {
            if (user.Policy.IsAdministrator && item.Type === 'User' && item.Id !== apiClient.getCurrentUserId()) {
                commands.push({
                    name: globalize.translate('Delete'),
                    id: 'delete',
                    icon: 'delete'
                });
            }

            if (user.Policy.IsAdministrator && item.Type === 'Device' && item.Id !== apiClient.deviceId()) {
                commands.push({
                    name: globalize.translate('Delete'),
                    id: 'delete',
                    icon: 'delete'
                });
            }
        }

        if (item.Type === 'Server') {
            commands.push({
                name: globalize.translate('Delete'),
                id: 'delete',
                icon: 'delete'
            });
        }

        if (item.CanDelete && options.deleteItem !== false) {

            if (item.Type === 'Playlist' || item.Type === 'BoxSet') {
                commands.push({
                    name: globalize.translate('Delete'),
                    id: 'delete',
                    icon: 'delete'
                });
            } else {
                commands.push({
                    name: globalize.translate('Delete'),
                    id: 'delete',
                    icon: 'delete'
                });
            }
        }

        if (!restrictOptions) {
            if (item.CanDownload && appHost.supports('filedownload')) {
                commands.push({
                    name: globalize.translate('Download'),
                    id: 'download',
                    icon: 'cloud_download'
                });
            }

            if (appHost.supports('sync') && options.syncLocal !== false) {
                if (itemHelper.canSync(user, item)) {
                    commands.push({
                        name: globalize.translate('Download'),
                        id: 'synclocal',
                        icon: 'cloud_download'
                    });
                }
            }

            if (!restrictOptions) {
                if (options.sync !== false) {
                    if (itemHelper.canSync(user, item)) {
                        commands.push({
                            name: globalize.translate('HeaderDownloadToDots'),
                            id: 'sync',
                            icon: 'cloud_download'
                        });
                    }
                }
            }

            var canEdit = itemHelper.canEdit(user, item);
            if (canEdit) {

                if (options.edit !== false && item.Type !== 'SeriesTimer') {

                    var text = (item.Type === 'Timer' || item.Type === 'SeriesTimer' || item.Type === 'User' || item.Type === 'VirtualFolder') ? globalize.translate('Edit') : globalize.translate('HeaderEditMetadata');

                    commands.push({
                        name: text,
                        id: 'edit',
                        icon: 'edit'
                    });
                }
            }

            if (itemHelper.canEditImages(user, item)) {

                if (options.editImages !== false) {
                    commands.push({
                        name: globalize.translate('HeaderEditImages'),
                        id: 'editimages',
                        icon: 'edit'
                    });
                }
            }

            if (itemHelper.canEditSubtitles(user, item)) {

                if (options.editSubtitles !== false) {
                    commands.push({
                        name: globalize.translate('HeaderEditSubtitles'),
                        id: 'editsubtitles',
                        icon: 'closed_captions'
                    });
                }
            }

            if (options.identify !== false) {
                if (itemHelper.canIdentify(user, item)) {
                    commands.push({
                        name: globalize.translate('Identify'),
                        id: 'identify',
                        icon: 'edit'
                    });
                }
            }

            if (options.multiSelect) {
                commands.push({
                    name: globalize.translate('MultiSelect'),
                    id: 'multiselect',
                    icon: 'select_all'
                });
            }

            if (itemHelper.canRefreshMetadata(item, user)) {
                commands.push({
                    name: globalize.translate('HeaderRefreshMetadata'),
                    id: 'refresh',
                    icon: 'refresh'
                });
            }
        }

        if (item.PlaylistItemId && options.playlistId) {
            commands.push({
                name: globalize.translate('HeaderRemoveFromPlaylist'),
                id: 'removefromplaylist',
                icon: 'remove_circle'
            });
        }

        if (options.collectionId) {
            commands.push({
                name: globalize.translate('HeaderRemoveFromCollection'),
                id: 'removefromcollection',
                icon: 'remove_circle'
            });
        }

        if (item.Type === 'Plugin' && user.Policy.IsAdministrator && item.ConfigPageUrl) {
            commands.push({
                name: globalize.translate('Settings'),
                id: 'open',
                icon: 'settings'
            });
        }

        if (user) {
            if (item.Type === 'VirtualFolder' && user.Policy.IsAdministrator) {
                commands.push({
                    name: globalize.translate('Remove'),
                    id: 'removelibrary',
                    icon: 'remove_circle'
                });
                commands.push({
                    name: globalize.translate('Rename'),
                    id: 'renamelibrary',
                    icon: 'edit'
                });
            }

            if (itemHelper.canRefreshMetadata(item, user) && item.IsFolder &&
                item.Type !== 'Playlist' &&
                item.Type !== 'Genre' &&
                item.Type !== 'MusicGenre' &&
                item.Type !== 'GameGenre' &&
                item.Type !== 'Channel' &&
                item.Type !== 'MusicArtist') {
                commands.push({
                    name: globalize.translate('HeaderScanLibraryFiles'),
                    id: 'scan',
                    icon: 'search'
                });
            }
        }

        if (!restrictOptions) {
            if (options.share !== false) {
                if (itemHelper.canShare(item, user)) {
                    commands.push({
                        name: globalize.translate('Share'),
                        id: 'share',
                        icon: 'share'
                    });
                }
            }
        }

        if ((item.Type === 'Recording' && item.Status === 'InProgress') && user.Policy.EnableLiveTvManagement && options.cancelTimer !== false) {
            commands.push({
                name: globalize.translate('HeaderStopRecording'),
                id: 'canceltimer',
                icon: 'fiber_manual_record'
            });
        }

        if (item.Type === 'Plugin' && user.Policy.IsAdministrator) {
            commands.push({
                name: globalize.translate('Uninstall'),
                id: 'delete',
                icon: 'delete'
            });
        }

        if (options.openAlbum !== false && item.AlbumId && item.MediaType !== 'Photo') {
            commands.push({
                name: globalize.translate('HeaderViewAlbum'),
                id: 'album',
                icon: '&#xE019;'
            });
        }

        if (options.openArtist !== false && item.ArtistItems && item.ArtistItems.length) {
            commands.push({
                name: globalize.translate('HeaderViewArtist'),
                id: 'artist',
                icon: '&#xE7FD;'
            });
        }

        if (item.Type === 'Server') {
            if (apiClient.supportsWakeOnLan()) {
                commands.push({
                    name: globalize.translate('HeaderWakeServer'),
                    id: 'wakeserver',
                    icon: '&#xE63E;'
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
        var apiClient = connectionManager.getApiClient(item);

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
                    return wakeServer(apiClient, item).then(getResolveFn(id), getResolveFn(id));
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
            case 'share':
                {
                    return navigator.share({
                        title: item.Name,
                        text: item.Overview,

                        url: item.Type === 'Photo' ? apiClient.getItemDownloadUrl(item.Id) : apiClient.getUrl('share').replace('/share', '')

                    }).then(getResolveFn(id));
                }
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
                        require(['multi-download'], function (multiDownload) {

                            var downloadHref = apiClient.getItemDownloadUrl(itemId, options.mediaSourceId);

                            multiDownload([downloadHref]);
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

                return ApiClient.removeVirtualFolder(virtualFolder, refreshAfterChange);
            });
        });
    }

    function renameVirtualFolder(apiClient, virtualFolder, button) {

        return require(['prompt']).then(function (responses) {

            var prompt = responses[0];

            return prompt({
                label: globalize.translate('LabelNewName'),
                confirmText: globalize.translate('ButtonRename'),
                value: virtualFolder.Name

            }).then(function (newName) {

                if (newName && newName !== virtualFolder.Name) {

                    var refreshAfterChange = dom.parentWithClass(button, 'page').getAttribute('data-refreshlibrary') === 'true';

                    return ApiClient.renameVirtualFolder(virtualFolder, newName, refreshAfterChange);
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

            return new medialibraryeditor().show({

                refresh: refreshLibrary,
                library: item

            });
        });
    }

    function editItem(apiClient, item, button) {

        var serverId = apiClient.serverId();

        if (item.Type === 'Device' || item.Type === 'User') {

            appRouter.showItem(item);
            return Promise.resolve();
        }

        if (item.Type === 'Timer') {
            return require(['recordingEditor']).then(function (responses) {

                return responses[0].show(item.Id, serverId);
            });
        }

        if (item.Type === 'VirtualFolder') {

            return editVirtualFolder(item, button);
        }

        if (item.Type === 'SeriesTimer') {
            return require(['seriesRecordingEditor']).then(function (responses) {

                return responses[0].show(item.Id, serverId);
            });
        }

        return require(['metadataEditor']).then(function (responses) {

            return responses[0].show(item.Id, serverId);
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

        return require(['loadingDialog']).then(function (responses) {

            var LoadingDialog = responses[0];

            var dlg = new LoadingDialog({
                title: globalize.translate('HeaderWakeServer'),
                text: globalize.translate('AttemptingWakeServer')
            });

            var showDialogPromise = dlg.show();

            var state = {
                dlg: dlg,
                showDialogPromise: showDialogPromise
            };

            return sendWake(apiClient).then(onWolSuccess.bind(state), onWolFail.bind(state));
        });
    }

    function setTimeoutPromise(timeMs) {

        return new Promise(function (resolve, reject) {

            setTimeout(resolve, timeMs);
        });
    }

    function afterWakeAttempt() {
        var apiClient = this;
        return setTimeoutPromise(12000).then(function () {
            return apiClient.getPublicSystemInfo();
        });
    }

    function sendWake(apiClient) {

        var afterWol = afterWakeAttempt.bind(apiClient);

        return apiClient.wakeOnLan().then(afterWol, afterWol);
    }

    function getResolvedPromise() {
        return Promise.resolve();
    }

    function onWolSuccess() {

        var state = this;

        var promise = state.showDialogPromise.then(function () {

            return require(['alert']).then(function (responses) {
                return responses[0]({
                    text: globalize.translate('WakeServerSuccess'),
                    title: globalize.translate('HeaderWakeServer')

                }).catch(getResolvedPromise);
            });
        });

        var dlg = state.dlg;
        dlg.hide();
        dlg.destroy();

        return promise;
    }

    function onWolFail() {

        var state = this;

        var promise = state.showDialogPromise.then(function () {

            return require(['alert']).then(function (responses) {
                return responses[0]({
                    text: globalize.translate('WakeServerError'),
                    title: globalize.translate('HeaderWakeServer')

                }).catch(getResolvedPromise);
            });
        });

        var dlg = state.dlg;
        dlg.hide();
        dlg.destroy();

        return promise;
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