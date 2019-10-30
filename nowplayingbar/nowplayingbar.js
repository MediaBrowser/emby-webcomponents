﻿define(['require', 'datetime', 'itemHelper', 'events', 'browser', 'imageLoader', 'layoutManager', 'playbackManager', 'nowPlayingHelper', 'apphost', 'dom', 'connectionManager', 'itemShortcuts', 'paper-icon-button-light', 'emby-ratingbutton'], function (require, datetime, itemHelper, events, browser, imageLoader, layoutManager, playbackManager, nowPlayingHelper, appHost, dom, connectionManager, itemShortcuts) {
    'use strict';

    var currentPlayer;
    var currentPlayerSupportedCommands = [];

    var currentTimeElement;
    var nowPlayingImageElement;
    var nowPlayingTextElement;
    var nowPlayingUserData;
    var muteButton;
    var volumeSlider;
    var volumeSliderContainer;
    var playPauseButtons;
    var positionSlider;
    var toggleRepeatButton;
    var toggleRepeatButtonIcon;

    var lastUpdateTime = 0;
    var lastPlayerState = {};
    var isEnabled;
    var currentRuntimeTicks = 0;

    var isVisibilityAllowed = true;

    function getNowPlayingBarHtml() {

        var html = '';

        html += '<div class="nowPlayingBar hide nowPlayingBar-hidden">';

        html += '<div class="nowPlayingBarTop">';
        html += '<div class="nowPlayingBarPositionContainer sliderContainer">';
        html += '<input type="range" is="emby-slider" pin step=".01" min="0" max="100" value="0" class="slider-medium-thumb nowPlayingBarPositionSlider"/>';
        html += '</div>';

        html += '<div class="nowPlayingBarInfoContainer">';
        html += '<div class="nowPlayingImage"></div>';
        html += '<div class="nowPlayingBarText"></div>';
        html += '</div>';

        // The onclicks are needed due to the return false above
        html += '<div class="nowPlayingBarCenter">';

        html += '<button is="paper-icon-button-light" class="previousTrackButton mediaButton"><i class="md-icon">&#xE045;</i></button>';

        html += '<button is="paper-icon-button-light" class="playPauseButton mediaButton"><i class="md-icon">&#xE034;</i></button>';

        html += '<button is="paper-icon-button-light" class="stopButton mediaButton"><i class="md-icon">stop</i></button>';
        html += '<button is="paper-icon-button-light" class="nextTrackButton mediaButton"><i class="md-icon">&#xE044;</i></button>';

        html += '<div class="nowPlayingBarCurrentTime"></div>';
        html += '</div>';

        html += '<div class="nowPlayingBarRight">';

        html += '<button is="paper-icon-button-light" class="muteButton mediaButton"><i class="md-icon">&#xE050;</i></button>';

        html += '<div class="sliderContainer nowPlayingBarVolumeSliderContainer hide" style="width:100px;vertical-align:middle;display:inline-flex;">';
        html += '<input type="range" is="emby-slider" pin step="1" min="0" max="100" value="0" class="slider-medium-thumb nowPlayingBarVolumeSlider"/>';
        html += '</div>';

        html += '<button is="paper-icon-button-light" class="toggleRepeatButton mediaButton"><i class="md-icon">&#xE040;</i></button>';

        html += '<div class="nowPlayingBarUserDataButtons">';
        html += '</div>';

        html += '<button is="paper-icon-button-light" class="playPauseButton mediaButton"><i class="md-icon">&#xE034;</i></button>';
        html += '<button is="paper-icon-button-light" class="remoteControlButton mediaButton"><i class="md-icon">&#xE05F;</i></button>';

        html += '</div>';
        html += '</div>';

        html += '</div>';

        return html;
    }

    function onSlideDownComplete(e) {

        if (e.target === e.currentTarget) {
            if (this.classList.contains('nowPlayingBar-hidden')) {
                this.classList.add('hide');
            }
        }
    }

    function slideDown(elem) {

        // trigger reflow
        void elem.offsetWidth;

        elem.classList.add('nowPlayingBar-hidden');
    }

    function slideUp(elem) {

        elem.classList.remove('hide');

        // trigger reflow
        void elem.offsetWidth;

        elem.classList.remove('nowPlayingBar-hidden');
    }

    function onPlayPauseClick() {
        playbackManager.playPause(currentPlayer);
    }

    function bindEvents(elem) {

        dom.addEventListener(elem, dom.whichTransitionEvent(), onSlideDownComplete, {
            passive: true
        });

        currentTimeElement = elem.querySelector('.nowPlayingBarCurrentTime');
        nowPlayingImageElement = elem.querySelector('.nowPlayingImage');
        nowPlayingTextElement = elem.querySelector('.nowPlayingBarText');
        nowPlayingUserData = elem.querySelector('.nowPlayingBarUserDataButtons');

        muteButton = elem.querySelector('.muteButton');
        muteButton.addEventListener('click', function () {

            if (currentPlayer) {
                playbackManager.toggleMute(currentPlayer);
            }

        });

        elem.querySelector('.stopButton').addEventListener('click', function () {

            if (currentPlayer) {
                playbackManager.stop(currentPlayer);
            }
        });

        var i, length;
        playPauseButtons = elem.querySelectorAll('.playPauseButton');
        for (i = 0, length = playPauseButtons.length; i < length; i++) {
            playPauseButtons[i].addEventListener('click', onPlayPauseClick);
        }

        elem.querySelector('.nextTrackButton').addEventListener('click', function () {

            if (currentPlayer) {
                playbackManager.nextTrack(currentPlayer);
            }
        });

        elem.querySelector('.previousTrackButton').addEventListener('click', function () {

            if (currentPlayer) {
                playbackManager.previousTrack(currentPlayer);
            }
        });

        elem.querySelector('.remoteControlButton').addEventListener('click', showRemoteControl);

        toggleRepeatButton = elem.querySelector('.toggleRepeatButton');
        toggleRepeatButton.addEventListener('click', function () {

            if (currentPlayer) {

                switch (playbackManager.getRepeatMode(currentPlayer)) {
                    case 'RepeatAll':
                        playbackManager.setRepeatMode('RepeatOne', currentPlayer);
                        break;
                    case 'RepeatOne':
                        playbackManager.setRepeatMode('RepeatNone', currentPlayer);
                        break;
                    default:
                        playbackManager.setRepeatMode('RepeatAll', currentPlayer);
                        break;
                }
            }
        });

        toggleRepeatButtonIcon = toggleRepeatButton.querySelector('i');

        volumeSlider = elem.querySelector('.nowPlayingBarVolumeSlider');
        volumeSliderContainer = elem.querySelector('.nowPlayingBarVolumeSliderContainer');

        if (appHost.supports('physicalvolumecontrol')) {
            volumeSliderContainer.classList.add('hide');
        } else {
            volumeSliderContainer.classList.remove('hide');
        }

        volumeSlider.addEventListener('change', function () {

            if (currentPlayer) {
                currentPlayer.setVolume(this.value);
            }

        });

        positionSlider = elem.querySelector('.nowPlayingBarPositionSlider');
        positionSlider.addEventListener('change', function () {

            if (currentPlayer) {

                var newPercent = parseFloat(this.value);

                playbackManager.seekPercent(newPercent, currentPlayer);
            }

        });

        positionSlider.getBubbleText = function (value) {

            var state = lastPlayerState;

            if (!state || !state.NowPlayingItem || !currentRuntimeTicks) {
                return '--:--';
            }

            var ticks = currentRuntimeTicks;
            ticks /= 100;
            ticks *= value;

            return datetime.getDisplayRunningTime(ticks);
        };

        elem.addEventListener('click', function (e) {

            if (!dom.parentWithTag(e.target, ['BUTTON', 'INPUT', 'A'])) {
                showRemoteControl(0);
            }
        });
    }

    function showRemoteControl() {

        require(['appRouter'], function (appRouter) {
            appRouter.showNowPlaying();
        });
    }

    var nowPlayingBarElement;
    function getNowPlayingBar() {

        if (nowPlayingBarElement) {
            return Promise.resolve(nowPlayingBarElement);
        }

        return new Promise(function (resolve, reject) {

            require(['appFooter-shared', 'css!./nowplayingbar.css', 'emby-slider'], function (appfooter) {

                var parentContainer = appfooter.element;
                nowPlayingBarElement = parentContainer.querySelector('.nowPlayingBar');

                if (nowPlayingBarElement) {
                    resolve(nowPlayingBarElement);
                    return;
                }

                parentContainer.insertAdjacentHTML('afterbegin', getNowPlayingBarHtml());
                nowPlayingBarElement = parentContainer.querySelector('.nowPlayingBar');

                itemShortcuts.on(nowPlayingBarElement);

                bindEvents(nowPlayingBarElement);
                resolve(nowPlayingBarElement);
            });
        });
    }

    function showButton(button) {
        button.classList.remove('hide');
    }

    function hideButton(button) {
        button.classList.add('hide');
    }

    function updatePlayPauseState(isPaused) {

        var i, length;

        if (playPauseButtons) {
            if (isPaused) {

                for (i = 0, length = playPauseButtons.length; i < length; i++) {
                    playPauseButtons[i].querySelector('i').innerHTML = 'play_arrow';
                }

            } else {

                for (i = 0, length = playPauseButtons.length; i < length; i++) {
                    playPauseButtons[i].querySelector('i').innerHTML = 'pause';
                }
            }
        }
    }

    function updatePlayerStateInternal(event, state, player) {

        showNowPlayingBar();

        lastPlayerState = state;

        var playerInfo = playbackManager.getPlayerInfo(player);

        var playState = state.PlayState || {};

        updatePlayPauseState(playState.IsPaused);

        var supportedCommands = playerInfo.supportedCommands;
        currentPlayerSupportedCommands = supportedCommands;

        if (supportedCommands.indexOf('SetRepeatMode') === -1) {
            toggleRepeatButton.classList.add('hide');
        } else {
            toggleRepeatButton.classList.remove('hide');
        }

        updateRepeatModeDisplay(playState.RepeatMode);

        updatePlayerVolumeState(playState.IsMuted, playState.VolumeLevel);

        if (positionSlider && !positionSlider.dragging) {
            positionSlider.disabled = layoutManager.mobile || !playState.CanSeek;

            // determines if both forward and backward buffer progress will be visible
            var isProgressClear = state.MediaSource && state.MediaSource.RunTimeTicks == null;
            positionSlider.setIsClear(isProgressClear);
        }

        var nowPlayingItem = state.NowPlayingItem || {};
        updateTimeDisplay(playState.PositionTicks, nowPlayingItem.RunTimeTicks, playbackManager.getBufferedRanges(player));

        updateNowPlayingInfo(state);
    }

    function updateRepeatModeDisplay(repeatMode) {

        if (repeatMode === 'RepeatAll') {
            toggleRepeatButtonIcon.innerHTML = "repeat";
            toggleRepeatButton.classList.add('repeatButton-active');
        }
        else if (repeatMode === 'RepeatOne') {
            toggleRepeatButtonIcon.innerHTML = "repeat_one";
            toggleRepeatButton.classList.add('repeatButton-active');
        } else {
            toggleRepeatButtonIcon.innerHTML = "repeat";
            toggleRepeatButton.classList.remove('repeatButton-active');
        }
    }

    function updateTimeDisplay(positionTicks, runtimeTicks, bufferedRanges) {

        // See bindEvents for why this is necessary
        if (positionSlider && !positionSlider.dragging) {
            if (runtimeTicks) {

                var pct = positionTicks / runtimeTicks;
                pct *= 100;

                positionSlider.value = pct;

            } else {

                positionSlider.value = 0;
            }
        }

        if (positionSlider && !runtimeTicks) {
            positionSlider.setBufferedRanges(bufferedRanges, runtimeTicks, positionTicks);
        }

        if (currentTimeElement) {

            var timeText = positionTicks == null ? '--:--' : datetime.getDisplayRunningTime(positionTicks);

            if (runtimeTicks) {
                timeText += " / " + datetime.getDisplayRunningTime(runtimeTicks);
            }

            currentTimeElement.innerHTML = timeText;
        }
    }

    function updatePlayerVolumeState(isMuted, volumeLevel) {

        var supportedCommands = currentPlayerSupportedCommands;

        var showMuteButton = true;
        var showVolumeSlider = true;

        if (supportedCommands.indexOf('ToggleMute') === -1) {
            showMuteButton = false;
        }

        if (isMuted) {
            muteButton.querySelector('i').innerHTML = '&#xE04F;';
        } else {
            muteButton.querySelector('i').innerHTML = '&#xE050;';
        }

        if (supportedCommands.indexOf('SetVolume') === -1) {
            showVolumeSlider = false;
        }

        if (currentPlayer.isLocalPlayer && appHost.supports('physicalvolumecontrol')) {
            showMuteButton = false;
            showVolumeSlider = false;
        }

        if (showMuteButton) {
            showButton(muteButton);
        } else {
            hideButton(muteButton);
        }

        // See bindEvents for why this is necessary
        if (volumeSlider) {

            if (showVolumeSlider) {
                volumeSliderContainer.classList.remove('hide');
            } else {
                volumeSliderContainer.classList.add('hide');
            }

            if (!volumeSlider.dragging) {
                volumeSlider.value = volumeLevel || 0;
            }
        }
    }

    function getTextActionButton(item, text, serverId) {

        if (!text) {
            text = itemHelper.getDisplayName(item);
        }

        var dataAttributes = itemShortcuts.getShortcutAttributesHtml(item, {
            serverId: serverId
        });

        var html = '<button ' + dataAttributes + ' type="button" class="itemAction textActionButton" data-action="link">';
        html += text;
        html += '</button>';

        return html;
    }

    function seriesImageUrl(item, options) {

        if (!item) {
            throw new Error('item cannot be null!');
        }

        if (item.Type !== 'Episode') {
            return null;
        }

        options = options || {};
        options.type = options.type || "Primary";

        if (options.type === 'Primary') {

            if (item.SeriesPrimaryImageTag) {

                options.tag = item.SeriesPrimaryImageTag;

                return connectionManager.getApiClient(item).getScaledImageUrl(item.SeriesId, options);
            }
        }

        if (options.type === 'Thumb') {

            if (item.ParentThumbImageTag) {

                options.tag = item.ParentThumbImageTag;

                return connectionManager.getApiClient(item).getScaledImageUrl(item.ParentThumbItemId, options);
            }
        }

        return null;
    }

    function imageUrl(item, options) {

        if (!item) {
            throw new Error('item cannot be null!');
        }

        options = options || {};
        options.type = options.type || "Primary";

        if (item.ImageTags && item.ImageTags[options.type]) {

            options.tag = item.ImageTags[options.type];
            return connectionManager.getApiClient(item).getScaledImageUrl(item.PrimaryImageItemId || item.Id, options);
        }

        if (item.AlbumId && item.AlbumPrimaryImageTag) {

            options.tag = item.AlbumPrimaryImageTag;
            return connectionManager.getApiClient(item).getScaledImageUrl(item.AlbumId, options);
        }

        return null;
    }

    var currentImgUrl;
    function updateNowPlayingInfo(state) {

        var nowPlayingItem = state.NowPlayingItem;

        var textLines = nowPlayingItem ? nowPlayingHelper.getNowPlayingNames(nowPlayingItem) : [];
        if (textLines.length > 1) {
            textLines[1].secondary = true;
        }
        var serverId = nowPlayingItem ? nowPlayingItem.ServerId : null;
        nowPlayingTextElement.innerHTML = textLines.map(function (nowPlayingName) {

            var cssClass = nowPlayingName.secondary ? ' class="secondaryText"' : '';

            if (nowPlayingName.item) {
                return '<div' + cssClass + '>' + getTextActionButton(nowPlayingName.item, nowPlayingName.text, serverId) + '</div>';
            }

            return '<div' + cssClass + '>' + nowPlayingName.text + '</div>';

        }).join('');

        var imgHeight = 70;

        var url = nowPlayingItem ? (seriesImageUrl(nowPlayingItem, {
            height: imgHeight
        }) || imageUrl(nowPlayingItem, {
            height: imgHeight
        })) : null;

        var isRefreshing = false;

        if (url !== currentImgUrl) {
            currentImgUrl = url;
            isRefreshing = true;

            if (url) {
                imageLoader.lazyImage(nowPlayingImageElement, url);
            } else {
                nowPlayingImageElement.style.backgroundImage = '';
            }
        }

        if (nowPlayingItem.Id) {
            if (isRefreshing) {

                var apiClient = connectionManager.getApiClient(nowPlayingItem.ServerId);

                apiClient.getItem(apiClient.getCurrentUserId(), nowPlayingItem.Id).then(function (item) {

                    var userData = item.UserData || {};
                    var likes = userData.Likes == null ? '' : userData.Likes;

                    nowPlayingUserData.innerHTML = '<button is="emby-ratingbutton" type="button" class="listItemButton paper-icon-button-light" data-id="' + item.Id + '" data-serverid="' + item.ServerId + '" data-itemtype="' + item.Type + '" data-likes="' + likes + '" data-isfavorite="' + (userData.IsFavorite) + '"><i class="md-icon">&#xE87D;</i></button>';
                });

            }
        } else {
            nowPlayingUserData.innerHTML = '';
        }
    }

    function onPlaybackStart(e, state) {

        //console.log('nowplaying event: ' + e.type);

        var player = this;

        onStateChanged.call(player, e, state);
    }

    function onRepeatModeChange(e) {

        if (!isEnabled) {
            return;
        }

        var player = this;

        updateRepeatModeDisplay(playbackManager.getRepeatMode(player));
    }

    function showNowPlayingBar() {

        if (!isVisibilityAllowed) {
            hideNowPlayingBar();
            return;
        }

        getNowPlayingBar().then(slideUp);
    }

    function hideNowPlayingBar() {

        isEnabled = false;

        // Use a timeout to prevent the bar from hiding and showing quickly
        // in the event of a stop->play command

        // Don't call getNowPlayingBar here because we don't want to end up creating it just to hide it
        var elem = document.getElementsByClassName('nowPlayingBar')[0];
        if (elem) {

            slideDown(elem);
        }
    }

    function onPlaybackStopped(e, state) {

        //console.log('nowplaying event: ' + e.type);
        var player = this;

        if (player.isLocalPlayer) {
            if (state.NextMediaType !== 'Audio') {
                hideNowPlayingBar();
            }
        } else {
            if (!state.NextMediaType) {
                hideNowPlayingBar();
            }
        }
    }

    function onPlayPauseStateChanged(e) {

        if (!isEnabled) {
            return;
        }

        var player = this;
        updatePlayPauseState(player.paused());
    }

    function onStateChanged(event, state) {

        //console.log('nowplaying event: ' + e.type);
        var player = this;

        if (state.IsFullscreen === false) {
            hideNowPlayingBar();
            return;
        }

        if (!state.NowPlayingItem || layoutManager.tv) {
            hideNowPlayingBar();
            return;
        }

        if (player.isLocalPlayer && state.NowPlayingItem && state.NowPlayingItem.MediaType !== 'Audio') {
            hideNowPlayingBar();
            return;
        }

        isEnabled = true;

        if (nowPlayingBarElement) {
            updatePlayerStateInternal(event, state, player);
            return;
        }

        getNowPlayingBar().then(function () {
            updatePlayerStateInternal(event, state, player);
        });
    }

    function onTimeUpdate(e) {

        if (!isEnabled) {
            return;
        }

        // Try to avoid hammering the document with changes
        var now = new Date().getTime();
        if ((now - lastUpdateTime) < 700) {

            return;
        }
        lastUpdateTime = now;

        var player = this;
        currentRuntimeTicks = playbackManager.duration(player);
        updateTimeDisplay(playbackManager.currentTime(player), currentRuntimeTicks, playbackManager.getBufferedRanges(player));
    }

    function releaseCurrentPlayer() {

        var player = currentPlayer;

        if (player) {
            events.off(player, 'playbackstart', onPlaybackStart);
            events.off(player, 'statechange', onPlaybackStart);
            events.off(player, 'repeatmodechange', onRepeatModeChange);
            events.off(player, 'playbackstop', onPlaybackStopped);
            events.off(player, 'volumechange', onVolumeChanged);
            events.off(player, 'pause', onPlayPauseStateChanged);
            events.off(player, 'unpause', onPlayPauseStateChanged);
            events.off(player, 'timeupdate', onTimeUpdate);

            currentPlayer = null;
            hideNowPlayingBar();
        }
    }

    function onVolumeChanged(e) {

        if (!isEnabled) {
            return;
        }

        var player = this;

        updatePlayerVolumeState(player.isMuted(), player.getVolume());
    }

    function refreshFromPlayer(player) {

        var state = playbackManager.getPlayerState(player);

        onStateChanged.call(player, { type: 'init' }, state);
    }

    function bindToPlayer(player) {

        if (player === currentPlayer) {
            return;
        }

        releaseCurrentPlayer();

        currentPlayer = player;

        if (!player) {
            return;
        }

        refreshFromPlayer(player);

        events.on(player, 'playbackstart', onPlaybackStart);
        events.on(player, 'statechange', onPlaybackStart);
        events.on(player, 'repeatmodechange', onRepeatModeChange);
        events.on(player, 'playbackstop', onPlaybackStopped);
        events.on(player, 'volumechange', onVolumeChanged);
        events.on(player, 'pause', onPlayPauseStateChanged);
        events.on(player, 'unpause', onPlayPauseStateChanged);
        events.on(player, 'timeupdate', onTimeUpdate);
    }

    events.on(playbackManager, 'playerchange', function (e, player) {
        bindToPlayer(player);
    });

    bindToPlayer(playbackManager.getCurrentPlayer());

    document.addEventListener('viewbeforeshow', function (e) {

        if (e.detail.enableMediaControl === false) {

            if (isVisibilityAllowed) {
                isVisibilityAllowed = false;
                hideNowPlayingBar();
            }

        } else if (!isVisibilityAllowed) {

            isVisibilityAllowed = true;
            if (currentPlayer) {
                refreshFromPlayer(currentPlayer);
            } else {
                hideNowPlayingBar();
            }
        }
    });
});