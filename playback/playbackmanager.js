define(['events', 'datetime', 'appSettings', 'pluginManager', 'playQueueManager', 'userSettings', 'globalize', 'connectionManager', 'loading', 'serverNotifications', 'apphost', 'fullscreenManager', 'layoutManager'], function (events, datetime, appSettings, pluginManager, PlayQueueManager, userSettings, globalize, connectionManager, loading, serverNotifications, apphost, fullscreenManager, layoutManager) {
    'use strict';

    function enableLocalPlaylistManagement(player) {

        if (player.getPlaylist) {

            return false;
        }

        if (player.isLocalPlayer) {

            return true;
        }

        return false;
    }

    function bindToFullscreenChange(player) {
        events.on(fullscreenManager, 'fullscreenchange', function () {
            events.trigger(player, 'fullscreenchange');
        });
    }

    function triggerPlayerChange(playbackManagerInstance, newPlayer, newTarget, previousPlayer, previousTargetInfo) {

        if (!newPlayer && !previousPlayer) {
            return;
        }

        if (newTarget && previousTargetInfo) {

            if (newTarget.id === previousTargetInfo.id) {
                return;
            }
        }

        events.trigger(playbackManagerInstance, 'playerchange', [newPlayer, newTarget, previousPlayer]);
    }

    function reportPlayback(state, serverId, method, progressEventName) {

        if (!serverId) {
            // Not a server item
            // We can expand on this later and possibly report them
            return;
        }

        var info = Object.assign({}, state.PlayState);
        info.ItemId = state.NowPlayingItem.Id;

        if (progressEventName) {
            info.EventName = progressEventName;
        }

        //console.log(method + '-' + JSON.stringify(info));
        var apiClient = connectionManager.getApiClient(serverId);
        apiClient[method](info);
    }

    function normalizeName(t) {
        return t.toLowerCase().replace(' ', '');
    }

    function getItemsForPlayback(serverId, query) {

        var apiClient = connectionManager.getApiClient(serverId);

        if (query.Ids && query.Ids.split(',').length === 1) {

            var itemId = query.Ids.split(',');

            return apiClient.getItem(apiClient.getCurrentUserId(), itemId).then(function (item) {

                return {
                    Items: [item],
                    TotalRecordCount: 1
                };
            });
        }
        else {

            query.Limit = query.Limit || 200;
            query.Fields = "MediaSources,Chapters";
            query.ExcludeLocationTypes = "Virtual";
            query.EnableTotalRecordCount = false;

            return apiClient.getItems(apiClient.getCurrentUserId(), query);
        }
    }

    function createStreamInfoFromUrlItem(item) {

        // Check item.Path for games
        return {
            url: item.Url || item.Path,
            playMethod: 'DirectPlay',
            item: item,
            textTracks: [],
            mediaType: item.MediaType
        };
    }

    function backdropImageUrl(apiClient, item, options) {

        options = options || {};
        options.type = options.type || "Backdrop";

        // If not resizing, get the original image
        if (!options.maxWidth && !options.width && !options.maxHeight && !options.height) {
            options.quality = 100;
        }

        if (item.BackdropImageTags && item.BackdropImageTags.length) {

            options.tag = item.BackdropImageTags[0];
            return apiClient.getScaledImageUrl(item.Id, options);
        }

        if (item.ParentBackdropImageTags && item.ParentBackdropImageTags.length) {
            options.tag = item.ParentBackdropImageTags[0];
            return apiClient.getScaledImageUrl(item.ParentBackdropItemId, options);
        }

        return null;
    }

    function getMimeType(type, container) {

        container = (container || '').toLowerCase();

        if (type === 'audio') {
            if (container === 'opus') {
                return 'audio/ogg';
            }
            if (container === 'webma') {
                return 'audio/webm';
            }
            if (container === 'm4a') {
                return 'audio/mp4';
            }
        }
        else if (type === 'video') {
            if (container === 'mkv') {
                return 'video/x-matroska';
            }
            if (container === 'm4v') {
                return 'video/mp4';
            }
            if (container === 'mov') {
                return 'video/quicktime';
            }
            if (container === 'mpg') {
                return 'video/mpeg';
            }
            if (container === 'flv') {
                return 'video/x-flv';
            }
        }

        return type + '/' + container;
    }

    function getParam(name, url) {
        name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
        var regexS = "[\\?&]" + name + "=([^&#]*)";
        var regex = new RegExp(regexS, "i");

        var results = regex.exec(url);
        if (results == null) {
            return "";
        }
        else {
            return decodeURIComponent(results[1].replace(/\+/g, " "));
        }
    }

    function isAutomaticPlayer(player) {

        if (player.isLocalPlayer) {
            return true;
        }

        return false;
    }

    function getAutomaticPlayers(instance) {

        var player = instance._currentPlayer;
        if (player && !isAutomaticPlayer(player)) {
            return [player];
        }

        return instance.getPlayers().filter(isAutomaticPlayer);
    }

    function isServerItem(item) {
        if (!item.Id) {
            return false;
        }
        return true;
    }

    function enableIntros(item) {

        if (item.MediaType !== 'Video') {
            return false;
        }
        if (item.Type === 'TvChannel') {
            return false;
        }
        // disable for in-progress recordings
        if (item.Status === 'InProgress') {
            return false;
        }

        return isServerItem(item);
    }

    function getIntros(firstItem, apiClient, options) {

        if (options.startPositionTicks || options.fullscreen === false || !enableIntros(firstItem) || !userSettings.enableCinemaMode()) {
            return Promise.resolve({
                Items: []
            });
        }

        return apiClient.getIntros(firstItem.Id);
    }

    var startingPlaySession = new Date().getTime();
    function getAudioStreamUrl(item, transcodingProfile, directPlayContainers, maxBitrate, apiClient, startPosition) {

        var url = 'Audio/' + item.Id + '/universal';

        startingPlaySession++;
        return apiClient.getUrl(url, {
            UserId: apiClient.getCurrentUserId(),
            DeviceId: apiClient.deviceId(),
            MaxStreamingBitrate: maxBitrate || appSettings.maxStreamingBitrate(),
            Container: directPlayContainers,
            TranscodingContainer: transcodingProfile.Container || null,
            TranscodingProtocol: transcodingProfile.Protocol || null,
            AudioCodec: transcodingProfile.AudioCodec,
            // TODO grab from CodecProfiles
            MaxSampleRate: 48000,
            api_key: apiClient.accessToken(),
            PlaySessionId: startingPlaySession,
            StartTimeTicks: startPosition || 0
        });
    }

    function getAudioStreamUrlFromDeviceProfile(item, deviceProfile, maxBitrate, apiClient, startPosition) {

        var transcodingProfile = deviceProfile.TranscodingProfiles.filter(function (p) {
            return p.Type === 'Audio' && p.Context === 'Streaming';
        })[0];

        var directPlayContainers = '';

        deviceProfile.DirectPlayProfiles.map(function (p) {

            if (p.Type === 'Audio') {
                if (directPlayContainers) {
                    directPlayContainers += ',' + p.Container;
                } else {
                    directPlayContainers = p.Container;
                }
            }

        });

        return getAudioStreamUrl(item, transcodingProfile, directPlayContainers, maxBitrate, apiClient, startPosition);
    }

    function getStreamUrls(items, deviceProfile, maxBitrate, apiClient, startPosition) {

        var audioTranscodingProfile = deviceProfile.TranscodingProfiles.filter(function (p) {
            return p.Type === 'Audio' && p.Context === 'Streaming';
        })[0];

        var audioDirectPlayContainers = '';

        deviceProfile.DirectPlayProfiles.map(function (p) {

            if (p.Type === 'Audio') {
                if (audioDirectPlayContainers) {
                    audioDirectPlayContainers += ',' + p.Container;
                } else {
                    audioDirectPlayContainers = p.Container;
                }
            }
        });

        var supportsUniversalAudio = apiClient.isMinServerVersion('3.2.17.5');
        var streamUrls = [];

        for (var i = 0, length = items.length; i < length; i++) {

            var item = items[i];
            var streamUrl;

            if (supportsUniversalAudio && item.MediaType === 'Audio') {
                streamUrl = getAudioStreamUrl(item, audioTranscodingProfile, audioDirectPlayContainers, maxBitrate, apiClient, startPosition);
            }

            streamUrls.push(streamUrl || '');

            if (i === 0) {
                startPosition = 0;
            }
        }

        return Promise.resolve(streamUrls);
    }

    function setStreamUrls(items, deviceProfile, maxBitrate, apiClient, startPosition) {

        return getStreamUrls(items, deviceProfile, maxBitrate, apiClient, startPosition).then(function (streamUrls) {

            for (var i = 0, length = items.length; i < length; i++) {

                var item = items[i];

                item.StreamUrl = streamUrls[i] || null;
            }
        });
    }

    function getPlaybackInfo(player,
        apiClient,
        item,
        deviceProfile,
        maxBitrate,
        startPosition,
        mediaSource,
        audioStreamIndex,
        subtitleStreamIndex,
        liveStreamId,
        enableDirectPlay,
        enableDirectStream,
        allowVideoStreamCopy,
        allowAudioStreamCopy) {

        if (item.MediaType === 'Audio' && apiClient.isMinServerVersion('3.2.17.5')) {

            return Promise.resolve({
                MediaSources: [
                    {
                        StreamUrl: getAudioStreamUrlFromDeviceProfile(item, deviceProfile, maxBitrate, apiClient, startPosition),
                        Id: item.Id,
                        MediaStreams: [],
                        RunTimeTicks: item.RunTimeTicks
                    }]
            });
        }

        var itemId = item.Id;

        var query = {
            UserId: apiClient.getCurrentUserId(),
            StartTimeTicks: startPosition || 0
        };

        if (audioStreamIndex != null) {
            query.AudioStreamIndex = audioStreamIndex;
        }
        if (subtitleStreamIndex != null) {
            query.SubtitleStreamIndex = subtitleStreamIndex;
        }
        if (enableDirectPlay != null) {
            query.EnableDirectPlay = enableDirectPlay;
        }

        if (enableDirectPlay !== false) {
            query.ForceDirectPlayRemoteMediaSource = true;
        }
        if (enableDirectStream != null) {
            query.EnableDirectStream = enableDirectStream;
        }
        if (allowVideoStreamCopy != null) {
            query.AllowVideoStreamCopy = allowVideoStreamCopy;
        }
        if (allowAudioStreamCopy != null) {
            query.AllowAudioStreamCopy = allowAudioStreamCopy;
        }
        if (mediaSource) {
            query.MediaSourceId = mediaSource.Id;
        }
        if (liveStreamId) {
            query.LiveStreamId = liveStreamId;
        }
        if (maxBitrate) {
            query.MaxStreamingBitrate = maxBitrate;
        }

        // lastly, enforce player overrides for special situations
        if (query.EnableDirectStream !== false) {
            if (player.supportsPlayMethod && !player.supportsPlayMethod('DirectStream', item)) {
                query.EnableDirectStream = false;
            }
        }

        return apiClient.getPlaybackInfo(itemId, query, deviceProfile);
    }

    function getOptimalMediaSource(apiClient, item, versions) {

        var promises = versions.map(function (v) {
            return supportsDirectPlay(apiClient, item, v);
        });

        if (!promises.length) {
            return Promise.reject();
        }

        return Promise.all(promises).then(function (results) {

            for (var i = 0, length = versions.length; i < length; i++) {
                versions[i].enableDirectPlay = results[i] || false;
            }
            var optimalVersion = versions.filter(function (v) {

                return v.enableDirectPlay;

            })[0];

            if (!optimalVersion) {
                optimalVersion = versions.filter(function (v) {

                    return v.SupportsDirectStream;

                })[0];
            }

            optimalVersion = optimalVersion || versions.filter(function (s) {
                return s.SupportsTranscoding;
            })[0];

            return optimalVersion || versions[0];
        });
    }

    function getLiveStream(player, apiClient, item, playSessionId, deviceProfile, maxBitrate, startPosition, mediaSource, audioStreamIndex, subtitleStreamIndex) {

        var postData = {
            DeviceProfile: deviceProfile,
            OpenToken: mediaSource.OpenToken
        };

        var query = {
            UserId: apiClient.getCurrentUserId(),
            StartTimeTicks: startPosition || 0,
            ItemId: item.Id,
            PlaySessionId: playSessionId
        };

        if (maxBitrate) {
            query.MaxStreamingBitrate = maxBitrate;
        }
        if (audioStreamIndex != null) {
            query.AudioStreamIndex = audioStreamIndex;
        }
        if (subtitleStreamIndex != null) {
            query.SubtitleStreamIndex = subtitleStreamIndex;
        }

        // lastly, enforce player overrides for special situations
        if (query.EnableDirectStream !== false) {
            if (player.supportsPlayMethod && !player.supportsPlayMethod('DirectStream', item)) {
                query.EnableDirectStream = false;
            }
        }

        return apiClient.ajax({
            url: apiClient.getUrl('LiveStreams/Open', query),
            type: 'POST',
            data: JSON.stringify(postData),
            contentType: "application/json",
            dataType: "json"

        });
    }

    function isHostReachable(mediaSource, apiClient) {

        var url = mediaSource.Path;

        var isServerAddress = url.toLowerCase().replace('https:', 'http').indexOf(apiClient.serverAddress().toLowerCase().replace('https:', 'http').substring(0, 14)) === 0;

        if (isServerAddress) {
            return Promise.resolve(true);
        }

        if (mediaSource.IsRemote) {
            return Promise.resolve(true);
        }

        return Promise.resolve(false);
    }

    function supportsDirectPlay(apiClient, item, mediaSource) {

        // folder rip hacks due to not yet being supported by the stream building engine
        var isFolderRip = mediaSource.VideoType === 'BluRay' || mediaSource.VideoType === 'Dvd' || mediaSource.VideoType === 'HdDvd';

        if (mediaSource.SupportsDirectPlay || isFolderRip) {

            if (mediaSource.IsRemote && (item.Type === 'TvChannel' || item.Type === 'Trailer') && !apphost.supports('remotemedia')) {
                return Promise.resolve(false);
            }

            if (mediaSource.Protocol === 'Http' && !mediaSource.RequiredHttpHeaders.length) {

                // If this is the only way it can be played, then allow it
                if (!mediaSource.SupportsDirectStream && !mediaSource.SupportsTranscoding) {
                    return Promise.resolve(true);
                }
                else {
                    return isHostReachable(mediaSource, apiClient);
                }
            }

            else if (mediaSource.Protocol === 'File') {

                return new Promise(function (resolve, reject) {

                    // Determine if the file can be accessed directly
                    require(['filesystem'], function (filesystem) {

                        var method = isFolderRip ?
                            'directoryExists' :
                            'fileExists';

                        filesystem[method](mediaSource.Path).then(function () {
                            resolve(true);
                        }, function () {
                            resolve(false);
                        });

                    });
                });
            }
        }

        return Promise.resolve(false);
    }

    function validatePlaybackInfoResult(instance, result) {

        if (result.ErrorCode) {

            showPlaybackInfoErrorMessage(instance, result.ErrorCode);
            return false;
        }

        return true;
    }

    function showPlaybackInfoErrorMessage(instance, errorCode, playNextTrack) {

        require(['alert'], function (alert) {
            alert({
                text: globalize.translate('sharedcomponents#PlaybackError' + errorCode),
                title: globalize.translate('sharedcomponents#HeaderPlaybackError')
            }).then(function () {

                if (playNextTrack) {
                    instance.nextTrack();
                }
            });
        });
    }

    function normalizePlayOptions(playOptions) {
        playOptions.fullscreen = playOptions.fullscreen !== false;
    }

    function getNowPlayingItemForReporting(player, item, mediaSource) {

        var nowPlayingItem = Object.assign({}, item);

        if (mediaSource) {
            nowPlayingItem.RunTimeTicks = mediaSource.RunTimeTicks;
        }

        nowPlayingItem.RunTimeTicks = nowPlayingItem.RunTimeTicks || player.duration() * 10000;

        return nowPlayingItem;
    }

    function displayPlayerInLocalGroup(player) {

        return player.isLocalPlayer;
    }

    function getSupportedCommands(player) {

        if (player.isLocalPlayer) {
            // Full list
            // https://github.com/MediaBrowser/MediaBrowser/blob/master/MediaBrowser.Model/Session/GeneralCommand.cs
            var list = [
                "GoHome",
                "GoToSettings",
                "VolumeUp",
                "VolumeDown",
                "Mute",
                "Unmute",
                "ToggleMute",
                "SetVolume",
                "SetAudioStreamIndex",
                "SetSubtitleStreamIndex",
                "SetMaxStreamingBitrate",
                "DisplayContent",
                "GoToSearch",
                "DisplayMessage",
                "SetRepeatMode"
            ];

            if (apphost.supports('fullscreenchange') && !layoutManager.tv) {
                list.push('ToggleFullscreen');
            }

            if (player.supports) {
                if (player.supports('PictureInPicture')) {
                    list.push('PictureInPicture');
                }
                if (player.supports('SetBrightness')) {
                    list.push('SetBrightness');
                }
                if (player.supports('SetAspectRatio')) {
                    list.push('SetAspectRatio');
                }
            }

            return list;
        }

        throw new Error('player must define supported commands');
    }

    function createTarget(player) {
        return {
            name: player.name,
            id: player.id,
            playerName: player.name,
            playableMediaTypes: ['Audio', 'Video', 'Game', 'Photo', 'Book'].map(player.canPlayMediaType),
            isLocalPlayer: player.isLocalPlayer,
            supportedCommands: getSupportedCommands(player)
        };
    }

    function getPlayerTargets(player) {
        if (player.getTargets) {
            return player.getTargets();
        }

        return Promise.resolve([createTarget(player)]);
    }

    function PlaybackManager() {

        var self = this;

        var players = [];
        var currentTargetInfo;
        var lastLocalPlayer;
        var currentPairingId = null;

        var currentPlayOptions;
        this._playNextAfterEnded = true;
        var playerStates = {};

        this._playQueueManager = new PlayQueueManager();

        self.currentItem = function (player) {

            if (!player) {
                throw new Error('player cannot be null');
            }

            var data = getPlayerData(player);
            return data.streamInfo ? data.streamInfo.item : null;
        };

        self.currentMediaSource = function (player) {

            if (!player) {
                throw new Error('player cannot be null');
            }

            var data = getPlayerData(player);
            return data.streamInfo ? data.streamInfo.mediaSource : null;
        };

        self.getPlayerInfo = function () {

            var player = self._currentPlayer;

            if (!player) {
                return null;
            }

            var target = currentTargetInfo || {};

            return {

                name: player.name,
                isLocalPlayer: player.isLocalPlayer,
                id: target.id,
                deviceName: target.deviceName,
                playableMediaTypes: target.playableMediaTypes,
                supportedCommands: target.supportedCommands
            };
        };

        self.setActivePlayer = function (player, targetInfo) {

            if (player === 'localplayer' || player.name === 'localplayer') {
                if (self._currentPlayer && self._currentPlayer.isLocalPlayer) {
                    return;
                }
                setCurrentPlayerInternal(null, null);
                return;
            }

            if (typeof (player) === 'string') {
                player = players.filter(function (p) {
                    return p.name === player;
                })[0];
            }

            if (!player) {
                throw new Error('null player');
            }

            setCurrentPlayerInternal(player, targetInfo);
        };

        self.trySetActivePlayer = function (player, targetInfo) {

            if (player === 'localplayer' || player.name === 'localplayer') {
                if (self._currentPlayer && self._currentPlayer.isLocalPlayer) {
                    return;
                }
                return;
            }

            if (typeof (player) === 'string') {
                player = players.filter(function (p) {
                    return p.name === player;
                })[0];
            }

            if (!player) {
                throw new Error('null player');
            }

            if (currentPairingId === targetInfo.id) {
                return;
            }

            currentPairingId = targetInfo.id;

            var promise = player.tryPair ?
                player.tryPair(targetInfo) :
                Promise.resolve();

            promise.then(function () {

                setCurrentPlayerInternal(player, targetInfo);
            }, function () {

                if (currentPairingId === targetInfo.id) {
                    currentPairingId = null;
                }
            });
        };

        self.getTargets = function () {

            var promises = players.filter(function (p) {
                return !displayPlayerInLocalGroup(p);
            }).map(getPlayerTargets);

            return Promise.all(promises).then(function (responses) {

                var targets = [];

                targets.push({
                    name: globalize.translate('sharedcomponents#HeaderMyDevice'),
                    id: 'localplayer',
                    playerName: 'localplayer',
                    playableMediaTypes: ['Audio', 'Video', 'Game'],
                    isLocalPlayer: true,
                    supportedCommands: getSupportedCommands({
                        isLocalPlayer: true
                    })
                });

                for (var i = 0; i < responses.length; i++) {

                    var subTargets = responses[i];

                    for (var j = 0; j < subTargets.length; j++) {

                        targets.push(subTargets[j]);
                    }

                }

                targets = targets.sort(function (a, b) {

                    var aVal = a.isLocalPlayer ? 0 : 1;
                    var bVal = b.isLocalPlayer ? 0 : 1;

                    aVal = aVal.toString() + a.name;
                    bVal = bVal.toString() + b.name;

                    return aVal.localeCompare(bVal);
                });

                return targets;
            });
        };

        function getCurrentSubtitleStream(player) {

            if (!player) {
                throw new Error('player cannot be null');
            }

            var index = getPlayerData(player).subtitleStreamIndex;

            if (index == null || index === -1) {
                return null;
            }

            return getSubtitleStream(player, index);
        }

        function getSubtitleStream(player, index) {
            return self.currentMediaSource(player).MediaStreams.filter(function (s) {
                return s.Type === 'Subtitle' && s.Index === index;
            })[0];
        }

        self.getPlaylist = function (player) {

            player = player || self._currentPlayer;
            if (player && !enableLocalPlaylistManagement(player)) {
                return player.getPlaylist();
            }

            return Promise.resolve(self._playQueueManager.getPlaylist());
        };

        function setCurrentPlayerInternal(player, targetInfo) {

            var previousPlayer = self._currentPlayer;
            var previousTargetInfo = currentTargetInfo;

            if (player && !targetInfo && player.isLocalPlayer) {
                targetInfo = createTarget(player);
            }

            if (player && !targetInfo) {
                throw new Error('targetInfo cannot be null');
            }

            currentPairingId = null;
            self._currentPlayer = player;
            currentTargetInfo = targetInfo;

            if (targetInfo) {
                console.log('Active player: ' + JSON.stringify(targetInfo));
            }

            if (player && player.isLocalPlayer) {
                lastLocalPlayer = player;
            }

            if (previousPlayer) {
                self.endPlayerUpdates(previousPlayer);
            }

            if (player) {
                self.beginPlayerUpdates(player);
            }

            triggerPlayerChange(self, player, targetInfo, previousPlayer, previousTargetInfo);
        }

        self.isPlaying = function (player) {
            player = player || self._currentPlayer;
            if (player && !enableLocalPlaylistManagement(player)) {
                return player.isPlaying();
            }
            return player != null && player.currentSrc() != null;
        };

        self.isPlayingLocally = function (mediaTypes, player) {

            player = player || self._currentPlayer;

            if (!player || !player.isLocalPlayer) {
                return false;
            }

            var playerData = getPlayerData(player) || {};

            return mediaTypes.indexOf((playerData.streamInfo || {}).mediaType || '') !== -1;
        };

        self.isPlayingVideo = function (player) {

            player = player || self._currentPlayer;
            if (player && !enableLocalPlaylistManagement(player)) {
                return player.isPlayingVideo();
            }

            if (self.isPlaying(player)) {
                var playerData = getPlayerData(player);

                return playerData.streamInfo.mediaType === 'Video';
            }

            return false;
        };

        self.isPlayingAudio = function (player) {
            player = player || self._currentPlayer;
            if (player && !enableLocalPlaylistManagement(player)) {
                return player.isPlayingAudio();
            }

            if (self.isPlaying(player)) {
                var playerData = getPlayerData(player);

                return playerData.streamInfo.mediaType === 'Audio';
            }

            return false;
        };

        self.getPlayers = function () {

            return players;
        };

        self.canPlay = function (item) {

            var itemType = item.Type;
            var locationType = item.LocationType;

            if (itemType === "MusicGenre" || itemType === "Season" || itemType === "Series" || itemType === "BoxSet" || itemType === "MusicAlbum" || itemType === "MusicArtist" || itemType === "Playlist") {
                return true;
            }

            if (locationType === "Virtual") {
                if (itemType !== "Program") {
                    return false;
                }
            }

            if (itemType === "Program") {
                if (new Date().getTime() > datetime.parseISO8601Date(item.EndDate).getTime() || new Date().getTime() < datetime.parseISO8601Date(item.StartDate).getTime()) {
                    return false;
                }
            }

            //var mediaType = item.MediaType;
            return getPlayer(item, {}) != null;
        };

        self.toggleAspectRatio = function (player) {

            player = player || self._currentPlayer;

            if (player) {
                var current = self.getAspectRatio(player);

                var supported = self.getSupportedAspectRatios(player);

                var index = -1;
                for (var i = 0, length = supported.length; i < length; i++) {
                    if (supported[i].id === current) {
                        index = i;
                        break;
                    }
                }

                index++;
                if (index >= supported.length) {
                    index = 0;
                }

                self.setAspectRatio(supported[index].id, player);
            }
        };

        self.setAspectRatio = function (val, player) {

            player = player || self._currentPlayer;

            if (player && player.setAspectRatio) {

                player.setAspectRatio(val);
            }
        };

        self.getSupportedAspectRatios = function (player) {

            player = player || self._currentPlayer;

            if (player && player.getSupportedAspectRatios) {
                return player.getSupportedAspectRatios();
            }

            return [];
        };

        self.getAspectRatio = function (player) {

            player = player || self._currentPlayer;

            if (player && player.getAspectRatio) {
                return player.getAspectRatio();
            }
        };

        var brightnessOsdLoaded;
        self.setBrightness = function (val, player) {

            player = player || self._currentPlayer;

            if (player) {

                if (!brightnessOsdLoaded) {
                    brightnessOsdLoaded = true;
                    require(['brightnessOsd']);
                }
                player.setBrightness(val);
            }
        };

        self.getBrightness = function (player) {

            player = player || self._currentPlayer;

            if (player) {
                return player.getBrightness();
            }
        };

        self.setVolume = function (val, player) {

            player = player || self._currentPlayer;

            if (player) {
                player.setVolume(val);
            }
        };

        self.getVolume = function (player) {

            player = player || self._currentPlayer;

            if (player) {
                return player.getVolume();
            }
        };

        self.volumeUp = function (player) {

            player = player || self._currentPlayer;

            if (player) {
                player.volumeUp();
            }
        };

        self.volumeDown = function (player) {

            player = player || self._currentPlayer;

            if (player) {
                player.volumeDown();
            }
        };

        self.changeAudioStreamIndex = function (player) {

            player = player || self._currentPlayer;
            if (player && !enableLocalPlaylistManagement(player)) {
                return player.changeAudioStreamIndex();
            }
        };

        self.changeSubtitleStreamIndex = function (player) {

            player = player || self._currentPlayer;
            if (player && !enableLocalPlaylistManagement(player)) {
                return player.changeSubtitleStreamIndex();
            }
        };

        self.getAudioStreamIndex = function (player) {

            player = player || self._currentPlayer;
            if (player && !enableLocalPlaylistManagement(player)) {
                return player.getAudioStreamIndex();
            }

            return getPlayerData(player).audioStreamIndex;
        };

        self.setAudioStreamIndex = function (index, player) {

            player = player || self._currentPlayer;
            if (player && !enableLocalPlaylistManagement(player)) {
                return player.setAudioStreamIndex(index);
            }

            if (getPlayerData(player).streamInfo.playMethod === 'Transcode' || !player.canSetAudioStreamIndex()) {

                changeStream(player, getCurrentTicks(player), { AudioStreamIndex: index });
                getPlayerData(player).audioStreamIndex = index;

            } else {
                player.setAudioStreamIndex(index);
                getPlayerData(player).audioStreamIndex = index;
            }
        };

        self.getMaxStreamingBitrate = function (player) {

            player = player || self._currentPlayer;
            if (player && player.getMaxStreamingBitrate) {
                return player.getMaxStreamingBitrate();
            }

            return getPlayerData(player).maxStreamingBitrate || appSettings.maxStreamingBitrate();
        };

        self.enableAutomaticBitrateDetection = function (player) {

            player = player || self._currentPlayer;
            if (player && player.enableAutomaticBitrateDetection) {
                return player.enableAutomaticBitrateDetection();
            }

            return appSettings.enableAutomaticBitrateDetection();
        };

        self.setMaxStreamingBitrate = function (options, player) {

            player = player || self._currentPlayer;
            if (player && player.setMaxStreamingBitrate) {
                return player.setMaxStreamingBitrate(options);
            }

            var promise;
            if (options.enableAutomaticBitrateDetection) {
                appSettings.enableAutomaticBitrateDetection(true);
                promise = connectionManager.getApiClient(self.currentItem(player).ServerId).detectBitrate(true);
            } else {
                appSettings.enableAutomaticBitrateDetection(false);
                promise = Promise.resolve(options.maxBitrate);
            }

            promise.then(function (bitrate) {

                appSettings.maxStreamingBitrate(bitrate);

                changeStream(player, getCurrentTicks(player), {
                    MaxStreamingBitrate: bitrate
                });
            });
        };

        self.isFullscreen = function (player) {

            player = player || self._currentPlayer;
            if (!player.isLocalPlayer || player.isFullscreen) {
                return player.isFullscreen();
            }

            return fullscreenManager.isFullScreen();
        };

        self.toggleFullscreen = function (player) {

            player = player || self._currentPlayer;
            if (!player.isLocalPlayer || player.toggleFulscreen) {
                return player.toggleFulscreen();
            }

            if (fullscreenManager.isFullScreen()) {
                fullscreenManager.exitFullscreen();
            } else {
                fullscreenManager.requestFullscreen();
            }
        };

        self.togglePictureInPicture = function (player) {
            player = player || self._currentPlayer;
            return player.togglePictureInPicture();
        };

        self.getSubtitleStreamIndex = function (player) {

            player = player || self._currentPlayer;

            if (player && !enableLocalPlaylistManagement(player)) {
                return player.getSubtitleStreamIndex();
            }

            if (!player) {
                throw new Error('player cannot be null');
            }

            return getPlayerData(player).subtitleStreamIndex;
        };

        self.setSubtitleStreamIndex = function (index, player) {

            player = player || self._currentPlayer;
            if (player && !enableLocalPlaylistManagement(player)) {
                return player.setSubtitleStreamIndex(index);
            }

            var currentStream = getCurrentSubtitleStream(player);

            var newStream = getSubtitleStream(player, index);

            if (!currentStream && !newStream) {
                return;
            }

            var selectedTrackElementIndex = -1;

            var currentPlayMethod = (getPlayerData(player).streamInfo || {}).playMethod;

            if (currentStream && !newStream) {

                if (currentStream.DeliveryMethod === 'Encode' || (currentStream.DeliveryMethod === 'Embed' && currentPlayMethod === 'Transcode')) {

                    // Need to change the transcoded stream to remove subs
                    changeStream(player, getCurrentTicks(player), { SubtitleStreamIndex: -1 });
                }
            }
            else if (!currentStream && newStream) {

                if (newStream.DeliveryMethod === 'External') {
                    selectedTrackElementIndex = index;
                } else if (newStream.DeliveryMethod === 'Embed' && currentPlayMethod !== 'Transcode') {
                    selectedTrackElementIndex = index;
                } else {

                    // Need to change the transcoded stream to add subs
                    changeStream(player, getCurrentTicks(player), { SubtitleStreamIndex: index });
                }
            }
            else if (currentStream && newStream) {

                // Switching tracks
                // We can handle this clientside if the new track is external or the new track is embedded and we're not transcoding
                if (newStream.DeliveryMethod === 'External' || (newStream.DeliveryMethod === 'Embed' && currentPlayMethod !== 'Transcode')) {
                    selectedTrackElementIndex = index;

                    // But in order to handle this client side, if the previous track is being added via transcoding, we'll have to remove it
                    if (currentStream.DeliveryMethod !== 'External' && currentStream.DeliveryMethod !== 'Embed') {
                        changeStream(player, getCurrentTicks(player), { SubtitleStreamIndex: -1 });
                    }
                } else {

                    // Need to change the transcoded stream to add subs
                    changeStream(player, getCurrentTicks(player), { SubtitleStreamIndex: index });
                }
            }

            player.setSubtitleStreamIndex(selectedTrackElementIndex);

            getPlayerData(player).subtitleStreamIndex = index;
        };

        self.seek = function (ticks, player) {

            ticks = Math.max(0, ticks);

            player = player || self._currentPlayer;
            if (player && !enableLocalPlaylistManagement(player)) {
                return player.seek(ticks);
            }

            changeStream(player, ticks);
        };

        // Returns true if the player can seek using native client-side seeking functions
        function canPlayerSeek(player) {

            if (!player) {
                throw new Error('player cannot be null');
            }

            var playerData = getPlayerData(player);

            var currentSrc = (playerData.streamInfo.url || '').toLowerCase();

            if (currentSrc.indexOf('.m3u8') !== -1) {
                return true;
            }

            if (player.seekable) {
                return player.seekable();
            }

            if (playerData.streamInfo.playMethod === 'Transcode') {
                return false;
            }

            return player.duration();
        }

        function changeStream(player, ticks, params) {

            if (canPlayerSeek(player) && params == null) {

                player.currentTime(parseInt(ticks / 10000));
                return;
            }

            params = params || {};

            var liveStreamId = getPlayerData(player).streamInfo.liveStreamId;
            var playSessionId = getPlayerData(player).streamInfo.playSessionId;

            var playerData = getPlayerData(player);
            var currentItem = playerData.streamInfo.item;

            player.getDeviceProfile(currentItem, {

                isRetry: params.EnableDirectPlay === false

            }).then(function (deviceProfile) {

                var audioStreamIndex = params.AudioStreamIndex == null ? getPlayerData(player).audioStreamIndex : params.AudioStreamIndex;
                var subtitleStreamIndex = params.SubtitleStreamIndex == null ? getPlayerData(player).subtitleStreamIndex : params.SubtitleStreamIndex;

                var currentMediaSource = playerData.streamInfo.mediaSource;
                var apiClient = connectionManager.getApiClient(currentItem.ServerId);

                if (ticks) {
                    ticks = parseInt(ticks);
                }

                var maxBitrate = params.MaxStreamingBitrate || self.getMaxStreamingBitrate(player);

                getPlaybackInfo(player, apiClient, currentItem, deviceProfile, maxBitrate, ticks, currentMediaSource, audioStreamIndex, subtitleStreamIndex, liveStreamId, params.EnableDirectPlay, params.EnableDirectStream, params.AllowVideoStreamCopy, params.AllowAudioStreamCopy).then(function (result) {

                    if (validatePlaybackInfoResult(self, result)) {

                        currentMediaSource = result.MediaSources[0];

                        var streamInfo = createStreamInfo(apiClient, currentItem.MediaType, currentItem, currentMediaSource, ticks);

                        streamInfo.fullscreen = currentPlayOptions.fullscreen;

                        if (!streamInfo.url) {
                            showPlaybackInfoErrorMessage(self, 'NoCompatibleStream');
                            self.nextTrack();
                            return;
                        }

                        getPlayerData(player).subtitleStreamIndex = subtitleStreamIndex;
                        getPlayerData(player).audioStreamIndex = audioStreamIndex;
                        getPlayerData(player).maxStreamingBitrate = maxBitrate;

                        changeStreamToUrl(apiClient, player, playSessionId, streamInfo);
                    }
                });
            });
        }

        function changeStreamToUrl(apiClient, player, playSessionId, streamInfo, newPositionTicks) {

            var playerData = getPlayerData(player);

            playerData.isChangingStream = true;

            if (playerData.MediaType === "Video") {
                apiClient.stopActiveEncodings(playSessionId).then(function () {

                    setSrcIntoPlayer(apiClient, player, streamInfo);
                });

            } else {
                setSrcIntoPlayer(apiClient, player, streamInfo);
            }
        }

        function setSrcIntoPlayer(apiClient, player, streamInfo) {

            player.play(streamInfo).then(function () {

                var playerData = getPlayerData(player);

                playerData.isChangingStream = false;
                playerData.streamInfo = streamInfo;

                sendProgressUpdate(player, 'timeupdate');
            }, function (e) {
                onPlaybackError.call(player, e, {
                    type: 'mediadecodeerror'
                });
            });
        }

        function translateItemsForPlayback(items, options) {

            var firstItem = items[0];
            var promise;

            var serverId = firstItem.ServerId;

            if (firstItem.Type === "Program") {

                promise = getItemsForPlayback(serverId, {
                    Ids: firstItem.ChannelId,
                });
            }
            else if (firstItem.Type === "Playlist") {

                promise = getItemsForPlayback(serverId, {
                    ParentId: firstItem.Id,
                });
            }
            else if (firstItem.Type === "MusicArtist") {

                promise = getItemsForPlayback(serverId, {
                    ArtistIds: firstItem.Id,
                    Filters: "IsNotFolder",
                    Recursive: true,
                    SortBy: "SortName",
                    MediaTypes: "Audio"
                });

            }
            else if (firstItem.MediaType === "Photo") {

                promise = getItemsForPlayback(serverId, {
                    ParentId: firstItem.ParentId,
                    Filters: "IsNotFolder",
                    Recursive: true,
                    SortBy: "SortName",
                    MediaTypes: "Photo,Video"
                }).then(function (result) {

                    var items = result.Items;

                    var index = items.map(function (i) {
                        return i.Id;

                    }).indexOf(firstItem.Id);

                    if (index === -1) {
                        index = 0;
                    }

                    options.playStartIndex = index;

                    return Promise.resolve(result);

                });
            }
            else if (firstItem.Type === "MusicGenre") {

                promise = getItemsForPlayback(serverId, {
                    GenreIds: firstItem.Id,
                    Filters: "IsNotFolder",
                    Recursive: true,
                    SortBy: "SortName",
                    MediaTypes: "Audio"
                });
            }
            else if (firstItem.IsFolder) {

                promise = getItemsForPlayback(serverId, {
                    ParentId: firstItem.Id,
                    Filters: "IsNotFolder",
                    Recursive: true,
                    SortBy: "SortName",
                    MediaTypes: "Audio,Video"
                });
            }
            else if (firstItem.Type === "Episode" && items.length === 1 && getPlayer(firstItem, options).supportsProgress !== false) {

                promise = new Promise(function (resolve, reject) {
                    var apiClient = connectionManager.getApiClient(firstItem.ServerId);

                    apiClient.getCurrentUser().then(function (user) {

                        if (!user.Configuration.EnableNextEpisodeAutoPlay || !firstItem.SeriesId) {
                            resolve(null);
                            return;
                        }

                        apiClient.getEpisodes(firstItem.SeriesId, {
                            IsVirtualUnaired: false,
                            IsMissing: false,
                            UserId: apiClient.getCurrentUserId(),
                            Fields: "MediaSources,Chapters"

                        }).then(function (episodesResult) {

                            var foundItem = false;
                            episodesResult.Items = episodesResult.Items.filter(function (e) {

                                if (foundItem) {
                                    return true;
                                }
                                if (e.Id === firstItem.Id) {
                                    foundItem = true;
                                    return true;
                                }

                                return false;
                            });
                            episodesResult.TotalRecordCount = episodesResult.Items.length;
                            resolve(episodesResult);
                        }, reject);
                    });
                });
            }

            if (promise) {
                return promise.then(function (result) {

                    return result ? result.Items : items;
                });
            } else {
                return Promise.resolve(items);
            }
        }

        self.play = function (options) {

            normalizePlayOptions(options);

            if (self._currentPlayer) {
                if (options.enableRemotePlayers === false && !self._currentPlayer.isLocalPlayer) {
                    return Promise.reject();
                }

                if (!self._currentPlayer.isLocalPlayer) {
                    return self._currentPlayer.play(options);
                }
            }

            if (options.fullscreen) {
                loading.show();
            }

            if (options.items) {

                return translateItemsForPlayback(options.items, options).then(function (items) {

                    return playWithIntros(items, options);
                });

            } else {

                if (!options.serverId) {
                    throw new Error('serverId required!');
                }

                return getItemsForPlayback(options.serverId, {

                    Ids: options.ids.join(',')

                }).then(function (result) {

                    return translateItemsForPlayback(result.Items, options).then(function (items) {

                        return playWithIntros(items, options);
                    });

                });
            }
        };

        function getPlayerData(player) {

            if (!player) {
                throw new Error('player cannot be null');
            }
            if (!player.name) {
                throw new Error('player name cannot be null');
            }
            var state = playerStates[player.name];

            if (!state) {
                playerStates[player.name] = {};
                state = playerStates[player.name];
            }

            return player;
        }

        self.getPlayerState = function (player) {

            player = player || self._currentPlayer;

            if (!player) {
                throw new Error('player cannot be null');
            }

            if (!enableLocalPlaylistManagement(player)) {
                return player.getPlayerState();
            }

            var playerData = getPlayerData(player);
            var streamInfo = playerData.streamInfo;
            var item = streamInfo ? streamInfo.item : null;
            var mediaSource = streamInfo ? streamInfo.mediaSource : null;

            var state = {
                PlayState: {}
            };

            if (player) {

                state.PlayState.VolumeLevel = player.getVolume();
                state.PlayState.IsMuted = player.isMuted();
                state.PlayState.IsPaused = player.paused();
                state.PlayState.RepeatMode = self.getRepeatMode(player);
                state.PlayState.MaxStreamingBitrate = self.getMaxStreamingBitrate(player);

                if (streamInfo) {
                    state.PlayState.PositionTicks = getCurrentTicks(player);

                    state.PlayState.SubtitleStreamIndex = playerData.subtitleStreamIndex;
                    state.PlayState.AudioStreamIndex = playerData.audioStreamIndex;

                    state.PlayState.PlayMethod = playerData.streamInfo.playMethod;

                    if (mediaSource) {
                        state.PlayState.LiveStreamId = mediaSource.LiveStreamId;
                    }
                    state.PlayState.PlaySessionId = playerData.streamInfo.playSessionId;
                }
            }

            if (mediaSource) {

                state.PlayState.MediaSourceId = mediaSource.Id;

                state.NowPlayingItem = {
                    RunTimeTicks: mediaSource.RunTimeTicks
                };

                state.PlayState.CanSeek = (mediaSource.RunTimeTicks || 0) > 0 || canPlayerSeek(player);
            }

            if (item) {

                state.NowPlayingItem = getNowPlayingItemForReporting(player, item, mediaSource);
            }

            state.MediaSource = mediaSource;

            return Promise.resolve(state);
        };

        self.duration = function (player) {

            player = player || self._currentPlayer;

            if (player && !enableLocalPlaylistManagement(player)) {
                return player.duration();
            }

            if (!player) {
                throw new Error('player cannot be null');
            }

            var streamInfo = getPlayerData(player).streamInfo;

            if (streamInfo && streamInfo.mediaSource && streamInfo.mediaSource.RunTimeTicks) {
                return streamInfo.mediaSource.RunTimeTicks;
            }

            var playerDuration = player.duration();

            if (playerDuration) {
                playerDuration *= 10000;
            }

            return playerDuration;
        };

        function getCurrentTicks(player) {

            if (!player) {
                throw new Error('player cannot be null');
            }

            var playerTime = Math.floor(10000 * (player || self._currentPlayer).currentTime());
            playerTime += getPlayerData(player).streamInfo.transcodingOffsetTicks || 0;

            return playerTime;
        }

        // Only used internally
        self.getCurrentTicks = getCurrentTicks;

        function playPhotos(items, options, user) {

            var player = getPlayer(items[0], options);

            loading.hide();

            options.items = items;

            return player.play(options);
        }

        function playWithIntros(items, options, user) {

            var firstItem = items[0];

            if (firstItem.MediaType === "Photo") {

                return playPhotos(items, options, user);
            }

            var apiClient = connectionManager.getApiClient(firstItem.ServerId);

            return getIntros(firstItem, apiClient, options).then(function (intros) {

                items = intros.Items.concat(items);

                currentPlayOptions = options;

                // Needed by players that manage their own playlist
                options.items = items;

                return playInternal(items[0], options, function () {

                    self._playQueueManager.setPlaylist(items);

                    var playIndex = 0;
                    setPlaylistState(items[playIndex].PlaylistItemId, playIndex);
                    loading.hide();
                });
            });
        }

        // Set playlist state. Using a method allows for overloading in derived player implementations
        function setPlaylistState(playlistItemId, index) {

            if (!isNaN(index)) {
                self._playQueueManager.setPlaylistState(playlistItemId, index);
            }
        }

        function playInternal(item, playOptions, onPlaybackStartedFn) {

            if (item.IsPlaceHolder) {
                loading.hide();
                showPlaybackInfoErrorMessage(self, 'PlaceHolder', true);
                return Promise.reject();
            }

            // Normalize defaults to simplfy checks throughout the process
            normalizePlayOptions(playOptions);

            if (playOptions.isFirstItem) {
                playOptions.isFirstItem = false;
            } else {
                playOptions.isFirstItem = true;
            }

            return runInterceptors(item, playOptions).then(function () {

                if (playOptions.fullscreen) {
                    loading.show();
                }

                if (item.MediaType === 'Video' && isServerItem(item) && appSettings.enableAutomaticBitrateDetection()) {

                    var apiClient = connectionManager.getApiClient(item.ServerId);
                    return apiClient.detectBitrate().then(function (bitrate) {

                        appSettings.maxStreamingBitrate(bitrate);

                        return playAfterBitrateDetect(connectionManager, bitrate, item, playOptions, onPlaybackStartedFn);

                    }, function () {

                        return playAfterBitrateDetect(connectionManager, appSettings.maxStreamingBitrate(), item, playOptions, onPlaybackStartedFn);
                    });

                } else {

                    return playAfterBitrateDetect(connectionManager, appSettings.maxStreamingBitrate(), item, playOptions, onPlaybackStartedFn);
                }

            }, function () {

                var player = self._currentPlayer;

                if (player) {
                    destroyPlayer(player);
                }
                setCurrentPlayerInternal(null);

                events.trigger(self, 'playbackcancelled');

                return Promise.reject();
            });
        }

        function destroyPlayer(player) {
            player.destroy();
            releaseResourceLocks(player);
        }

        function runInterceptors(item, playOptions) {

            return new Promise(function (resolve, reject) {

                var interceptors = pluginManager.ofType('preplayintercept');

                interceptors.sort(function (a, b) {
                    return (a.order || 0) - (b.order || 0);
                });

                if (!interceptors.length) {
                    resolve();
                    return;
                }

                loading.hide();

                var options = Object.assign({}, playOptions);

                options.mediaType = item.MediaType;
                options.item = item;

                runNextPrePlay(interceptors, 0, options, resolve, reject);
            });
        }

        function runNextPrePlay(interceptors, index, options, resolve, reject) {

            if (index >= interceptors.length) {
                resolve();
                return;
            }

            var interceptor = interceptors[index];

            interceptor.intercept(options).then(function () {

                runNextPrePlay(interceptors, index + 1, options, resolve, reject);

            }, reject);
        }

        function sendPlaybackListToPLayer(player, items, deviceProfile, maxBitrate, apiClient, startPosition) {

            return setStreamUrls(items, deviceProfile, maxBitrate, apiClient, startPosition).then(function () {
                return player.play({
                    items: items
                });
            });
        }

        function playAfterBitrateDetect(connectionManager, maxBitrate, item, playOptions, onPlaybackStartedFn) {

            var startPosition = playOptions.startPositionTicks;

            var player = getPlayer(item, playOptions);
            var activePlayer = self._currentPlayer;

            var promise;

            if (activePlayer) {

                // TODO: if changing players within the same playlist, this will cause nextItem to be null
                self._playNextAfterEnded = false;
                promise = onPlaybackChanging(activePlayer, player, item);
            } else {
                promise = Promise.resolve();
            }

            if (!isServerItem(item) || item.MediaType === 'Game') {
                return promise.then(function () {
                    var streamInfo = createStreamInfoFromUrlItem(item);
                    streamInfo.fullscreen = playOptions.fullscreen;
                    getPlayerData(player).isChangingStream = false;
                    return player.play(streamInfo).then(function () {
                        loading.hide();
                        onPlaybackStartedFn();
                        onPlaybackStarted(player, playOptions, streamInfo);
                    }, function () {
                        // TODO: show error message
                        self.stop(player);
                    });
                });
            }

            return Promise.all([promise, player.getDeviceProfile(item)]).then(function (responses) {

                var deviceProfile = responses[1];

                var apiClient = connectionManager.getApiClient(item.ServerId);

                if (player && !enableLocalPlaylistManagement(player)) {

                    return sendPlaybackListToPLayer(player, playOptions.items, deviceProfile, maxBitrate, apiClient, startPosition);
                }

                return getPlaybackMediaSource(player, apiClient, deviceProfile, maxBitrate, item, startPosition).then(function (mediaSource) {

                    var streamInfo = createStreamInfo(apiClient, item.MediaType, item, mediaSource, startPosition);

                    streamInfo.fullscreen = playOptions.fullscreen;

                    getPlayerData(player).isChangingStream = false;
                    getPlayerData(player).maxStreamingBitrate = maxBitrate;

                    return player.play(streamInfo).then(function () {
                        loading.hide();
                        onPlaybackStartedFn();
                        onPlaybackStarted(player, playOptions, streamInfo, mediaSource);
                    }, function () {

                        // TODO: Improve this because it will report playback start on a failure
                        onPlaybackStartedFn();
                        onPlaybackStarted(player, playOptions, streamInfo, mediaSource);
                        setTimeout(function (err) {
                            onPlaybackError.call(player, err, {
                                type: 'mediadecodeerror'
                            });
                        }, 100);
                    });
                });
            });
        }

        function createStreamInfo(apiClient, type, item, mediaSource, startPosition, forceTranscoding) {

            var mediaUrl;
            var contentType;
            var transcodingOffsetTicks = 0;
            var playerStartPositionTicks = startPosition;
            var liveStreamId = mediaSource.LiveStreamId;

            var playMethod = 'Transcode';

            var mediaSourceContainer = (mediaSource.Container || '').toLowerCase();
            var directOptions;

            if (type === 'Video') {

                contentType = getMimeType('video', mediaSourceContainer);

                if (mediaSource.enableDirectPlay && !forceTranscoding) {
                    mediaUrl = mediaSource.Path;

                    playMethod = 'DirectPlay';

                } else {

                    if (mediaSource.SupportsDirectStream && !forceTranscoding) {

                        directOptions = {
                            Static: true,
                            mediaSourceId: mediaSource.Id,
                            deviceId: apiClient.deviceId(),
                            api_key: apiClient.accessToken()
                        };

                        if (mediaSource.ETag) {
                            directOptions.Tag = mediaSource.ETag;
                        }

                        if (mediaSource.LiveStreamId) {
                            directOptions.LiveStreamId = mediaSource.LiveStreamId;
                        }

                        mediaUrl = apiClient.getUrl('Videos/' + item.Id + '/stream.' + mediaSourceContainer, directOptions);

                        playMethod = 'DirectStream';
                    } else if (mediaSource.SupportsTranscoding) {

                        mediaUrl = apiClient.getUrl(mediaSource.TranscodingUrl);

                        if (mediaSource.TranscodingSubProtocol === 'hls') {

                            contentType = 'application/x-mpegURL';

                        } else {

                            playerStartPositionTicks = null;
                            contentType = getMimeType('video', mediaSource.TranscodingContainer);

                            if (mediaUrl.toLowerCase().indexOf('copytimestamps=true') === -1) {
                                transcodingOffsetTicks = startPosition || 0;
                            }
                        }
                    }
                }

            } else if (type === 'Audio') {

                contentType = getMimeType('audio', mediaSourceContainer);

                if (mediaSource.enableDirectPlay && !forceTranscoding) {

                    mediaUrl = mediaSource.Path;

                    playMethod = 'DirectPlay';

                } else {

                    if (mediaSource.StreamUrl) {

                        playMethod = 'Transcode';
                        mediaUrl = mediaSource.StreamUrl;
                    }

                    else if (mediaSource.SupportsDirectStream && !forceTranscoding) {

                        directOptions = {
                            Static: true,
                            mediaSourceId: mediaSource.Id,
                            deviceId: apiClient.deviceId(),
                            api_key: apiClient.accessToken()
                        };

                        if (mediaSource.ETag) {
                            directOptions.Tag = mediaSource.ETag;
                        }

                        if (mediaSource.LiveStreamId) {
                            directOptions.LiveStreamId = mediaSource.LiveStreamId;
                        }

                        mediaUrl = apiClient.getUrl('Audio/' + item.Id + '/stream.' + mediaSourceContainer, directOptions);

                        playMethod = 'DirectStream';

                    } else if (mediaSource.SupportsTranscoding) {

                        mediaUrl = apiClient.getUrl(mediaSource.TranscodingUrl);

                        if (mediaSource.TranscodingSubProtocol === 'hls') {

                            contentType = 'application/x-mpegURL';
                        } else {

                            transcodingOffsetTicks = startPosition || 0;
                            playerStartPositionTicks = null;
                            contentType = getMimeType('audio', mediaSource.TranscodingContainer);
                        }
                    }
                }

            } else if (type === 'Game') {

                mediaUrl = mediaSource.Path;
                playMethod = 'DirectPlay';
            }

            // Fallback (used for offline items)
            if (!mediaUrl && mediaSource.SupportsDirectPlay) {
                mediaUrl = mediaSource.Path;
                playMethod = 'DirectPlay';
            }

            var resultInfo = {
                url: mediaUrl,
                mimeType: contentType,
                transcodingOffsetTicks: transcodingOffsetTicks,
                playMethod: playMethod,
                playerStartPositionTicks: playerStartPositionTicks,
                item: item,
                mediaSource: mediaSource,
                textTracks: getTextTracks(apiClient, mediaSource),
                // duplicate this temporarily
                tracks: getTextTracks(apiClient, mediaSource),
                mediaType: type,
                liveStreamId: liveStreamId,
                playSessionId: getParam('playSessionId', mediaUrl),
                title: item.Name
            };

            var backdropUrl = backdropImageUrl(apiClient, item, {});
            if (backdropUrl) {
                resultInfo.backdropUrl = backdropUrl;
            }

            return resultInfo;
        }

        function getTextTracks(apiClient, mediaSource) {

            var subtitleStreams = mediaSource.MediaStreams.filter(function (s) {
                return s.Type === 'Subtitle';
            });

            var textStreams = subtitleStreams.filter(function (s) {
                return s.DeliveryMethod === 'External';
            });

            var tracks = [];

            for (var i = 0, length = textStreams.length; i < length; i++) {

                var textStream = textStreams[i];
                var textStreamUrl = !textStream.IsExternalUrl ? apiClient.getUrl(textStream.DeliveryUrl) : textStream.DeliveryUrl;

                tracks.push({
                    url: textStreamUrl,
                    language: (textStream.Language || 'und'),
                    isDefault: textStream.Index === mediaSource.DefaultSubtitleStreamIndex,
                    index: textStream.Index,
                    format: textStream.Codec
                });
            }

            return tracks;
        }

        function getPlaybackMediaSource(player, apiClient, deviceProfile, maxBitrate, item, startPosition, callback) {

            if (item.MediaType === "Video") {

                //Dashboard.showModalLoadingMsg();
            }

            return getPlaybackInfo(player, apiClient, item, deviceProfile, maxBitrate, startPosition).then(function (playbackInfoResult) {

                if (validatePlaybackInfoResult(self, playbackInfoResult)) {

                    return getOptimalMediaSource(apiClient, item, playbackInfoResult.MediaSources).then(function (mediaSource) {
                        if (mediaSource) {

                            if (mediaSource.RequiresOpening) {

                                return getLiveStream(player, apiClient, item, playbackInfoResult.PlaySessionId, deviceProfile, maxBitrate, startPosition, mediaSource, null, null).then(function (openLiveStreamResult) {

                                    return supportsDirectPlay(apiClient, item, openLiveStreamResult.MediaSource).then(function (result) {

                                        openLiveStreamResult.MediaSource.enableDirectPlay = result;
                                        return openLiveStreamResult.MediaSource;
                                    });

                                });

                            } else {
                                return mediaSource;
                            }
                        } else {
                            //Dashboard.hideModalLoadingMsg();
                            showPlaybackInfoErrorMessage(self, 'NoCompatibleStream');
                            return Promise.reject();
                        }
                    });
                } else {
                    return Promise.reject();
                }
            });
        }

        function getPlayer(item, playOptions) {

            var serverItem = isServerItem(item);

            return getAutomaticPlayers(self).filter(function (p) {

                if (p.canPlayMediaType(item.MediaType)) {

                    if (serverItem) {
                        if (p.canPlayItem) {
                            return p.canPlayItem(item, playOptions);
                        }
                        return true;
                    }

                    else if (p.canPlayUrl) {
                        return p.canPlayUrl(item.Url);
                    }
                }

                return false;

            })[0];
        }

        self.setCurrentPlaylistItem = function (playlistItemId, player) {

            player = player || self._currentPlayer;
            if (player && !enableLocalPlaylistManagement(player)) {
                return player.setCurrentPlaylistItem(playlistItemId);
            }

            var newItem;
            var newItemIndex;
            var playlist = self._playQueueManager.getPlaylist();

            for (var i = 0, length = playlist.length; i < length; i++) {
                if (playlist[i].PlaylistItemId === playlistItemId) {
                    newItem = playlist[i];
                    newItemIndex = i;
                    break;
                }
            }

            if (newItem) {
                var playOptions = Object.assign({}, currentPlayOptions, {
                    startPositionTicks: 0
                });

                playInternal(newItem, playOptions, function () {
                    setPlaylistState(newItem.PlaylistItemId, newItemIndex);
                });
            }
        };

        self.removeFromPlaylist = function (playlistItemIds, player) {

            if (!playlistItemIds) {
                throw new Error('Invalid playlistItemIds');
            }

            player = player || self._currentPlayer;
            if (player && !enableLocalPlaylistManagement(player)) {
                return player.removeFromPlaylist(playlistItemIds);
            }

            var removeResult = self._playQueueManager.removeFromPlaylist(playlistItemIds);

            if (removeResult.result === 'empty') {
                return self.stop(player);
            }

            var isCurrentIndex = removeResult.isCurrentIndex;

            events.trigger(player, 'playlistitemremove', [
                {
                    playlistItemIds: playlistItemIds
                }]);

            if (isCurrentIndex) {

                return self.setCurrentPlaylistItem(self._playQueueManager.getPlaylist()[0].PlaylistItemId, player);
            }

            return Promise.resolve();
        };

        self.movePlaylistItem = function (playlistItemId, newIndex, player) {

            player = player || self._currentPlayer;
            if (player && !enableLocalPlaylistManagement(player)) {
                return player.movePlaylistItem(playlistItemId, newIndex);
            }

            var moveResult = self._playQueueManager.movePlaylistItem(playlistItemId, newIndex);

            if (moveResult.result === 'noop') {
                return;
            }

            events.trigger(player, 'playlistitemmove', [
                {
                    playlistItemId: moveResult.playlistItemId,
                    newIndex: moveResult.newIndex
                }]);
        };

        self.getCurrentPlaylistIndex = function (player) {

            player = player || self._currentPlayer;
            if (player && !enableLocalPlaylistManagement(player)) {
                return player.getCurrentPlaylistIndex();
            }

            return self._playQueueManager.getCurrentPlaylistIndex();
        };

        self.getCurrentPlaylistItemId = function (player) {

            player = player || self._currentPlayer;
            if (player && !enableLocalPlaylistManagement(player)) {
                return player.getCurrentPlaylistItemId();
            }

            return self._playQueueManager.getCurrentPlaylistItemId();
        };

        self.nextTrack = function (player) {

            player = player || self._currentPlayer;
            if (player && !enableLocalPlaylistManagement(player)) {
                return player.nextTrack();
            }

            var newItemInfo = self._playQueueManager.getNextItemInfo();

            if (newItemInfo) {

                console.log('playing next track');

                var playOptions = Object.assign({}, currentPlayOptions, {
                    startPositionTicks: 0
                });

                playInternal(newItemInfo.item, playOptions, function () {
                    setPlaylistState(newItemInfo.item.PlaylistItemId, newItemInfo.index);
                });
            }
        };

        self.previousTrack = function (player) {

            player = player || self._currentPlayer;
            if (player && !enableLocalPlaylistManagement(player)) {
                return player.previousTrack();
            }

            var newIndex = self.getCurrentPlaylistIndex(player) - 1;
            if (newIndex >= 0) {

                var playlist = self._playQueueManager.getPlaylist();
                var newItem = playlist[newIndex];

                if (newItem) {

                    var playOptions = Object.assign({}, currentPlayOptions, {
                        startPositionTicks: 0
                    });

                    playInternal(newItem, playOptions, function () {
                        setPlaylistState(newItem.PlaylistItemId, newIndex);
                    });
                }
            }
        };

        self.queue = function (options, player) {
            queue(options, '', player);
        };

        self.queueNext = function (options, player) {
            queue(options, 'next', player);
        };

        function queue(options, mode, player) {

            player = player || self._currentPlayer;

            if (!player) {
                return self.play(options);
            }

            if (options.items) {

                return translateItemsForPlayback(options.items, options).then(function (items) {

                    // TODO: Handle options.playStartIndex for photos
                    queueAll(items, mode, player);

                });

            } else {

                if (!options.serverId) {
                    throw new Error('serverId required!');
                }

                return getItemsForPlayback(options.serverId, {

                    Ids: options.ids.join(',')

                }).then(function (result) {

                    return translateItemsForPlayback(result.Items, options).then(function (items) {

                        // TODO: Handle options.playStartIndex for photos
                        queueAll(items, mode, player);

                    });
                });
            }
        }

        function queueAll(items, mode, player) {

            if (!items.length) {
                return;
            }

            var queueDirectToPlayer = player && !enableLocalPlaylistManagement(player);

            if (queueDirectToPlayer) {

                var apiClient = connectionManager.getApiClient(items[0].ServerId);

                player.getDeviceProfile(items[0]).then(function (profile) {

                    setStreamUrls(items, profile, self.getMaxStreamingBitrate(player), apiClient, 0).then(function () {

                        if (mode === 'next') {
                            player.queueNext(items);
                        } else {
                            player.queue(items);
                        }
                    });
                });

                return;
            }

            if (mode === 'next') {
                self._playQueueManager.queueNext(items);
            } else {
                self._playQueueManager.queue(items);
            }
        }

        function onPlaybackStarted(player, playOptions, streamInfo, mediaSource) {

            if (!player) {
                throw new Error('player cannot be null');
            }

            setCurrentPlayerInternal(player);

            var playerData = getPlayerData(player);

            playerData.streamInfo = streamInfo;

            if (mediaSource) {
                playerData.audioStreamIndex = mediaSource.DefaultAudioStreamIndex;
                playerData.subtitleStreamIndex = mediaSource.DefaultSubtitleStreamIndex;
            } else {
                playerData.audioStreamIndex = null;
                playerData.subtitleStreamIndex = null;
            }

            self._playNextAfterEnded = true;
            var isFirstItem = playOptions.isFirstItem;
            var fullscreen = playOptions.fullscreen;

            self.getPlayerState(player).then(function (state) {

                reportPlayback(state, getPlayerData(player).streamInfo.item.ServerId, 'reportPlaybackStart');

                state.IsFirstItem = isFirstItem;
                state.IsFullscreen = fullscreen;
                events.trigger(player, 'playbackstart', [state]);
                events.trigger(self, 'playbackstart', [player, state]);

                acquireResourceLocks(player, streamInfo.mediaType);
            });
        }

        function acquireResourceLocks(player, mediaType) {

            if (!player) {
                throw new Error('player cannot be null');
            }

            if (!player.isLocalPlayer || player.hasResourceLocks) {
                return;
            }

            var playerData = getPlayerData(player);
            playerData.resourceLocks = playerData.resourceLocks || {};
            var locks = playerData.resourceLocks;

            ensureLock(locks, 'network');
            ensureLock(locks, 'wake');

            if (mediaType === 'Video') {
                ensureLock(locks, 'screen');
            }
        }

        function ensureLock(locks, resourceType) {

            var prop = resourceType + 'Lock';
            var existingLock = locks[prop];
            if (existingLock) {
                existingLock.acquire();
                return;
            }

            require(['resourceLockManager'], function (resourceLockManager) {
                resourceLockManager.request(resourceType).then(function (resourceLock) {
                    locks[prop] = resourceLock;
                    resourceLock.acquire();
                }, function () {
                    // not supported or not allowed
                });
            });
        }

        function releaseResourceLocks(player) {

            if (!player) {
                throw new Error('player cannot be null');
            }

            if (!player.isLocalPlayer || player.hasResourceLocks) {
                return;
            }

            var playerData = getPlayerData(player);
            var locks = playerData.resourceLocks || {};

            if (locks.wakeLock) {
                locks.wakeLock.release();
            }
            if (locks.networkLock) {
                locks.networkLock.release();
            }
            if (locks.screenLock) {
                locks.screenLock.release();
            }
        }

        function enablePlaybackRetryWithTranscoding(streamInfo, errorType) {

            if (!streamInfo) {
                return false;
            }

            if (errorType === 'mediadecodeerror' || errorType === 'medianotsupported') {

                if (streamInfo.playMethod !== 'Transcode' && streamInfo.mediaSource.SupportsTranscoding) {

                    return true;
                }
            }

            if (errorType === 'network') {

                if (streamInfo.playMethod === 'DirectPlay' && streamInfo.mediaSource.IsRemote && streamInfo.mediaSource.SupportsTranscoding) {

                    return true;
                }
            }

            return false;
        }

        function onPlaybackError(e, error) {

            var player = this;
            error = error || {};

            // network
            // mediadecodeerror
            // medianotsupported
            var errorType = error.type;

            console.log('playbackmanager playback error type: ' + (errorType || ''));

            var streamInfo = getPlayerData(player).streamInfo;

            // Auto switch to transcoding
            if (enablePlaybackRetryWithTranscoding(streamInfo, errorType)) {

                var startTime = getCurrentTicks(player) || streamInfo.playerStartPositionTicks;

                changeStream(player, startTime, {

                    // force transcoding
                    EnableDirectPlay: false,
                    EnableDirectStream: false,
                    AllowVideoStreamCopy: false,
                    AllowAudioStreamCopy: false

                }, true);

                return;
            }

            self.nextTrack(player);
        }

        function onPlaybackStopped(e) {

            var player = this;

            if (getPlayerData(player).isChangingStream) {
                return;
            }

            // User clicked stop or content ended
            self.getPlayerState(player).then(function (state) {

                var streamInfo = getPlayerData(player).streamInfo;

                var nextItem = self._playNextAfterEnded ? self._playQueueManager.getNextItemInfo() : null;

                var nextMediaType = (nextItem ? nextItem.item.MediaType : null);

                var playbackStopInfo = {
                    player: player,
                    state: state,
                    nextItem: (nextItem ? nextItem.item : null),
                    nextMediaType: nextMediaType
                };

                state.NextMediaType = nextMediaType;

                if (isServerItem(streamInfo.item)) {

                    if (player.supportsProgress === false && state.PlayState && !state.PlayState.PositionTicks) {
                        state.PlayState.PositionTicks = streamInfo.item.RunTimeTicks;
                    }

                    reportPlayback(state, streamInfo.item.ServerId, 'reportPlaybackStopped');
                }

                state.NextItem = playbackStopInfo.nextItem;

                if (!nextItem) {
                    self._playQueueManager.reset();
                }

                events.trigger(player, 'playbackstop', [state]);
                events.trigger(self, 'playbackstop', [playbackStopInfo]);

                var newPlayer = nextItem ? getPlayer(nextItem.item, currentPlayOptions) : null;

                if (newPlayer !== player) {
                    destroyPlayer(player);
                    setCurrentPlayerInternal(null);
                }

                if (nextItem) {
                    self.nextTrack();
                }
            });
        }

        function onPlaybackChanging(activePlayer, newPlayer, newItem) {

            return self.getPlayerState(activePlayer).then(function (state) {
                var serverId = getPlayerData(activePlayer).streamInfo.item.ServerId;

                // User started playing something new while existing content is playing
                var promise;

                unbindStopped(activePlayer);

                if (activePlayer === newPlayer) {

                    // If we're staying with the same player, stop it
                    // TODO: remove second param
                    promise = activePlayer.stop(false, true);

                } else {

                    // If we're switching players, tear down the current one
                    // TODO: remove second param
                    promise = activePlayer.stop(true, true);
                }

                return promise.then(function () {

                    bindStopped(activePlayer);

                    reportPlayback(state, serverId, 'reportPlaybackStopped');

                    events.trigger(self, 'playbackstop', [{
                        player: activePlayer,
                        state: state,
                        nextItem: newItem,
                        nextMediaType: newItem.MediaType
                    }]);
                });
            });
        }

        function bindStopped(player) {

            if (enableLocalPlaylistManagement(player)) {
                events.off(player, 'stopped', onPlaybackStopped);
                events.on(player, 'stopped', onPlaybackStopped);
            }
        }

        function onPlaybackTimeUpdate(e) {
            var player = this;
            sendProgressUpdate(player, 'timeupdate');
        }

        function onPlaybackPause(e) {
            var player = this;
            sendProgressUpdate(player, 'pause');
        }

        function onPlaybackUnpause(e) {
            var player = this;
            sendProgressUpdate(player, 'unpause');
        }

        function onPlaybackVolumeChange(e) {
            var player = this;
            sendProgressUpdate(player, 'volumechange');
        }

        function onRepeatModeChange(e) {
            var player = this;
            sendProgressUpdate(player, 'repeatmodechange');
        }

        function unbindStopped(player) {

            events.off(player, 'stopped', onPlaybackStopped);
        }

        function initLegacyVolumeMethods(player) {
            player.getVolume = function () {
                return player.volume();
            };
            player.setVolume = function (val) {
                return player.volume(val);
            };
        }

        function initMediaPlayer(player) {

            players.push(player);
            players.sort(function (a, b) {

                return (a.priority || 0) - (b.priority || 0);
            });

            if (player.isLocalPlayer !== false) {
                player.isLocalPlayer = true;
            }

            player.currentState = {};

            if (!player.getVolume || !player.setVolume) {
                initLegacyVolumeMethods(player);
            }

            if (enableLocalPlaylistManagement(player)) {
                events.on(player, 'error', onPlaybackError);
                events.on(player, 'pause', onPlaybackPause);
                events.on(player, 'timeupdate', onPlaybackTimeUpdate);
                events.on(player, 'unpause', onPlaybackUnpause);
                events.on(player, 'volumechange', onPlaybackVolumeChange);
                events.on(player, 'repeatmodechange', onRepeatModeChange);
            }

            if (player.isLocalPlayer) {
                bindToFullscreenChange(player);
            }
            bindStopped(player);
        }

        events.on(pluginManager, 'registered', function (e, plugin) {

            if (plugin.type === 'mediaplayer') {

                initMediaPlayer(plugin);
            }
        });

        pluginManager.ofType('mediaplayer').map(initMediaPlayer);

        function sendProgressUpdate(player, progressEventName) {

            if (!player) {
                throw new Error('player cannot be null');
            }

            self.getPlayerState(player).then(function (state) {
                if (state.NowPlayingItem) {
                    var serverId = state.NowPlayingItem.ServerId;
                    reportPlayback(state, serverId, 'reportPlaybackProgress', progressEventName);
                }
            });
        }

        window.addEventListener("beforeunload", function (e) {

            var player = self._currentPlayer;

            // Try to report playback stopped before the browser closes
            if (player && self.isPlaying(player)) {
                self._playNextAfterEnded = false;
                onPlaybackStopped.call(player);
            }
        });

        events.on(serverNotifications, 'ServerShuttingDown', function (e, apiClient, data) {
            self.setDefaultPlayerActive();
        });

        events.on(serverNotifications, 'ServerRestarting', function (e, apiClient, data) {
            self.setDefaultPlayerActive();
        });
    }

    PlaybackManager.prototype.getCurrentPlayer = function () {
        return this._currentPlayer;
    };

    PlaybackManager.prototype.currentTime = function (player) {

        player = player || this._currentPlayer;
        if (player && !enableLocalPlaylistManagement(player)) {
            return player.currentTime();
        }

        return this.getCurrentTicks(player);
    };

    PlaybackManager.prototype.canQueue = function (item) {

        if (item.Type === 'MusicAlbum' || item.Type === 'MusicArtist' || item.Type === 'MusicGenre') {
            return this.canQueueMediaType('Audio');
        }
        return this.canQueueMediaType(item.MediaType);
    };

    PlaybackManager.prototype.canQueueMediaType = function (mediaType) {

        if (this._currentPlayer) {
            return this._currentPlayer.canPlayMediaType(mediaType);
        }

        return false;
    };

    PlaybackManager.prototype.isMuted = function (player) {

        player = player || this._currentPlayer;

        if (player) {
            return player.isMuted();
        }

        return false;
    };

    PlaybackManager.prototype.setMute = function (mute, player) {

        player = player || this._currentPlayer;

        if (player) {
            player.setMute(mute);
        }
    };

    PlaybackManager.prototype.toggleMute = function (mute, player) {

        player = player || this._currentPlayer;
        if (player) {

            if (player.toggleMute) {
                player.toggleMute();
            } else {
                player.setMute(!player.isMuted());
            }
        }
    };

    PlaybackManager.prototype.toggleDisplayMirroring = function () {
        this.enableDisplayMirroring(!this.enableDisplayMirroring());
    };

    PlaybackManager.prototype.enableDisplayMirroring = function (enabled) {

        if (enabled != null) {

            var val = enabled ? '1' : '0';
            appSettings.set('displaymirror', val);
            return;
        }

        return (appSettings.get('displaymirror') || '') !== '0';
    };

    PlaybackManager.prototype.nextChapter = function (player) {

        player = player || this._currentPlayer;
        var item = this.currentItem(player);

        var ticks = this.getCurrentTicks(player);

        var nextChapter = (item.Chapters || []).filter(function (i) {

            return i.StartPositionTicks > ticks;

        })[0];

        if (nextChapter) {
            this.seek(nextChapter.StartPositionTicks, player);
        } else {
            this.nextTrack(player);
        }
    };

    PlaybackManager.prototype.previousChapter = function (player) {

        player = player || this._currentPlayer;
        var item = this.currentItem(player);

        var ticks = this.getCurrentTicks(player);

        // Go back 10 seconds
        ticks -= 100000000;

        // If there's no previous track, then at least rewind to beginning
        if (this.getCurrentPlaylistIndex(player) === 0) {
            ticks = Math.max(ticks, 0);
        }

        var previousChapters = (item.Chapters || []).filter(function (i) {

            return i.StartPositionTicks <= ticks;
        });

        if (previousChapters.length) {
            this.seek(previousChapters[previousChapters.length - 1].StartPositionTicks, player);
        } else {
            this.previousTrack(player);
        }
    };

    PlaybackManager.prototype.fastForward = function (player) {

        player = player || this._currentPlayer;

        if (player.fastForward != null) {
            player.fastForward(userSettings.skipForwardLength());
            return;
        }

        var ticks = this.getCurrentTicks(player);

        // Go back 15 seconds
        ticks += userSettings.skipForwardLength() * 10000;

        var runTimeTicks = this.duration(player) || 0;

        if (ticks < runTimeTicks) {
            this.seek(ticks);
        }
    };

    PlaybackManager.prototype.rewind = function (player) {

        player = player || this._currentPlayer;

        if (player.rewind != null) {
            player.rewind(userSettings.skipBackLength());
            return;
        }

        var ticks = this.getCurrentTicks(player);

        // Go back 15 seconds
        ticks -= userSettings.skipBackLength() * 10000;

        this.seek(Math.max(0, ticks));
    };

    PlaybackManager.prototype.seekPercent = function (percent, player) {

        player = player || this._currentPlayer;

        var ticks = this.duration(player) || 0;

        percent /= 100;
        ticks *= percent;
        this.seek(parseInt(ticks), player);
    };

    PlaybackManager.prototype.playTrailers = function (item) {

        var apiClient = connectionManager.getApiClient(item.ServerId);

        var instance = this;

        if (item.LocalTrailerCount) {
            return apiClient.getLocalTrailers(apiClient.getCurrentUserId(), item.Id).then(function (result) {
                return instance.play({
                    items: result
                });
            });
        } else {
            var remoteTrailers = item.RemoteTrailers || [];

            if (!remoteTrailers.length) {
                return Promise.reject();
            }

            return this.play({
                items: remoteTrailers.map(function (t) {
                    return {
                        Name: t.Name || (item.Name + ' Trailer'),
                        Url: t.Url,
                        MediaType: 'Video',
                        Type: 'Trailer',
                        ServerId: apiClient.serverId()
                    };
                })
            });
        }
    };

    PlaybackManager.prototype.getSubtitleUrl = function (textStream, serverId) {

        var apiClient = connectionManager.getApiClient(serverId);
        var textStreamUrl = !textStream.IsExternalUrl ? apiClient.getUrl(textStream.DeliveryUrl) : textStream.DeliveryUrl;
        return textStreamUrl;
    };

    PlaybackManager.prototype.stop = function (player) {

        player = player || this._currentPlayer;

        if (player) {
            this._playNextAfterEnded = false;
            // TODO: remove second param
            return player.stop(true, true);
        }

        return Promise.resolve();
    };

    PlaybackManager.prototype.playPause = function (player) {

        player = player || this._currentPlayer;

        if (player) {

            if (player.playPause) {
                return player.playPause();
            }

            if (player.paused()) {
                return this.unpause(player);
            } else {
                return this.pause(player);
            }
        }
    };

    PlaybackManager.prototype.paused = function (player) {

        player = player || this._currentPlayer;

        if (player) {
            return player.paused();
        }
    };

    PlaybackManager.prototype.pause = function (player) {
        player = player || this._currentPlayer;

        if (player) {
            player.pause();
        }
    };

    PlaybackManager.prototype.unpause = function (player) {
        player = player || this._currentPlayer;

        if (player) {
            player.unpause();
        }
    };

    PlaybackManager.prototype.instantMix = function (item, player) {

        player = player || this._currentPlayer;
        if (player && player.instantMix) {
            return player.instantMix(item);
        }

        var apiClient = connectionManager.getApiClient(item.ServerId);

        var options = {};
        options.UserId = apiClient.getCurrentUserId();
        options.Fields = 'MediaSources';
        options.Limit = 200;

        var instance = this;

        apiClient.getInstantMixFromItem(item.Id, options).then(function (result) {
            instance.play({
                items: result.Items
            });
        });
    };

    PlaybackManager.prototype.shuffle = function (shuffleItem, player) {

        player = player || this._currentPlayer;
        if (player && player.shuffle) {
            return player.shuffle(shuffleItem);
        }

        var apiClient = connectionManager.getApiClient(shuffleItem.ServerId);

        var instance = this;

        apiClient.getItem(apiClient.getCurrentUserId(), shuffleItem.Id).then(function (item) {

            var query = {
                Fields: "MediaSources,Chapters",
                Limit: 200,
                Filters: "IsNotFolder",
                Recursive: true,
                SortBy: "Random"
            };

            if (item.Type === "MusicArtist") {

                query.MediaTypes = "Audio";
                query.ArtistIds = item.Id;

            }
            else if (item.Type === "MusicGenre") {

                query.MediaTypes = "Audio";
                query.Genres = item.Name;

            }
            else if (item.IsFolder) {
                query.ParentId = item.Id;

            }
            else {
                return;
            }

            getItemsForPlayback(item.ServerId, query).then(function (result) {

                instance.play({ items: result.Items });

            });
        });
    };

    PlaybackManager.prototype.audioTracks = function (player) {
        var mediaSource = this.currentMediaSource(player);

        var mediaStreams = (mediaSource || {}).MediaStreams || [];
        return mediaStreams.filter(function (s) {
            return s.Type === 'Audio';
        });
    };

    PlaybackManager.prototype.subtitleTracks = function (player) {
        var mediaSource = this.currentMediaSource(player);

        var mediaStreams = (mediaSource || {}).MediaStreams || [];
        return mediaStreams.filter(function (s) {
            return s.Type === 'Subtitle';
        });
    };

    PlaybackManager.prototype.setRepeatMode = function (value, player) {

        player = player || this._currentPlayer;
        if (player && !enableLocalPlaylistManagement(player)) {
            return player.setRepeatMode(value);
        }

        this._playQueueManager.setRepeatMode(value);
        events.trigger(player, 'repeatmodechange');
    };

    PlaybackManager.prototype.getRepeatMode = function (player) {

        player = player || this._currentPlayer;
        if (player && !enableLocalPlaylistManagement(player)) {
            return player.getRepeatMode();
        }

        return this._playQueueManager.getRepeatMode();
    };

    PlaybackManager.prototype.trySetActiveDeviceName = function (name) {

        name = normalizeName(name);

        var instance = this;
        instance.getTargets().then(function (result) {

            var target = result.filter(function (p) {
                return normalizeName(p.name) === name;
            })[0];

            if (target) {
                instance.trySetActivePlayer(target.playerName, target);
            }

        });
    };

    PlaybackManager.prototype.displayContent = function (options, player) {
        player = player || this._currentPlayer;
        if (player && player.displayContent) {
            player.displayContent(options);
        }
    };

    PlaybackManager.prototype.beginPlayerUpdates = function (player) {
        if (player.beginPlayerUpdates) {
            player.beginPlayerUpdates();
        }
    };

    PlaybackManager.prototype.endPlayerUpdates = function (player) {
        if (player.endPlayerUpdates) {
            player.endPlayerUpdates();
        }
    };

    PlaybackManager.prototype.setDefaultPlayerActive = function () {

        this.setActivePlayer('localplayer');
    };

    PlaybackManager.prototype.removeActivePlayer = function (name) {

        var playerInfo = this.getPlayerInfo();
        if (playerInfo) {
            if (playerInfo.name === name) {
                this.setDefaultPlayerActive();
            }
        }
    };

    PlaybackManager.prototype.removeActiveTarget = function (id) {

        var playerInfo = this.getPlayerInfo();
        if (playerInfo) {
            if (playerInfo.id === id) {
                this.setDefaultPlayerActive();
            }
        }
    };

    PlaybackManager.prototype.disconnectFromPlayer = function () {

        var playerInfo = this.getPlayerInfo();

        if (!playerInfo) {
            return;
        }

        var instance = this;
        if (playerInfo.supportedCommands.indexOf('EndSession') !== -1) {

            require(['dialog'], function (dialog) {

                var menuItems = [];

                menuItems.push({
                    name: globalize.translate('ButtonYes'),
                    id: 'yes'
                });
                menuItems.push({
                    name: globalize.translate('ButtonNo'),
                    id: 'no'
                });

                dialog({
                    buttons: menuItems,
                    //positionTo: positionTo,
                    text: globalize.translate('ConfirmEndPlayerSession')

                }).then(function (id) {
                    switch (id) {

                        case 'yes':
                            instance.getCurrentPlayer().endSession();
                            instance.setDefaultPlayerActive();
                            break;
                        case 'no':
                            instance.setDefaultPlayerActive();
                            break;
                        default:
                            break;
                    }
                });

            });


        } else {

            this.setDefaultPlayerActive();
        }
    };

    PlaybackManager.prototype.sendCommand = function (cmd, player) {

        // Full list
        // https://github.com/MediaBrowser/MediaBrowser/blob/master/MediaBrowser.Model/Session/GeneralCommand.cs#L23
        console.log('MediaController received command: ' + cmd.Name);
        switch (cmd.Name) {

            case 'SetRepeatMode':
                this.setRepeatMode(cmd.Arguments.RepeatMode, player);
                break;
            case 'VolumeUp':
                this.volumeUp(player);
                break;
            case 'VolumeDown':
                this.volumeDown(player);
                break;
            case 'Mute':
                this.setMute(true, player);
                break;
            case 'Unmute':
                this.setMute(false, player);
                break;
            case 'ToggleMute':
                this.toggleMute(player);
                break;
            case 'SetVolume':
                this.setVolume(cmd.Arguments.Volume, player);
                break;
            case 'SetAspectRatio':
                this.setAspectRatio(cmd.Arguments.AspectRatio, player);
                break;
            case 'SetBrightness':
                this.setBrightness(cmd.Arguments.Brightness, player);
                break;
            case 'SetAudioStreamIndex':
                this.setAudioStreamIndex(parseInt(cmd.Arguments.Index), player);
                break;
            case 'SetSubtitleStreamIndex':
                this.setSubtitleStreamIndex(parseInt(cmd.Arguments.Index), player);
                break;
            case 'SetMaxStreamingBitrate':
                // todo
                //this.setMaxStreamingBitrate(parseInt(cmd.Arguments.Bitrate), player);
                break;
            case 'ToggleFullscreen':
                this.toggleFullscreen(player);
                break;
            default:
                {
                    if (player.sendCommand) {
                        player.sendCommand(cmd);
                    }
                    break;
                }
        }
    };

    return new PlaybackManager();
});
