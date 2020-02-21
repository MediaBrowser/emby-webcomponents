define(['appSettings', 'layoutManager', 'playbackManager', 'inputManager', 'connectionManager', 'appRouter', 'globalize', 'loading', 'dom', 'recordingHelper'], function (appSettings, layoutManager, playbackManager, inputManager, connectionManager, appRouter, globalize, loading, dom, recordingHelper) {
    'use strict';

    function playAllFromHere(card, itemId, serverId, queue) {

        var startIndex = parseInt(card.getAttribute('data-index'));

        var itemsContainer = dom.parentWithClass(card, 'itemsContainer');
        if (itemsContainer && itemsContainer.fetchData) {

            var limit = 1000;
            var fetchAll = !queue && startIndex < limit;
            var queryOptions = fetchAll ? { Limit: limit } : { StartIndex: startIndex, Limit: limit };

            return itemsContainer.fetchData(queryOptions).then(function (result) {

                if (queue) {
                    return playbackManager.queue({
                        items: result.Items || result
                    });
                } else {

                    return playbackManager.play({
                        items: result.Items || result,
                        startIndex: fetchAll ? startIndex : null
                    });
                }
            });
        }

        var parent = card.parentNode;
        var className = card.classList.length ? ('.' + card.classList[0]) : '';
        var cards = parent.querySelectorAll(className + '[data-id]');

        var ids = [];

        var foundCard = false;

        for (var i = 0, length = cards.length; i < length; i++) {
            if (cards[i] === card) {
                foundCard = true;
                startIndex = i;
            }
            if (foundCard || !queue) {
                ids.push(cards[i].getAttribute('data-id'));
            }
        }

        if (!ids.length) {
            return;
        }

        if (queue) {
            return playbackManager.queue({
                ids: ids,
                serverId: serverId
            });
        } else {

            return playbackManager.play({
                ids: ids,
                serverId: serverId,
                startIndex: startIndex
            });
        }
    }

    function showProgramDialog(item) {

        require(['recordingCreator'], function (recordingCreator) {

            recordingCreator.show(item.Id, item.ServerId);
        });
    }

    function getVirtualFolder(apiClient, id) {

        return apiClient.getVirtualFolders().then(function (items) {
            return items.filter(function (u) {

                return u.ItemId === id;
            })[0];
        });
    }

    function getItem(button) {

        button = dom.parentWithAttribute(button, 'data-type');
        var type = button.getAttribute('data-type');

        if (type === 'Plugin') {
            return Promise.resolve(getItemInfoFromCard(button));
        }

        if (type === 'Device') {
            return Promise.resolve(getItemInfoFromCard(button));
        }

        if (type === 'Server') {
            return Promise.resolve(getItemInfoFromCard(button));
        }

        var id = button.getAttribute('data-id');

        // AddServer
        if (!id) {
            return Promise.resolve(getItemInfoFromCard(button));
        }

        var serverId = button.getAttribute('data-serverid');
        var apiClient = connectionManager.getApiClient(serverId);

        if (type === 'VirtualFolder') {
            return getVirtualFolder(apiClient, id);
        }

        if (type === 'User') {
            return apiClient.getUser(id);
        }

        if (type === 'Timer') {
            return apiClient.getLiveTvTimer(id);
        }
        if (type === 'SeriesTimer') {
            return apiClient.getLiveTvSeriesTimer(id);
        }
        return apiClient.getItem(apiClient.getCurrentUserId(), id);
    }

    function notifyRefreshNeeded(childElement, itemsContainer) {

        itemsContainer = itemsContainer || dom.parentWithAttribute(childElement, 'is', 'emby-itemscontainer');

        if (itemsContainer) {
            itemsContainer.notifyRefreshNeeded(true);
        }
    }

    function getUser(item) {

        var serverId = item.ServerId;

        if (!serverId) {
            return Promise.resolve(null);
        }

        var apiClient = connectionManager.getApiClient(serverId);
        if (!apiClient.getCurrentUserId()) {
            return Promise.resolve(null);
        }

        return apiClient.getCurrentUser();
    }

    function showContextMenu(card, options) {

        return getItem(card).then(function (item) {

            var playlistId = card.getAttribute('data-playlistid');
            var collectionId = card.getAttribute('data-collectionid');

            if (playlistId) {
                var elem = dom.parentWithAttribute(card, 'data-playlistitemid');
                item.PlaylistItemId = elem ? elem.getAttribute('data-playlistitemid') : null;
            }

            return require(['itemContextMenu']).then(function (responses) {

                return getUser(item).then(function (user) {

                    return responses[0].show(Object.assign({
                        item: item,
                        play: true,
                        queue: true,
                        playAllFromHere: !item.IsFolder,
                        queueAllFromHere: !item.IsFolder,
                        playlistId: playlistId,
                        collectionId: collectionId,
                        user: user,
                        multiSelect: layoutManager.mobile && card.getAttribute('data-multiselect') !== 'false'

                    }, options || {})).then(function (result) {

                        var itemsContainer;

                        if (result.command === 'playallfromhere' || result.command === 'queueallfromhere') {
                            return executeAction(card, options.positionTo, result.command);
                        }
                        else if (result.command === 'addtoplaylist' || result.command === 'addtocollection') {
                            // generally no need to refresh lists after doing this
                        }
                        else if (result.updated || result.deleted) {
                            notifyRefreshNeeded(card, options.itemsContainer);
                        }

                    }, onRejected);
                });
            });
        });
    }

    function onRejected() {
    }

    function getItemInfoFromCard(card) {

        var item = {
            Type: card.getAttribute('data-type'),
            Id: card.getAttribute('data-id'),
            ServerId: card.getAttribute('data-serverid'),
            IsFolder: card.getAttribute('data-isfolder') === 'true'
        };

        var timerId = card.getAttribute('data-timerid');
        if (timerId) {
            item.TimerId = timerId;
        }

        var collectionType = card.getAttribute('data-collectiontype');
        if (collectionType) {
            item.CollectionType = collectionType;
        }

        var channelId = card.getAttribute('data-channelid');
        if (channelId) {
            item.ChannelId = channelId;
        }

        var mediaType = card.getAttribute('data-mediatype');
        if (mediaType) {
            item.MediaType = mediaType;
        }

        var seriesId = card.getAttribute('data-seriesid');
        if (seriesId) {
            item.SeriesId = seriesId;
        }

        var configpageurl = card.getAttribute('data-configpageurl');
        if (configpageurl) {
            item.ConfigPageUrl = configpageurl;
        }

        var startpositionticks = card.getAttribute('data-startpositionticks');
        if (startpositionticks) {
            item.StartPositionTicks = parseInt(startpositionticks);
        }

        return item;
    }

    function sendToast(text) {
        require(['toast'], function (toast) {
            toast(text);
        });
    }

    function addVirtualFolder(card) {

        // this is just so that we can keep the add library code in library.js
        card.dispatchEvent(new CustomEvent('addvirtualfolder', {
            cancelable: false,
            bubbles: true
        }));
    }

    function executeAction(card, target, action) {

        target = target || card;

        card = dom.parentWithAttribute(card, 'data-type');

        var item = getItemInfoFromCard(card);

        var serverId = item.ServerId;
        var type = item.Type;

        var playableItemId = type === 'Program' ? item.ChannelId : item.Id;

        if (item.MediaType === 'Photo' && action === 'link') {
            action = 'play';
        }

        if (action === 'link') {

            if (item.Type === 'AddVirtualFolder') {

                addVirtualFolder(card);

            } else {
                appRouter.showItem(item, {
                    context: card.getAttribute('data-context'),
                    parentId: card.getAttribute('data-parentid')
                });
            }
        }

        else if (action === 'programlink') {

            appRouter.showItem(card.getAttribute('data-programid') || item.Id, item.ServerId);
        }

        else if (action === 'programdialog') {

            showProgramDialog(item);
        }

        else if (action === 'instantmix') {
            playbackManager.instantMix({
                Id: playableItemId,
                ServerId: serverId
            });
        }

        else if (action === 'play' || action === 'playpause' || action === 'resume') {

            playbackManager.play({
                ids: [playableItemId],
                serverId: serverId,
                startPositionTicks: item.StartPositionTicks
            });
        }

        else if (action === 'queue') {

            if (playbackManager.isPlaying()) {
                playbackManager.queue({
                    ids: [playableItemId],
                    serverId: serverId
                });
                sendToast(globalize.translate('MediaQueued'));
            } else {
                playbackManager.queue({
                    ids: [playableItemId],
                    serverId: serverId
                });
            }
        }

        else if (action === 'playallfromhere') {
            playAllFromHere(card, playableItemId, serverId);
        }

        else if (action === 'queueallfromhere') {
            playAllFromHere(card, playableItemId, serverId, true);
        }

        else if (action === 'setplaylistindex') {
            playbackManager.setCurrentPlaylistItem(card.getAttribute('data-playlistitemid'));
        }

        else if (action === 'record') {
            onRecordCommand(serverId, item.Id, type, card.getAttribute('data-timerid'), card.getAttribute('data-status'), card.getAttribute('data-seriestimerid'));
        }

        // use info for this as well, until we have a better function for it
        else if (action === 'menu' || action === 'info') {

            var options = target.getAttribute('data-playoptions') === 'false' ?
                {
                    shuffle: false,
                    instantMix: false,
                    play: false,
                    playAllFromHere: false,
                    queue: false,
                    queueAllFromHere: false
                } :
                {};

            options.positionTo = target;

            showContextMenu(card, options);
        }

        else if (action === 'edit') {
            editItem(connectionManager.getApiClient(item), item, card);
        }

        else if (action === 'playtrailer') {
            playTrailer(item.Id, serverId);
        }

        else if (action === 'addtoplaylist') {
            addToPlaylist(item.Id, serverId);
        }

        else if (action === 'multiselect') {
            var itemsContainer = dom.parentWithClass(card, 'itemsContainer');
            itemsContainer.showMultiSelect(dom.parentWithClass(card, 'card'));
        }

        else if (action === 'custom') {

            var customAction = target.getAttribute('data-customaction');

            card.dispatchEvent(new CustomEvent('action-' + customAction, {
                detail: {
                    playlistItemId: card.getAttribute('data-playlistitemid'),
                    item: item
                },
                cancelable: false,
                bubbles: true
            }));
        }

        else if (action === 'connecttoserver') {
            connectToServer(item);
        }
    }

    function connectToServer(item) {

        if (item.Type === 'AddServer') {
            return appRouter.showItem(item);
        }
        if (item.Type === 'EmbyConnect') {
            return appRouter.showConnectLogin();
        }

        loading.show();

        // get the full object
        item = connectionManager.getServerInfo(item.Id) || item;

        connectionManager.connectToServer(item, {
            enableAutoLogin: appSettings.enableAutoLogin()

        }).then(function (result) {

            appRouter.handleConnectionResult(result);
        });
    }

    function addToPlaylist(itemId, serverId) {

        return require(['addToList']).then(function (responses) {

            var AddToList = responses[0];

            return new AddToList().show({
                items: [itemId],
                serverId: serverId,
                type: 'Playlist'
            });
        });
    }

    function playTrailer(itemId, serverId) {

        var apiClient = connectionManager.getApiClient(serverId);

        apiClient.getLocalTrailers(apiClient.getCurrentUserId(), itemId).then(function (trailers) {
            playbackManager.play({ items: trailers });
        });
    }

    function editVirtualFolder(button) {

        // get the full item
        return getItem(button).then(function (item) {

            var view = dom.parentWithClass(button, 'page');
            var refreshLibrary = button ? view.getAttribute('data-refreshlibrary') === 'true' : false;

            return require(['medialibraryeditor']).then(function (responses) {

                var medialibraryeditor = responses[0];

                return new medialibraryeditor().show({

                    refresh: refreshLibrary,
                    library: item

                });
            });
        });
    }

    function editItem(apiClient, item, button) {

        return editItemInternal(apiClient, item, button).then(function () {

            notifyRefreshNeeded(button);
        });
    }

    function editItemInternal(apiClient, item, button) {

        var itemType = item.Type;

        if (itemType === 'Timer') {
            return editTimer(item.Id, item.ServerId);
        } else if (itemType === 'VirtualFolder') {
            return editVirtualFolder(button);
        } else {
            return require(['metadataEditor']).then(function (responses) {

                return responses[0].show(item.Id, item.ServerId);
            });
        }
    }

    function editTimer(itemId, serverId) {

        var apiClient = connectionManager.getApiClient(serverId);

        return apiClient.getLiveTvTimer(itemId).then(function (item) {

            if (item.ProgramId) {
                return appRouter.showItem(item.ProgramId, serverId);
            } else {

                return require(['recordingEditor']).then(function (objects) {

                    var recordingEditor = objects[0];
                    return recordingEditor.show(itemId, serverId);
                });
            }
        });
    }

    function onRecordCommand(serverId, id, type, timerId, timerStatus, seriesTimerId) {

        if (type === 'Program' || timerId || seriesTimerId) {

            var programId = type === 'Program' ? id : null;
            recordingHelper.toggleRecording(serverId, programId, timerId, timerStatus, seriesTimerId);
        }
    }

    function onClick(e) {

        var card = dom.parentWithClass(e.target, 'itemAction');

        if (card) {

            var actionElement = card;
            var action = actionElement.getAttribute('data-action');

            if (!action) {
                actionElement = dom.parentWithAttribute(actionElement, 'data-action');
                if (actionElement) {
                    action = actionElement.getAttribute('data-action');
                }
            }

            if (action) {
                executeAction(card, actionElement, action);

                if (action !== 'multiselect') {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            }
        }
    }

    function onCommand(e) {

        var cmd = e.detail.command;

        if (cmd === 'play' || cmd === 'playpause' || cmd === 'resume' || cmd === 'record' || cmd === 'menu' || cmd === 'info') {

            var target = e.target;
            var card = dom.parentWithClass(target, 'itemAction') || dom.parentWithAttribute(target, 'data-id');

            if (card) {
                e.preventDefault();
                e.stopPropagation();
                executeAction(card, card, cmd);
            }
        }
    }

    function on(context, options) {

        options = options || {};

        if (options.click !== false) {
            context.addEventListener('click', onClick);
        }

        if (options.command !== false) {
            inputManager.on(context, onCommand);
        }
    }

    function off(context, options) {
        options = options || {};

        context.removeEventListener('click', onClick);

        if (options.command !== false) {
            inputManager.off(context, onCommand);
        }
    }

    function getShortcutAttributes(item, options) {
        var dataAttributes = [];

        if (options.multiSelect === false) {
            dataAttributes.push({
                name: 'data-multiselect',
                value: false
            });
        }

        var context = options.context;
        if (context) {
            dataAttributes.push({
                name: 'data-context',
                value: context
            });
        }

        var parentId = options.parentId;
        if (parentId) {
            dataAttributes.push({
                name: 'data-parentid',
                value: parentId
            });
        }

        if (item.StartPositionTicks != null) {
            dataAttributes.push({
                name: 'data-startpositionticks',
                value: item.StartPositionTicks
            });
        }

        if (item.ConfigPageUrl) {
            dataAttributes.push({
                name: 'data-configpageurl',
                value: item.ConfigPageUrl
            });
        }

        var status = item.Status;
        if (status) {
            dataAttributes.push({
                name: 'data-status',
                value: status
            });
        }

        var channelId = item.ChannelId;
        if (channelId) {
            dataAttributes.push({
                name: 'data-channelid',
                value: channelId
            });
        }

        if (item.CollectionType) {
            dataAttributes.push({
                name: 'data-collectiontype',
                value: item.CollectionType
            });
        }

        var type = item.Type;
        if (type) {
            dataAttributes.push({
                name: 'data-type',
                value: type
            });
        }

        var mediaType = item.MediaType;
        if (mediaType) {
            dataAttributes.push({
                name: 'data-mediatype',
                value: mediaType
            });
        }

        if (options.collectionId) {
            dataAttributes.push({
                name: 'data-collectionid',
                value: options.collectionId
            });
        }

        else if (options.playlistId) {
            dataAttributes.push({
                name: 'data-playlistid',
                value: options.playlistId
            });
        }

        if (item.IsFolder) {
            dataAttributes.push({
                name: 'data-isfolder',
                value: true
            });
        }

        var playlistItemId = item.PlaylistItemId;
        if (playlistItemId) {
            dataAttributes.push({
                name: 'data-playlistitemid',
                value: playlistItemId
            });
        }

        var serverId = item.ServerId || options.serverId;
        if (serverId) {
            dataAttributes.push({
                name: 'data-serverid',
                value: serverId
            });
        }

        var itemId = item.Id || item.ItemId;
        if (itemId) {
            dataAttributes.push({
                name: 'data-id',
                value: itemId
            });
        }

        var nameWithPrefix = item.SortName;
        if (nameWithPrefix) {

            var prefix = nameWithPrefix.substring(0, Math.min(3, nameWithPrefix.length));

            if (prefix) {
                dataAttributes.push({
                    name: 'data-prefix',
                    value: prefix.toUpperCase()
                });
            }
        }

        if (item.TimerId) {
            dataAttributes.push({
                name: 'data-timerid',
                value: item.TimerId
            });
        }
        if (item.SeriesTimerId) {
            dataAttributes.push({
                name: 'data-seriestimerid',
                value: item.SeriesTimerId
            });
        }

        var currentProgram = item.CurrentProgram;
        if (currentProgram) {
            dataAttributes.push({
                name: 'data-programid',
                value: currentProgram.Id
            });
        }

        return dataAttributes;
    }

    function getShortcutAttributesHtml(item, options) {

        var dataAttributes = '';

        if (options.multiSelect === false) {
            dataAttributes += ' data-multiselect="false"';
        }

        var context = options.context;
        if (context) {
            dataAttributes += ' data-context="' + context + '"';
        }

        var parentId = options.parentId;
        if (parentId) {
            dataAttributes += ' data-parentid="' + parentId + '"';
        }

        if (item.StartPositionTicks != null) {
            dataAttributes += ' data-startpositionticks="' + item.StartPositionTicks + '"';
        }

        if (item.ConfigPageUrl) {
            dataAttributes += ' data-configpageurl="' + item.ConfigPageUrl + '"';
        }

        var status = item.Status;
        if (status) {
            dataAttributes += ' data-status="' + status + '"';
        }

        var channelId = item.ChannelId;
        if (channelId) {
            dataAttributes += ' data-channelid="' + channelId + '"';
        }

        if (item.CollectionType) {
            dataAttributes += ' data-collectiontype="' + item.CollectionType + '"';
        }

        var type = item.Type;
        if (type) {
            dataAttributes += ' data-type="' + type + '"';
        }

        var mediaType = item.MediaType;
        if (mediaType) {
            dataAttributes += ' data-mediatype="' + mediaType + '"';
        }

        if (options.collectionId) {
            dataAttributes += ' data-collectionid="' + options.collectionId + '"';
        }

        else if (options.playlistId) {
            dataAttributes += ' data-playlistid="' + options.playlistId + '"';
        }

        if (item.IsFolder) {
            dataAttributes += ' data-isfolder="true"';
        }

        var playlistItemId = item.PlaylistItemId;
        if (playlistItemId) {
            dataAttributes += ' data-playlistitemid="' + playlistItemId + '"';
        }

        var serverId = item.ServerId || options.serverId;
        if (serverId) {
            dataAttributes += ' data-serverid="' + serverId + '"';
        }

        var itemId = item.Id || item.ItemId;
        if (itemId) {
            dataAttributes += ' data-id="' + itemId + '"';
        }

        var nameWithPrefix = (item.SortName || item.Name || '');
        var prefix = nameWithPrefix.substring(0, Math.min(3, nameWithPrefix.length));

        if (prefix) {
            prefix = prefix.toUpperCase();
        }

        if (prefix) {
            dataAttributes += ' data-prefix="' + prefix + '"';
        }

        if (item.TimerId) {
            dataAttributes += ' data-timerid="' + item.TimerId + '"';
        }
        if (item.SeriesTimerId) {
            dataAttributes += ' data-seriestimerid="' + item.SeriesTimerId + '"';
        }

        var currentProgram = item.CurrentProgram;
        if (currentProgram) {
            dataAttributes += ' data-programid="' + currentProgram.Id + '"';
        }

        return dataAttributes;
    }

    return {
        on: on,
        off: off,
        onClick: onClick,
        getShortcutAttributesHtml: getShortcutAttributesHtml,
        getShortcutAttributes: getShortcutAttributes
    };

});