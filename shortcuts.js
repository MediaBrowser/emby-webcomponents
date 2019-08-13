define(['appSettings', 'layoutManager', 'playbackManager', 'inputManager', 'connectionManager', 'appRouter', 'globalize', 'loading', 'dom', 'recordingHelper'], function (appSettings, layoutManager, playbackManager, inputManager, connectionManager, appRouter, globalize, loading, dom, recordingHelper) {
    'use strict';

    function playAllFromHere(card, serverId, queue) {

        var parent = card.parentNode;
        var className = card.classList.length ? ('.' + card.classList[0]) : '';
        var cards = parent.querySelectorAll(className + '[data-id]');

        var ids = [];

        var foundCard = false;
        var startIndex;

        for (var i = 0, length = cards.length; i < length; i++) {
            if (cards[i] === card) {
                foundCard = true;
                startIndex = i;
            }
            if (foundCard || !queue) {
                ids.push(cards[i].getAttribute('data-id'));
            }
        }

        var itemsContainer = dom.parentWithClass(card, 'itemsContainer');
        if (itemsContainer && itemsContainer.fetchData) {

            var queryOptions = queue ? { StartIndex: startIndex } : {};

            return itemsContainer.fetchData(queryOptions).then(function (result) {

                if (queue) {
                    return playbackManager.queue({
                        items: result.Items || result
                    });
                } else {

                    return playbackManager.play({
                        items: result.Items || result,
                        startIndex: startIndex
                    });
                }
            });
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

    function getItem(button) {

        button = dom.parentWithAttribute(button, 'data-type');
        var serverId = button.getAttribute('data-serverid');
        var id = button.getAttribute('data-id');
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

        // AddServer
        if (!id) {
            return Promise.resolve(getItemInfoFromCard(button));
        }

        var apiClient = connectionManager.getApiClient(serverId);

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

        getItem(card).then(function (item) {

            var playlistId = card.getAttribute('data-playlistid');
            var collectionId = card.getAttribute('data-collectionid');

            if (playlistId) {
                var elem = dom.parentWithAttribute(card, 'data-playlistitemid');
                item.PlaylistItemId = elem ? elem.getAttribute('data-playlistitemid') : null;
            }

            require(['itemContextMenu'], function (itemContextMenu) {

                getUser(item).then(function (user) {
                    itemContextMenu.show(Object.assign({
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
                            executeAction(card, options.positionTo, result.command);
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

            appRouter.showItem(item, {
                context: card.getAttribute('data-context'),
                parentId: card.getAttribute('data-parentid')
            });
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

        else if (action === 'play' || action === 'resume') {

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
            playAllFromHere(card, serverId);
        }

        else if (action === 'queueallfromhere') {
            playAllFromHere(card, serverId, true);
        }

        else if (action === 'setplaylistindex') {
            playbackManager.setCurrentPlaylistItem(card.getAttribute('data-playlistitemid'));
        }

        else if (action === 'record') {
            onRecordCommand(serverId, item.Id, type, card.getAttribute('data-timerid'), card.getAttribute('data-seriestimerid'));
        }

        else if (action === 'menu') {

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
            editItem(item.Id, type, serverId);
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
        require(['playlistEditor'], function (playlistEditor) {

            new playlistEditor().show({
                items: [itemId],
                serverId: serverId

            });
        });
    }

    function playTrailer(itemId, serverId) {

        var apiClient = connectionManager.getApiClient(serverId);

        apiClient.getLocalTrailers(apiClient.getCurrentUserId(), itemId).then(function (trailers) {
            playbackManager.play({ items: trailers });
        });
    }

    function editItem(itemId, itemType, serverId) {

        var apiClient = connectionManager.getApiClient(serverId);

        return new Promise(function (resolve, reject) {

            var serverId = apiClient.serverInfo().Id;

            if (itemType === 'Timer') {
                editTimer(itemId, serverId);
            } else {
                require(['metadataEditor'], function (metadataEditor) {

                    metadataEditor.show(itemId, serverId).then(resolve, reject);
                });
            }
        });
    }

    function editTimer(itemId, serverId) {

        var apiClient = connectionManager.getApiClient(serverId);

        return apiClient.getLiveTvTimer(itemId).then(function (item) {

            if (item.ProgramId) {
                return require(['recordingCreator']).then(function (objects) {

                    var recordingCreator = objects[0];
                    return recordingCreator.show(item.ProgramId, serverId);
                });

            } else {

                return require(['recordingEditor']).then(function (objects) {

                    var recordingEditor = objects[0];
                    return recordingEditor.show(itemId, serverId);
                });
            }
        });
    }

    function onRecordCommand(serverId, id, type, timerId, seriesTimerId) {

        if (type === 'Program' || timerId || seriesTimerId) {

            var programId = type === 'Program' ? id : null;
            recordingHelper.toggleRecording(serverId, programId, timerId, seriesTimerId);
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

                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        }
    }

    function onCommand(e) {

        var cmd = e.detail.command;

        if (cmd === 'play' || cmd === 'resume' || cmd === 'record' || cmd === 'menu' || cmd === 'info') {

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

    function getShortcutAttributesHtml(item, serverId) {

        var html = 'data-id="' + item.Id + '"';

        if (!serverId) {
            serverId = item.ServerId;
        }
        if (serverId) {
            html += ' data-serverid="' + serverId + '"';
        }

        if (item.Type) {
            html += ' data-type="' + item.Type + '"';
        }

        if (item.MediaType) {
            html += ' data-mediatype="' + item.MediaType + '"';
        }

        if (item.ChannelId) {
            html += ' data-channelid="' + item.ChannelId + '"';
        }

        if (item.IsFolder) {
            html += ' data-isfolder="true"';
        }

        var collectionType = item.CollectionType;
        if (collectionType) {
            html += ' data-collectiontype="' + collectionType + '"';
        }

        if (item.ConfigPageUrl) {
            html += ' data-configpageurl="' + item.ConfigPageUrl + '"';
        }

        return html;
    }

    return {
        on: on,
        off: off,
        onClick: onClick,
        getShortcutAttributesHtml: getShortcutAttributesHtml
    };

});