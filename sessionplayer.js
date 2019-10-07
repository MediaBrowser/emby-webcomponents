define(['playbackManager', 'events', 'serverNotifications', 'connectionManager'], function (playbackManager, events, serverNotifications, connectionManager) {
    'use strict';

    var PlayerName = 'Remote Control';

    function getActivePlayerId() {
        var info = playbackManager.getPlayerInfo();
        return info ? info.id : null;
    }

    function sendPlayCommand(apiClient, options, playType) {

        var sessionId = getActivePlayerId();

        var ids = options.ids || options.items.map(function (i) {
            return i.Id;
        });

        var remoteOptions = {
            ItemIds: ids.join(','),

            PlayCommand: playType
        };

        if (options.startPositionTicks != null) {
            remoteOptions.StartPositionTicks = options.startPositionTicks;
        }

        if (options.mediaSourceId) {
            remoteOptions.MediaSourceId = options.mediaSourceId;
        }

        if (options.audioStreamIndex != null) {
            remoteOptions.AudioStreamIndex = options.audioStreamIndex;
        }

        if (options.subtitleStreamIndex != null) {
            remoteOptions.SubtitleStreamIndex = options.subtitleStreamIndex;
        }

        if (options.startIndex != null) {
            remoteOptions.StartIndex = options.startIndex;
        }

        return apiClient.sendPlayCommand(sessionId, remoteOptions);
    }

    function sendPlayStateCommand(apiClient, command, options) {

        var sessionId = getActivePlayerId();

        apiClient.sendPlayStateCommand(sessionId, command, options);
    }

    function getCurrentApiClient(instance) {

        var currentServerId = instance.currentServerId;

        if (currentServerId) {
            return connectionManager.getApiClient(currentServerId);
        }

        return connectionManager.currentApiClient();
    }

    function sendCommandByName(instance, name, options) {

        var command = {
            Name: name
        };

        if (options) {
            command.Arguments = options;
        }

        return instance.sendCommand(command);
    }

    function unsubscribeFromPlayerUpdates(instance) {

        instance.isUpdating = true;

        var apiClient = getCurrentApiClient(instance);
        var messageListenerName = apiClient.isMinServerVersion('4.2.0.22') ? 'Session' : 'Sessions';

        apiClient.stopMessageListener(messageListenerName);
        if (instance.pollInterval) {
            clearInterval(instance.pollInterval);
            instance.pollInterval = null;
        }
    }

    function processUpdatedSessions(instance, sessions, apiClient) {

        var currentTargetId = getActivePlayerId();

        var session = sessions.filter(function (s) {
            return s.Id === currentTargetId;
        })[0];

        processUpdatedSession(instance, session, apiClient);
    }

    function processUpdatedSession(instance, session, apiClient, eventName) {

        if (session) {

            var serverId = apiClient.serverId();

            if (session.NowPlayingItem) {
                session.NowPlayingItem.ServerId = serverId;
            }

            normalizeImages(session, apiClient);

            var eventNames = getChangedEvents(instance.lastPlayerData, session, eventName);
            instance.lastPlayerData = session;

            for (var i = 0, length = eventNames.length; i < length; i++) {
                events.trigger(instance, eventNames[i], [session]);
            }

        } else {

            instance.lastPlayerData = session;

            playbackManager.removeActivePlayer(PlayerName);
        }
    }

    function getChangedEvents(state1, state2, eventName) {

        var names = [];

        if (!state1 || !eventName) {
            names.push('statechange');
            return names;
        }

        names.push(eventName);
        return names;
    }

    function onPollIntervalFired() {

        var instance = this;
        var apiClient = getCurrentApiClient(instance);

        if (!apiClient.isMessageChannelOpen()) {

            apiClient.getSessions({

                Id: getActivePlayerId()

            }).then(function (sessions) {
                processUpdatedSessions(instance, sessions, apiClient);
            });
        }
    }

    function subscribeToPlayerUpdates(instance) {

        instance.isUpdating = true;

        var sessionId = getActivePlayerId() || '';

        var apiClient = getCurrentApiClient(instance);

        var messageListenerName = apiClient.isMinServerVersion('4.2.0.22') ? 'Session' : 'Sessions';
        apiClient.startMessageListener(messageListenerName, "100,800," + sessionId);
        if (instance.pollInterval) {
            clearInterval(instance.pollInterval);
            instance.pollInterval = null;
        }
        instance.pollInterval = setInterval(onPollIntervalFired.bind(instance), 5000);
    }

    function normalizeImages(state, apiClient) {

        if (state && state.NowPlayingItem) {

            var item = state.NowPlayingItem;

            if (!item.ImageTags || !item.ImageTags.Primary) {
                if (item.PrimaryImageTag) {
                    item.ImageTags = item.ImageTags || {};
                    item.ImageTags.Primary = item.PrimaryImageTag;
                }
            }
            if (item.BackdropImageTag && item.BackdropItemId === item.Id) {
                item.BackdropImageTags = [item.BackdropImageTag];
            }
            if (item.BackdropImageTag && item.BackdropItemId !== item.Id) {
                item.ParentBackdropImageTags = [item.BackdropImageTag];
                item.ParentBackdropItemId = item.BackdropItemId;
            }
            if (!item.ServerId) {
                item.ServerId = apiClient.serverId();
            }
        }
    }

    function SessionPlayer() {

        var self = this;

        this.name = PlayerName;
        this.type = 'mediaplayer';
        this.isLocalPlayer = false;
        this.id = 'remoteplayer';

        events.on(serverNotifications, 'Session', function (e, apiClient, data) {

            // TODO: send event name here
            processUpdatedSession(self, data, apiClient);
        });

        events.on(serverNotifications, 'Sessions', function (e, apiClient, data) {
            if (!apiClient.isMinServerVersion('4.2.0.22')) {
                processUpdatedSessions(self, data, apiClient);
            }
        });
    }

    SessionPlayer.prototype.beginPlayerUpdates = function () {

        this.playerListenerCount = this.playerListenerCount || 0;

        if (this.playerListenerCount <= 0) {

            this.playerListenerCount = 0;

            subscribeToPlayerUpdates(this);
        }

        this.playerListenerCount++;
    };

    SessionPlayer.prototype.endPlayerUpdates = function () {

        this.playerListenerCount = this.playerListenerCount || 0;
        this.playerListenerCount--;

        if (this.playerListenerCount <= 0) {

            unsubscribeFromPlayerUpdates(this);
            this.playerListenerCount = 0;
        }
    };

    SessionPlayer.prototype.getPlayerState = function () {

        return this.lastPlayerData || {};
    };

    SessionPlayer.prototype.getTargets = function () {

        var apiClient = getCurrentApiClient(this);

        var sessionQuery = {
            ControllableByUserId: apiClient.getCurrentUserId()
        };

        if (apiClient) {

            var name = this.name;

            return apiClient.getSessions(sessionQuery).then(function (sessions) {

                return sessions.filter(function (s) {
                    return s.DeviceId !== apiClient.deviceId();

                }).map(function (s) {
                    return {
                        name: s.DeviceName,
                        deviceName: s.DeviceName,
                        deviceType: s.DeviceType,
                        id: s.Id,
                        playerName: name,
                        appName: s.Client,
                        playableMediaTypes: s.PlayableMediaTypes,
                        isLocalPlayer: false,
                        supportedCommands: s.SupportedCommands,
                        user: s.UserId ? {

                            Id: s.UserId,
                            Name: s.UserName,
                            PrimaryImageTag: s.UserPrimaryImageTag

                        } : null
                    };
                });

            });

        } else {
            return Promise.resolve([]);
        }
    };

    SessionPlayer.prototype.sendCommand = function (command) {

        var sessionId = getActivePlayerId();

        var apiClient = getCurrentApiClient(this);
        return apiClient.sendCommand(sessionId, command);
    };

    SessionPlayer.prototype.play = function (options) {

        options = Object.assign({}, options);

        if (options.items) {
            options.ids = options.items.map(function (i) {
                return i.Id;
            });

            options.items = null;
        }

        return sendPlayCommand(getCurrentApiClient(this), options, 'PlayNow');
    };

    SessionPlayer.prototype.shuffle = function (item) {

        sendPlayCommand(getCurrentApiClient(this), { ids: [item.Id] }, 'PlayShuffle');
    };

    SessionPlayer.prototype.instantMix = function (item) {

        sendPlayCommand(getCurrentApiClient(this), { ids: [item.Id] }, 'PlayInstantMix');
    };

    SessionPlayer.prototype.queue = function (options) {

        sendPlayCommand(getCurrentApiClient(this), options, 'PlayLast');
    };

    SessionPlayer.prototype.queueNext = function (options) {

        sendPlayCommand(getCurrentApiClient(this), options, 'PlayNext');
    };

    SessionPlayer.prototype.canPlayMediaType = function (mediaType) {

        mediaType = (mediaType || '').toLowerCase();
        return mediaType === 'audio' || mediaType === 'video';
    };

    SessionPlayer.prototype.stop = function () {
        sendPlayStateCommand(getCurrentApiClient(this), 'stop');
    };

    SessionPlayer.prototype.nextTrack = function () {
        sendPlayStateCommand(getCurrentApiClient(this), 'nextTrack');
    };

    SessionPlayer.prototype.previousTrack = function () {
        sendPlayStateCommand(getCurrentApiClient(this), 'previousTrack');
    };

    SessionPlayer.prototype.seek = function (positionTicks) {
        sendPlayStateCommand(getCurrentApiClient(this), 'seek',
            {
                SeekPositionTicks: positionTicks
            });
    };

    SessionPlayer.prototype.currentTime = function (val) {

        if (val != null) {
            return this.seek(val);
        }

        var state = this.lastPlayerData || {};
        state = state.PlayState || {};
        return state.PositionTicks;
    };

    SessionPlayer.prototype.playbackStartTime = function () {

        var state = this.lastPlayerData || {};
        state = state.PlayState || {};
        return state.PlaybackStartTimeTicks;
    };

    SessionPlayer.prototype.duration = function () {
        var state = this.lastPlayerData || {};
        state = state.NowPlayingItem || {};
        return state.RunTimeTicks;
    };

    SessionPlayer.prototype.paused = function () {
        var state = this.lastPlayerData || {};
        state = state.PlayState || {};
        return state.IsPaused;
    };

    SessionPlayer.prototype.getVolume = function () {
        var state = this.lastPlayerData || {};
        state = state.PlayState || {};
        return state.VolumeLevel;
    };

    SessionPlayer.prototype.isMuted = function () {
        var state = this.lastPlayerData || {};
        state = state.PlayState || {};
        return state.IsMuted;
    };

    SessionPlayer.prototype.pause = function () {
        sendPlayStateCommand(getCurrentApiClient(this), 'Pause');
    };

    SessionPlayer.prototype.unpause = function () {
        sendPlayStateCommand(getCurrentApiClient(this), 'Unpause');
    };

    SessionPlayer.prototype.playPause = function () {
        sendPlayStateCommand(getCurrentApiClient(this), 'PlayPause');
    };

    SessionPlayer.prototype.setMute = function (isMuted) {

        if (isMuted) {
            return sendCommandByName(this, 'Mute');
        } else {
            return sendCommandByName(this, 'Unmute');
        }
    };

    SessionPlayer.prototype.toggleMute = function () {
        return sendCommandByName(this, 'ToggleMute');
    };

    SessionPlayer.prototype.setVolume = function (vol) {
        return sendCommandByName(this, 'SetVolume', {
            Volume: vol
        });
    };

    SessionPlayer.prototype.volumeUp = function () {
        return sendCommandByName(this, 'VolumeUp');
    };

    SessionPlayer.prototype.volumeDown = function () {
        return sendCommandByName(this, 'VolumeDown');
    };

    SessionPlayer.prototype.toggleFullscreen = function () {
        return sendCommandByName(this, 'ToggleFullscreen');
    };

    SessionPlayer.prototype.audioTracks = function () {
        var state = this.lastPlayerData || {};
        state = state.NowPlayingItem || {};
        var streams = state.MediaStreams || [];
        return streams.filter(function (s) {
            return s.Type === 'Audio';
        });
    };

    SessionPlayer.prototype.getAudioStreamIndex = function () {
        var state = this.lastPlayerData || {};
        state = state.PlayState || {};
        return state.AudioStreamIndex;
    };

    SessionPlayer.prototype.playTrailers = function (item) {
        return sendCommandByName(this, 'PlayTrailers', {
            ItemId: item.Id
        });
    };

    SessionPlayer.prototype.setAudioStreamIndex = function (index) {
        return sendCommandByName(this, 'SetAudioStreamIndex', {
            Index: index
        });
    };

    SessionPlayer.prototype.subtitleTracks = function () {
        var state = this.lastPlayerData || {};
        state = state.NowPlayingItem || {};
        var streams = state.MediaStreams || [];
        return streams.filter(function (s) {
            return s.Type === 'Subtitle';
        });
    };

    SessionPlayer.prototype.getSubtitleStreamIndex = function () {
        var state = this.lastPlayerData || {};
        state = state.PlayState || {};
        return state.SubtitleStreamIndex;
    };

    SessionPlayer.prototype.setSubtitleStreamIndex = function (index) {
        sendCommandByName(this, 'SetSubtitleStreamIndex', {
            Index: index
        });
    };

    SessionPlayer.prototype.getMaxStreamingBitrate = function () {

    };

    SessionPlayer.prototype.setMaxStreamingBitrate = function (options) {

    };

    SessionPlayer.prototype.isFullscreen = function () {

    };

    SessionPlayer.prototype.toggleFullscreen = function () {

    };

    SessionPlayer.prototype.getRepeatMode = function () {

        var state = this.lastPlayerData || {};
        state = state.PlayState || {};
        return state.RepeatMode;
    };

    SessionPlayer.prototype.setRepeatMode = function (mode) {

        return sendCommandByName(this, 'SetRepeatMode', {
            RepeatMode: mode
        });
    };

    SessionPlayer.prototype.displayContent = function (options) {

        return sendCommandByName(this, 'DisplayContent', options);
    };

    SessionPlayer.prototype.isPlaying = function () {
        var state = this.lastPlayerData || {};
        return state.NowPlayingItem != null;
    };

    SessionPlayer.prototype.getPlaylist = function () {
        return Promise.resolve([]);
    };

    SessionPlayer.prototype.getCurrentPlaylistItemId = function () {
        var state = this.lastPlayerData || {};
        return state.PlaylistItemId;
    };

    SessionPlayer.prototype.getCurrentPlaylistIndex = function () {
        var state = this.lastPlayerData || {};
        return state.PlaylistIndex;
    };

    SessionPlayer.prototype.getCurrentPlaylistLength = function () {
        var state = this.lastPlayerData || {};
        return state.PlaylistLength;
    };

    SessionPlayer.prototype.setCurrentPlaylistItem = function (playlistItemId) {
        return Promise.resolve();
    };

    SessionPlayer.prototype.removeFromPlaylist = function (playlistItemIds) {
        return Promise.resolve();
    };

    SessionPlayer.prototype.tryPair = function (target) {

        return Promise.resolve();
    };

    return SessionPlayer;
});