define(['playbackManager', 'events', 'serverNotifications', 'connectionManager'], function (playbackManager, events, serverNotifications, connectionManager) {
    'use strict';

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

        if (options.startPositionTicks) {
            remoteOptions.startPositionTicks = options.startPositionTicks;
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

        instance.sendCommand(command);
    }

    function unsubscribeFromPlayerUpdates(instance) {

        instance.isUpdating = true;

        var apiClient = getCurrentApiClient(instance);
        if (apiClient.isWebSocketOpen()) {

            apiClient.sendWebSocketMessage("SessionsStop");
        }
        if (instance.pollInterval) {
            clearInterval(instance.pollInterval);
            instance.pollInterval = null;
        }
    }

    function processUpdatedSessions(instance, sessions, apiClient) {

        var serverId = apiClient.serverId();

        sessions.map(function (s) {
            if (s.NowPlayingItem) {
                s.NowPlayingItem.ServerId = serverId;
            }
        });

        var currentTargetId = getActivePlayerId();
        // Update existing data
        //updateSessionInfo(popup, msg.Data);
        var session = sessions.filter(function (s) {
            return s.Id === currentTargetId;
        })[0];

        if (session) {
            firePlaybackEvent(instance, 'statechange', session, apiClient);
            firePlaybackEvent(instance, 'timeupdate', session, apiClient);
            firePlaybackEvent(instance, 'pause', session, apiClient);
        }
    }

    function onPollIntervalFired() {

        var instance = this;
        var apiClient = getCurrentApiClient(instance);
        if (!apiClient.isWebSocketOpen()) {

            if (apiClient) {
                apiClient.getSessions().then(function (sessions) {
                    processUpdatedSessions(instance, sessions, apiClient);
                });
            }
        }
    }

    function subscribeToPlayerUpdates(instance) {

        instance.isUpdating = true;

        var apiClient = getCurrentApiClient(instance);
        if (apiClient.isWebSocketOpen()) {

            apiClient.sendWebSocketMessage("SessionsStart", "100,800");
        }
        if (instance.pollInterval) {
            clearInterval(instance.pollInterval);
            instance.pollInterval = null;
        }
        instance.pollInterval = setInterval(onPollIntervalFired.bind(instance), 5000);
    }

    function getPlayerState(session) {

        return session;
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

    function firePlaybackEvent(instance, name, session, apiClient) {

        var state = getPlayerState(session);

        normalizeImages(state, apiClient);

        instance.lastPlayerData = state;

        events.trigger(instance, name, [state]);
    }

    function SessionPlayer() {

        var self = this;

        this.name = 'Remote Control';
        this.type = 'mediaplayer';
        this.isLocalPlayer = false;
        this.id = 'remoteplayer';

        function onWebSocketConnectionChange() {

            // Reconnect
            if (self.isUpdating) {
                subscribeToPlayerUpdates(self);
            }
        }

        events.on(serverNotifications, 'Sessions', function (e, apiClient, data) {
            processUpdatedSessions(self, data, apiClient);
        });

        events.on(serverNotifications, 'SessionEnded', function (e, apiClient, data) {
            console.log("Server reports another session ended");

            if (getActivePlayerId() === data.Id) {
                playbackManager.setDefaultPlayerActive();
            }
        });

        events.on(serverNotifications, 'PlaybackStart', function (e, apiClient, data) {
            if (data.DeviceId !== apiClient.deviceId()) {
                if (getActivePlayerId() === data.Id) {
                    firePlaybackEvent(self, 'playbackstart', data, apiClient);
                }
            }
        });

        events.on(serverNotifications, 'PlaybackStopped', function (e, apiClient, data) {
            if (data.DeviceId !== apiClient.deviceId()) {
                if (getActivePlayerId() === data.Id) {
                    firePlaybackEvent(self, 'playbackstop', data, apiClient);
                }
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

        var apiClient = getCurrentApiClient(this);

        if (apiClient) {
            return apiClient.getSessions().then(function (sessions) {

                var currentTargetId = getActivePlayerId();

                // Update existing data
                //updateSessionInfo(popup, msg.Data);
                var session = sessions.filter(function (s) {
                    return s.Id === currentTargetId;
                })[0];

                if (session) {
                    session = getPlayerState(session);
                }

                return session;
            });
        } else {
            return Promise.resolve({});
        }
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
                        id: s.Id,
                        playerName: name,
                        appName: s.Client,
                        playableMediaTypes: s.PlayableMediaTypes,
                        isLocalPlayer: false,
                        supportedCommands: s.SupportedCommands
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
        apiClient.sendCommand(sessionId, command);
    };

    SessionPlayer.prototype.play = function (options) {

        var playOptions = {};
        playOptions.ids = options.ids || options.items.map(function (i) {
            return i.Id;
        });

        if (options.startPositionTicks) {
            playOptions.startPositionTicks = options.startPositionTicks;
        }

        return sendPlayCommand(getCurrentApiClient(this), playOptions, 'PlayNow');
    };

    SessionPlayer.prototype.shuffle = function (item) {

        sendPlayCommand(getCurrentApiClient(this), { ids: [item.Id] }, 'PlayShuffle');
    };

    SessionPlayer.prototype.instantMix = function (item) {

        sendPlayCommand(getCurrentApiClient(this), { ids: [item.Id] }, 'PlayInstantMix');
    };

    SessionPlayer.prototype.queue = function (options) {

        sendPlayCommand(getCurrentApiClient(this), options, 'PlayNext');
    };

    SessionPlayer.prototype.queueNext = function (options) {

        sendPlayCommand(getCurrentApiClient(this), options, 'PlayLast');
    };

    SessionPlayer.prototype.canPlayMediaType = function (mediaType) {

        mediaType = (mediaType || '').toLowerCase();
        return mediaType === 'audio' || mediaType === 'video';
    };

    SessionPlayer.prototype.canQueueMediaType = function (mediaType) {
        return this.canPlayMediaType(mediaType);
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

    SessionPlayer.prototype.pause = function () {
        sendPlayStateCommand(getCurrentApiClient(this), 'Pause');
    };

    SessionPlayer.prototype.unpause = function () {
        sendPlayStateCommand(getCurrentApiClient(this), 'Unpause');
    };

    SessionPlayer.prototype.playPause = function () {
        if (this.paused()) {
            this.unpause();
        } else {
            this.pause();
        }
    };

    SessionPlayer.prototype.setMute = function (isMuted) {

        if (isMuted) {
            sendCommandByName(this, 'Mute');
        } else {
            sendCommandByName(this, 'Unmute');
        }
    };

    SessionPlayer.prototype.toggleMute = function () {
        sendCommandByName(this, 'ToggleMute');
    };

    SessionPlayer.prototype.setVolume = function (vol) {
        sendCommandByName(this, 'SetVolume', {
            Volume: vol
        });
    };

    SessionPlayer.prototype.volumeUp = function () {
        sendCommandByName(this, 'VolumeUp');
    };

    SessionPlayer.prototype.volumeDown = function () {
        sendCommandByName(this, 'VolumeDown');
    };

    SessionPlayer.prototype.toggleFullscreen = function () {
        sendCommandByName(this, 'ToggleFullscreen');
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

    SessionPlayer.prototype.setAudioStreamIndex = function (index) {
        sendCommandByName(this, 'SetAudioStreamIndex', {
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

    };

    SessionPlayer.prototype.setRepeatMode = function (mode) {

        sendCommandByName(this, 'SetRepeatMode', {
            RepeatMode: mode
        });
    };

    SessionPlayer.prototype.displayContent = function (options) {

        sendCommandByName(this, 'DisplayContent', options);
    };

    SessionPlayer.prototype.isPlaying = function () {
        var state = this.lastPlayerData || {};
        return state.NowPlayingItem != null;
    };

    SessionPlayer.prototype.isPlayingVideo = function () {
        var state = this.lastPlayerData || {};
        state = state.NowPlayingItem || {};
        return state.MediaType === 'Video';
    };

    SessionPlayer.prototype.isPlayingAudio = function () {
        var state = this.lastPlayerData || {};
        state = state.NowPlayingItem || {};
        return state.MediaType === 'Audio';
    };

    SessionPlayer.prototype.getPlaylist = function () {
        return Promise.resolve([]);
    };

    SessionPlayer.prototype.getCurrentPlaylistItemId = function () {
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