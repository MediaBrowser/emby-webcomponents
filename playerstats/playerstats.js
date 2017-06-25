define(['events', 'globalize', 'playbackManager', 'connectionManager', 'playMethodHelper', 'layoutManager', 'serverNotifications', 'paper-icon-button-light', 'css!./playerstats'], function (events, globalize, playbackManager, connectionManager, playMethodHelper, layoutManager, serverNotifications) {
    'use strict';

    function init(instance) {

        var parent = document.createElement('div');

        parent.classList.add('playerStats');
        parent.classList.add('hide');

        var button;

        if (layoutManager.tv) {
            button = '';
        } else {
            button = '<button type="button" is="paper-icon-button-light" class="playerStats-closeButton"><i class="md-icon">close</i></button>';
        }

        parent.innerHTML = '<div class="playerStats-content">' + button + '<div class="playerStats-stats"></div></div>';

        button = parent.querySelector('.playerStats-closeButton');

        if (button) {
            button.addEventListener('click', onCloseButtonClick.bind(instance));
        }

        document.body.appendChild(parent);

        instance.element = parent;
    }

    function onCloseButtonClick() {
        this.enabled(false);
    }

    function renderStats(elem, categories) {

        elem.querySelector('.playerStats-stats').innerHTML = categories.map(function (category) {

            var categoryHtml = '';

            var stats = category.stats;

            if (stats.length && category.name) {
                categoryHtml += '<div class="playerStats-stat playerStats-stat-header">';
                categoryHtml += '<div class="playerStats-stat-label">';
                categoryHtml += category.name;
                categoryHtml += '</div>';
                categoryHtml += '</div>';
            }

            for (var i = 0, length = stats.length; i < length; i++) {

                categoryHtml += '<div class="playerStats-stat">';

                var stat = stats[i];

                categoryHtml += '<div class="playerStats-stat-label">';
                categoryHtml += stat.label;
                categoryHtml += '</div>';

                categoryHtml += '<div class="playerStats-stat-value">';
                categoryHtml += stat.value;
                categoryHtml += '</div>';

                categoryHtml += '</div>';
            }

            return categoryHtml;

        }).join('');
    }

    function getSession(instance, player) {

        var now = new Date().getTime();

        if ((now - (instance.lastSessionTime || 0)) < 10000) {
            return Promise.resolve(instance.lastSession);
        }

        var apiClient = connectionManager.getApiClient(playbackManager.currentItem(player).ServerId);

        return apiClient.getSessions({
            deviceId: apiClient.deviceId()
        }).then(function (sessions) {

            instance.lastSession = sessions[0] || {};
            instance.lastSessionTime = new Date().getTime();

            return Promise.resolve(instance.lastSession);

        }, function () {
            return Promise.resolve({});
        });
    }

    function translateReason(reason) {

        return globalize.translate('sharedcomponents#' + reason);
    }

    function getSessionStats(session, player, displayPlayMethod) {

        var sessionStats = [];

        var videoCodec;
        var audioCodec;
        var totalBitrate;
        var audioChannels;

        if (session.TranscodingInfo) {

            videoCodec = session.TranscodingInfo.VideoCodec;
            audioCodec = session.TranscodingInfo.AudioCodec;
            totalBitrate = session.TranscodingInfo.Bitrate;
            audioChannels = session.TranscodingInfo.AudioChannels;
        } else {
            var mediaSource = playbackManager.currentMediaSource(player);
            if (mediaSource) {
                totalBitrate = mediaSource.Bitrate;
            }

            var mediaStreams = mediaSource.MediaStreams || [];
            var videoStream = mediaStreams.filter(function (s) {

                return s.Type === 'Video';

            })[0] || {};

            videoCodec = videoStream.Codec;

            var audioStreamIndex = playbackManager.getAudioStreamIndex(player);
            var audioStream = playbackManager.audioTracks(player).filter(function (s) {

                return s.Type === 'Audio' && s.Index === audioStreamIndex;

            })[0] || {};

            audioCodec = audioStream.Codec;
            audioChannels = audioStream.Channels;
        }

        if (videoCodec) {

            sessionStats.push({
                label: 'Video codec:',
                value: videoCodec
            });
        }
        if (audioCodec) {

            sessionStats.push({
                label: 'Audio codec:',
                value: audioCodec
            });
        }
        if (audioChannels) {

            sessionStats.push({
                label: 'Audio channels:',
                value: audioChannels
            });
        }
        if (totalBitrate) {

            if (totalBitrate > 1000000) {
                sessionStats.push({
                    label: 'Bitrate:',
                    value: (totalBitrate / 1000000).toFixed(1) + ' Mbps'
                });
            } else {
                sessionStats.push({
                    label: 'Bitrate:',
                    value: Math.floor(totalBitrate / 1000) + ' kbps'
                });
            }
        }

        if (session.TranscodingInfo && displayPlayMethod === 'Transcode') {

            if (session.TranscodingInfo.CompletionPercentage) {

                sessionStats.push({
                    label: 'Transcoding progress:',
                    value: session.TranscodingInfo.CompletionPercentage.toFixed(1) + '%'
                });
            }
            if (session.TranscodingInfo.Framerate) {

                sessionStats.push({
                    label: 'Transcoding framerate:',
                    value: session.TranscodingInfo.Framerate + ' fps'
                });
            }
            if (session.TranscodingInfo.TranscodeReasons && session.TranscodingInfo.TranscodeReasons.length) {

                sessionStats.push({
                    label: 'Reason for transcoding:',
                    value: session.TranscodingInfo.TranscodeReasons.map(translateReason).join('<br/>')
                });
            }
        }

        return sessionStats;
    }

    function getStats(instance, player) {

        var statsPromise = player.getStats ? player.getStats() : Promise.resolve([]);
        var sessionPromise = getSession(instance, player);

        return Promise.all([statsPromise, sessionPromise]).then(function (responses) {

            var playerStats = responses[0];
            var session = responses[1];

            var displayPlayMethod = playMethodHelper.getDisplayPlayMethod(session);

            playerStats.unshift({
                label: 'Play method:',
                value: displayPlayMethod
            });

            playerStats.unshift({
                label: 'Player:',
                value: player.name
            });

            var categories = [];

            categories.push({
                stats: playerStats
            });

            categories.push({
                stats: getSessionStats(session, player, displayPlayMethod)
            });

            return Promise.resolve(categories);
        });
    }

    function renderPlayerStats(instance, player) {

        var now = new Date().getTime();

        if ((now - (instance.lastRender || 0)) < 700) {
            return;
        }

        instance.lastRender = now;

        getStats(instance, player).then(function (stats) {

            var elem = instance.element;
            if (!elem) {
                return;
            }

            renderStats(elem, stats);
        });
    }

    function bindEvents(instance, player) {

        var localOnTimeUpdate = function () {
            renderPlayerStats(instance, player);
        };

        instance.onTimeUpdate = localOnTimeUpdate;
        events.on(player, 'timeupdate', localOnTimeUpdate);
    }

    function unbindEvents(instance, player) {

        var localOnTimeUpdate = instance.onTimeUpdate;

        if (localOnTimeUpdate) {
            events.off(player, 'timeupdate', localOnTimeUpdate);
        }
    }

    function PlayerStats(options) {

        this.options = options;

        init(this);

        this.enabled(true);
    }

    PlayerStats.prototype.enabled = function (enabled) {

        if (enabled == null) {
            return this._enabled;
        }

        var options = this.options;

        if (!options) {
            return;
        }

        this._enabled = enabled;
        if (enabled) {
            this.element.classList.remove('hide');
            bindEvents(this, options.player);
        } else {
            this.element.classList.add('hide');
            unbindEvents(this, options.player);
        }
    };

    PlayerStats.prototype.toggle = function () {
        this.enabled(!this.enabled());
    };

    PlayerStats.prototype.destroy = function () {

        var options = this.options;

        if (options) {

            this.options = null;
            unbindEvents(this, options.player);
        }

        var elem = this.element;
        if (elem) {
            elem.parentNode.removeChild(elem);
            this.element = null;
        }
    };

    return PlayerStats;
});