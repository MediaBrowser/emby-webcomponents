define(['browser', 'require', 'events', 'apphost', 'loading', 'dom', 'playbackManager', 'embyRouter', 'appSettings', 'connectionManager', './htmlmediahelper'], function (browser, require, events, appHost, loading, dom, playbackManager, embyRouter, appSettings, connectionManager, htmlMediaHelper) {
    "use strict";

    function tryRemoveElement(elem) {
        var parentNode = elem.parentNode;
        if (parentNode) {

            // Seeing crashes in edge webview
            try {
                parentNode.removeChild(elem);
            } catch (err) {
                console.log('Error removing dialog element: ' + err);
            }
        }
    }

    function getDefaultProfile() {

        return new Promise(function (resolve, reject) {

            require(['browserdeviceprofile'], function (profileBuilder) {

                resolve(profileBuilder({}));
            });
        });
    }

    var _supportsTextTracks;
    function supportsTextTracks() {

        if (_supportsTextTracks == null) {
            _supportsTextTracks = document.createElement('video').textTracks != null;
        }

        // For now, until ready
        return _supportsTextTracks;
    }

    function enableNativeTrackSupport(currentSrc, track) {

        if (browser.firefox) {
            if ((currentSrc || '').toLowerCase().indexOf('.m3u8') !== -1) {
                return false;
            }
        }

        if (browser.ps4) {
            return false;
        }

        // Edge is randomly not rendering subtitles
        if (browser.edge) {
            return false;
        }

        if (track) {
            var format = (track.Codec || '').toLowerCase();
            if (format === 'ssa' || format === 'ass') {
                // libjass is needed here
                return false;
            }
        }

        return true;
    }

    function requireHlsPlayer(callback) {
        require(['hlsjs'], function (hls) {
            window.Hls = hls;
            callback();
        });
    }

    function getMediaStreamAudioTracks(mediaSource) {

        return mediaSource.MediaStreams.filter(function (s) {
            return s.Type === 'Audio';
        });
    }

    function getMediaStreamTextTracks(mediaSource) {

        return mediaSource.MediaStreams.filter(function (s) {
            return s.Type === 'Subtitle' && s.DeliveryMethod === 'External';
        });
    }

    function zoomIn(elem) {

        return new Promise(function (resolve, reject) {

            var duration = 240;
            elem.style.animation = 'htmlvideoplayer-zoomin ' + duration + 'ms ease-in normal';
            dom.addEventListener(elem, dom.whichAnimationEvent(), resolve, {
                once: true
            });
        });
    }

    function normalizeTrackEventText(text) {
        return text.replace(/\\N/gi, '\n');
    }

    function setTracks(elem, tracks, mediaSource, serverId) {

        elem.innerHTML = getTracksHtml(tracks, mediaSource, serverId);
    }

    function getTextTrackUrl(track, serverId) {
        return playbackManager.getSubtitleUrl(track, serverId);
    }

    function getTracksHtml(tracks, mediaSource, serverId) {
        return tracks.map(function (t) {

            var defaultAttribute = mediaSource.DefaultSubtitleStreamIndex === t.Index ? ' default' : '';

            var language = t.Language || 'und';
            var label = t.Language || 'und';
            return '<track id="textTrack' + t.Index + '" label="' + label + '" kind="subtitles" src="' + getTextTrackUrl(t, serverId) + '" srclang="' + language + '"' + defaultAttribute + '></track>';

        }).join('');
    }

    function HtmlVideoPlayer() {

        this.name = 'Html Video Player';
        this.type = 'mediaplayer';
        this.id = 'htmlvideoplayer';

        // Let any players created by plugins take priority
        this.priority = 1;

        var videoDialog;

        var winJsPlaybackItem;

        var subtitleTrackIndexToSetOnPlaying;

        var lastCustomTrackMs = 0;
        var currentClock;
        var currentAssRenderer;
        var customTrackIndex = -1;

        var videoSubtitlesElem;
        var currentTrackEvents;

        var self = this;

        self.currentSrc = function () {
            return self._currentSrc;
        };

        function updateVideoUrl(streamInfo) {

            var isHls = streamInfo.url.toLowerCase().indexOf('.m3u8') !== -1;

            var mediaSource = streamInfo.mediaSource;
            var item = streamInfo.item;

            // Huge hack alert. Safari doesn't seem to like if the segments aren't available right away when playback starts
            // This will start the transcoding process before actually feeding the video url into the player
            // Edit: Also seeing stalls from hls.js
            if (mediaSource && item && !mediaSource.RunTimeTicks && isHls && streamInfo.playMethod === 'Transcode' && (browser.iOS || browser.osx)) {

                var hlsPlaylistUrl = streamInfo.url.replace('master.m3u8', 'live.m3u8');

                loading.show();

                console.log('prefetching hls playlist: ' + hlsPlaylistUrl);

                return connectionManager.getApiClient(item.ServerId).ajax({

                    type: 'GET',
                    url: hlsPlaylistUrl

                }).then(function () {

                    console.log('completed prefetching hls playlist: ' + hlsPlaylistUrl);

                    loading.hide();
                    streamInfo.url = hlsPlaylistUrl;

                    return Promise.resolve();

                }, function () {

                    console.log('error prefetching hls playlist: ' + hlsPlaylistUrl);

                    loading.hide();
                    return Promise.resolve();
                });

            } else {
                return Promise.resolve();
            }
        }

        self.play = function (options) {

            if (browser.msie) {
                if (options.playMethod === 'Transcode' && !window.MediaSource) {
                    alert('Playback of this content is not supported in Internet Explorer. For a better experience, try a modern browser such as Microsoft Edge, Google Chrome, Firefox or Opera.');
                    return Promise.reject();
                }
            }

            self._started = false;
            self._timeUpdated = false;

            self._currentTime = null;

            return createMediaElement(options).then(function (elem) {

                return updateVideoUrl(options, options.mediaSource).then(function () {
                    return setCurrentSrc(elem, options);
                });
            });
        };

        function setCurrentSrc(elem, options) {

            elem.removeEventListener('error', onError);

            var val = options.url;
            console.log('playing url: ' + val);

            //if (AppInfo.isNativeApp && $.browser.safari) {
            //    val = val.replace('file://', '');
            //}

            // Convert to seconds
            var seconds = (options.playerStartPositionTicks || 0) / 10000000;
            if (seconds) {
                val += '#t=' + seconds;
            }

            htmlMediaHelper.destroyHlsPlayer(self);

            var tracks = getMediaStreamTextTracks(options.mediaSource);

            var currentTrackIndex = -1;
            for (var i = 0, length = tracks.length; i < length; i++) {
                if (tracks[i].Index === options.mediaSource.DefaultSubtitleStreamIndex) {
                    currentTrackIndex = tracks[i].Index;
                    break;
                }
            }
            subtitleTrackIndexToSetOnPlaying = currentTrackIndex;

            self._currentPlayOptions = options;

            var crossOrigin = htmlMediaHelper.getCrossOriginValue(options.mediaSource);
            if (crossOrigin) {
                elem.crossOrigin = crossOrigin;
            }

            if (htmlMediaHelper.enableHlsPlayer(options.item, options.mediaSource, 'Video') && val.indexOf('.m3u8') !== -1) {

                setTracks(elem, tracks, options.mediaSource, options.item.ServerId);

                return new Promise(function (resolve, reject) {

                    requireHlsPlayer(function () {
                        var hls = new Hls({
                            manifestLoadingTimeOut: 20000
                            //appendErrorMaxRetry: 6,
                            //debug: true
                        });
                        hls.loadSource(val);
                        hls.attachMedia(elem);

                        htmlMediaHelper.bindEventsToHlsPlayer(self, hls, elem, onError, resolve, reject);

                        self._hlsPlayer = hls;

                        // This is needed in setCurrentTrackElement
                        self._currentSrc = val;

                        setCurrentTrackElement(currentTrackIndex);
                    });
                });

            } else {

                elem.autoplay = true;
                var mimeType = options.mimeType;

                // Opera TV guidelines suggest using source elements, so let's do that if we have a valid mimeType
                if (mimeType && browser.operaTv) {

                    if (browser.chrome && mimeType === 'video/x-matroska') {
                        mimeType = 'video/webm';
                    }

                    // Need to do this or we won't be able to restart a new stream
                    if (elem.currentSrc) {
                        elem.src = '';
                        elem.removeAttribute('src');
                    }

                    elem.innerHTML = '<source src="' + val + '" type="' + mimeType + '">' + getTracksHtml(tracks, options.mediaSource, options.item.ServerId);

                    elem.addEventListener('loadedmetadata', onLoadedMetadata);
                } else {

                    return htmlMediaHelper.applySrc(elem, val, options).then(function () {

                        setTracks(elem, tracks, options.mediaSource, options.item.ServerId);

                        self._currentSrc = val;

                        setCurrentTrackElement(currentTrackIndex);
                        return htmlMediaHelper.playWithPromise(elem, onError);
                    });
                }

                // This is needed in setCurrentTrackElement
                self._currentSrc = val;

                setCurrentTrackElement(currentTrackIndex);
                return htmlMediaHelper.playWithPromise(elem, onError);
            }
        }

        self.setSubtitleStreamIndex = function (index) {

            setCurrentTrackElement(index);
        };

        self.setAudioStreamIndex = function (index) {

            var audioStreams = getMediaStreamAudioTracks(self._currentPlayOptions.mediaSource);

            var audioTrackOffset = -1;
            var i, length;

            for (i = 0, length = audioStreams.length; i < length; i++) {

                if (audioStreams[i].Index === index) {
                    audioTrackOffset = i;
                    break;
                }
            }

            if (audioTrackOffset === -1) {
                return;
            }

            var elem = self._mediaElement;
            if (!elem) {
                return;
            }

            // https://msdn.microsoft.com/en-us/library/hh772507(v=vs.85).aspx
            var elemAudioTracks = elem.audioTracks || [];
            for (i = 0, length = elemAudioTracks.length; i < length; i++) {

                if (audioTrackOffset === i) {
                    elemAudioTracks[i].enabled = true;
                } else {
                    elemAudioTracks[i].enabled = false;
                }
            }
        };

        self.stop = function (destroyPlayer) {

            var elem = self._mediaElement;
            var src = self._currentSrc;

            if (elem) {

                if (src) {
                    elem.pause();
                }

                htmlMediaHelper.onEndedInternal(self, elem, onError);

                if (destroyPlayer) {
                    self.destroy();
                }
            }

            destroyCustomTrack(elem);

            return Promise.resolve();
        };

        self.destroy = function () {

            htmlMediaHelper.destroyHlsPlayer(self);
            embyRouter.setTransparency('none');

            var videoElement = self._mediaElement;

            if (videoElement) {

                self._mediaElement = null;

                destroyCustomTrack(videoElement);

                videoElement.removeEventListener('timeupdate', onTimeUpdate);
                videoElement.removeEventListener('ended', onEnded);
                videoElement.removeEventListener('volumechange', onVolumeChange);
                videoElement.removeEventListener('pause', onPause);
                videoElement.removeEventListener('playing', onPlaying);
                videoElement.removeEventListener('play', onPlay);
                videoElement.removeEventListener('loadedmetadata', onLoadedMetadata);
                videoElement.removeEventListener('click', onClick);
                videoElement.removeEventListener('dblclick', onDblClick);

                videoElement.parentNode.removeChild(videoElement);
            }

            var dlg = videoDialog;
            if (dlg) {

                videoDialog = null;

                dlg.parentNode.removeChild(dlg);
            }
        };

        function onEnded() {

            destroyCustomTrack(this);
            htmlMediaHelper.onEndedInternal(self, this, onError);
        }

        function onTimeUpdate(e) {

            // Get the player position + the transcoding offset
            var time = this.currentTime;

            if (time && !self._timeUpdated) {
                self._timeUpdated = true;
                ensureValidVideo(this);
            }

            self._currentTime = time;
            var timeMs = time * 1000;
            timeMs += ((self._currentPlayOptions.transcodingOffsetTicks || 0) / 10000);
            updateSubtitleText(timeMs);

            events.trigger(self, 'timeupdate');
        }

        function onVolumeChange() {

            htmlMediaHelper.saveVolume(this.volume);
            events.trigger(self, 'volumechange');
        }

        function onNavigatedToOsd() {

            videoDialog.classList.remove('videoPlayerContainer-withBackdrop');
            videoDialog.classList.remove('videoPlayerContainer-onTop');
        }

        function onPlaying(e) {

            if (!self._started) {
                self._started = true;
                this.removeAttribute('controls');

                if (self._currentPlayOptions.title) {
                    self.originalDocumentTitle = document.title;
                    document.title = self._currentPlayOptions.title;
                } else {
                    self.originalDocumentTitle = null;
                }

                setCurrentTrackElement(subtitleTrackIndexToSetOnPlaying);

                htmlMediaHelper.seekOnPlaybackStart(self, e.target, self._currentPlayOptions.playerStartPositionTicks);

                if (self._currentPlayOptions.fullscreen) {

                    embyRouter.showVideoOsd().then(onNavigatedToOsd);

                } else {
                    embyRouter.setTransparency('backdrop');
                    videoDialog.classList.remove('videoPlayerContainer-withBackdrop');
                    videoDialog.classList.remove('videoPlayerContainer-onTop');
                }

                loading.hide();

            }
            events.trigger(self, 'playing');
        }

        function onPlay(e) {

            events.trigger(self, 'unpause');
        }

        function ensureValidVideo(elem) {
            if (elem !== self._mediaElement) {
                return;
            }

            if (elem.videoWidth === 0 && elem.videoHeight === 0) {
                htmlMediaHelper.onErrorInternal(self, 'mediadecodeerror');
                return;
            }

            //if (elem.audioTracks && !elem.audioTracks.length) {
            //    htmlMediaHelper.onErrorInternal(self, 'mediadecodeerror');
            //}
        }

        function onClick() {
            events.trigger(self, 'click');
        }

        function onDblClick() {
            events.trigger(self, 'dblclick');
        }

        function onPause() {
            events.trigger(self, 'pause');
        }

        function onError() {

            var errorCode = this.error ? (this.error.code || 0) : 0;
            var errorMessage = this.error ? (this.error.message || '') : '';
            console.log('Media element error: ' + errorCode.toString() + ' ' + errorMessage);

            var type;

            switch (errorCode) {
                case 1:
                    // MEDIA_ERR_ABORTED
                    // This will trigger when changing media while something is playing
                    return;
                case 2:
                    // MEDIA_ERR_NETWORK
                    type = 'network';
                    break;
                case 3:
                    // MEDIA_ERR_DECODE
                    if (self._hlsPlayer) {
                        htmlMediaHelper.handleMediaError(self);
                        return;
                    } else {
                        type = 'mediadecodeerror';
                    }
                    break;
                case 4:
                    // MEDIA_ERR_SRC_NOT_SUPPORTED
                    type = 'medianotsupported';
                    break;
                default:
                    // seeing cases where Edge is firing error events with no error code
                    // example is start playing something, then immediately change src to something else
                    return;
            }

            htmlMediaHelper.onErrorInternal(self, type);
        }

        function onLoadedMetadata(e) {

            var mediaElem = e.target;
            mediaElem.removeEventListener('loadedmetadata', onLoadedMetadata);

            if (!self._hlsPlayer) {

                try {
                    mediaElem.play();
                } catch (err) {
                    console.log('error calling mediaElement.play: ' + err);
                }
            }
        }

        function destroyCustomTrack(videoElement) {

            window.removeEventListener('resize', onVideoResize);
            window.removeEventListener('orientationchange', onVideoResize);

            if (videoSubtitlesElem) {
                var subtitlesContainer = videoSubtitlesElem.parentNode;
                if (subtitlesContainer) {
                    tryRemoveElement(subtitlesContainer);
                }
                videoSubtitlesElem = null;
            }

            currentTrackEvents = null;

            if (videoElement) {
                var allTracks = videoElement.textTracks || []; // get list of tracks
                for (var i = 0; i < allTracks.length; i++) {

                    var currentTrack = allTracks[i];

                    if (currentTrack.label.indexOf('manualTrack') !== -1) {
                        currentTrack.mode = 'disabled';
                    }
                }
            }

            customTrackIndex = -1;
            currentClock = null;
            self._currentAspectRatio = null;

            var renderer = currentAssRenderer;
            if (renderer) {
                renderer.setEnabled(false);
            }
            currentAssRenderer = null;
        }

        self.destroyCustomTrack = destroyCustomTrack;

        function fetchSubtitles(track, serverId) {

            return new Promise(function (resolve, reject) {

                require(['fetchHelper'], function (fetchHelper) {
                    fetchHelper.ajax({
                        url: getTextTrackUrl(track, serverId).replace('.vtt', '.js'),
                        type: 'GET',
                        dataType: 'json'
                    }).then(resolve, reject);
                });
            });
        }

        function setTrackForCustomDisplay(videoElement, track) {

            if (!track) {
                destroyCustomTrack(videoElement);
                return;
            }

            // if already playing thids track, skip
            if (customTrackIndex === track.Index) {
                return;
            }

            var serverId = self._currentPlayOptions.item.ServerId;

            destroyCustomTrack(videoElement);
            customTrackIndex = track.Index;
            renderTracksEvents(videoElement, track, serverId);
            lastCustomTrackMs = 0;
        }

        function renderWithLibjass(videoElement, track, serverId) {

            var rendererSettings = {};

            if (browser.ps4) {
                // Text outlines are not rendering very well
                rendererSettings.enableSvg = false;
            }
            else if (browser.edge || browser.msie) {
                // svg not rendering at all
                rendererSettings.enableSvg = false;
            }

            require(['libjass'], function (libjass) {

                libjass.ASS.fromUrl(getTextTrackUrl(track, serverId)).then(function (ass) {

                    var clock = new libjass.renderers.ManualClock();
                    currentClock = clock;

                    // Create a DefaultRenderer using the video element and the ASS object
                    var renderer = new libjass.renderers.WebRenderer(ass, clock, videoElement.parentNode, rendererSettings);

                    currentAssRenderer = renderer;

                    renderer.addEventListener("ready", function () {
                        try {
                            renderer.resize(videoElement.offsetWidth, videoElement.offsetHeight, 0, 0);
                            window.removeEventListener('resize', onVideoResize);
                            window.addEventListener('resize', onVideoResize);
                            window.removeEventListener('orientationchange', onVideoResize);
                            window.addEventListener('orientationchange', onVideoResize);
                            //clock.pause();
                        } catch (ex) {
                        }
                    });
                }, function () {
                    htmlMediaHelper.onErrorInternal(self, 'mediadecodeerror');
                });
            });
        }

        function onVideoResize() {
            var renderer = currentAssRenderer;
            if (renderer) {
                var videoElement = self._mediaElement;
                var width = videoElement.offsetWidth;
                var height = videoElement.offsetHeight;
                console.log('videoElement resized: ' + width + 'x' + height);
                renderer.resize(width, height, 0, 0);
            }
        }

        function requiresCustomSubtitlesElement() {

            // after a system update, ps4 isn't showing anything when creating a track element dynamically
            // going to have to do it ourselves
            if (browser.ps4) {
                return true;
            }

            if (browser.edge) {
                return true;
            }

            return false;
        }

        function renderSubtitlesWithCustomElement(videoElement, track, serverId) {

            fetchSubtitles(track, serverId).then(function (data) {
                if (!videoSubtitlesElem) {
                    var subtitlesContainer = document.createElement('div');
                    subtitlesContainer.classList.add('videoSubtitles');
                    subtitlesContainer.innerHTML = '<div class="videoSubtitlesInner"></div>';
                    videoSubtitlesElem = subtitlesContainer.querySelector('.videoSubtitlesInner');
                    videoElement.parentNode.appendChild(subtitlesContainer);
                    currentTrackEvents = data.TrackEvents;
                }
            });
        }

        function renderTracksEvents(videoElement, track, serverId) {

            var format = (track.Codec || '').toLowerCase();
            if (format === 'ssa' || format === 'ass') {
                // libjass is needed here
                renderWithLibjass(videoElement, track, serverId);
                return;
            }

            if (requiresCustomSubtitlesElement()) {
                renderSubtitlesWithCustomElement(videoElement, track, serverId);
                return;
            }

            var trackElement = null;
            var expectedId = 'manualTrack' + track.Index;

            var allTracks = videoElement.textTracks; // get list of tracks
            for (var i = 0; i < allTracks.length; i++) {

                var currentTrack = allTracks[i];

                if (currentTrack.label === expectedId) {
                    trackElement = currentTrack;
                    break;
                } else {
                    currentTrack.mode = 'disabled';
                }
            }

            if (!trackElement) {
                trackElement = videoElement.addTextTrack('subtitles', 'manualTrack' + track.Index, track.Language || 'und');

                // download the track json
                fetchSubtitles(track, serverId).then(function (data) {

                    // show in ui
                    console.log('downloaded ' + data.TrackEvents.length + ' track events');
                    // add some cues to show the text
                    // in safari, the cues need to be added before setting the track mode to showing
                    data.TrackEvents.forEach(function (trackEvent) {

                        var trackCueObject = window.VTTCue || window.TextTrackCue;
                        var cue = new trackCueObject(trackEvent.StartPositionTicks / 10000000, trackEvent.EndPositionTicks / 10000000, normalizeTrackEventText(trackEvent.Text));

                        trackElement.addCue(cue);
                    });
                    trackElement.mode = 'showing';
                });
            } else {
                trackElement.mode = 'showing';
            }
        }

        function updateSubtitleText(timeMs) {

            var clock = currentClock;
            if (clock) {
                try {
                    clock.seek(timeMs / 1000);
                } catch (err) {
                    console.log('Error in libjass: ' + err);
                }
                return;
            }

            var trackEvents = currentTrackEvents;
            if (trackEvents && videoSubtitlesElem) {
                var ticks = timeMs * 10000;
                var selectedTrackEvent;
                for (var i = 0; i < trackEvents.length; i++) {

                    var currentTrackEvent = trackEvents[i];
                    if (currentTrackEvent.StartPositionTicks <= ticks && currentTrackEvent.EndPositionTicks >= ticks) {
                        selectedTrackEvent = currentTrackEvent;
                        break;
                    }
                }

                if (selectedTrackEvent) {

                    videoSubtitlesElem.innerHTML = normalizeTrackEventText(selectedTrackEvent.Text);
                    videoSubtitlesElem.classList.remove('hide');

                } else {
                    videoSubtitlesElem.innerHTML = '';
                    videoSubtitlesElem.classList.add('hide');
                }
            }
        }

        function setCurrentTrackElement(streamIndex) {

            console.log('Setting new text track index to: ' + streamIndex);

            var mediaStreamTextTracks = getMediaStreamTextTracks(self._currentPlayOptions.mediaSource);

            var track = streamIndex === -1 ? null : mediaStreamTextTracks.filter(function (t) {
                return t.Index === streamIndex;
            })[0];

            if (enableNativeTrackSupport(self._currentSrc, track)) {

                setTrackForCustomDisplay(self._mediaElement, null);
            } else {
                setTrackForCustomDisplay(self._mediaElement, track);

                // null these out to disable the player's native display (handled below)
                streamIndex = -1;
                track = null;
            }

            var expectedId = 'textTrack' + streamIndex;
            var trackIndex = streamIndex === -1 || !track ? -1 : mediaStreamTextTracks.indexOf(track);
            var modes = ['disabled', 'showing', 'hidden'];

            var allTracks = self._mediaElement.textTracks; // get list of tracks
            for (var i = 0; i < allTracks.length; i++) {

                var currentTrack = allTracks[i];

                console.log('currentTrack id: ' + currentTrack.id);

                var mode;

                console.log('expectedId: ' + expectedId + '--currentTrack.Id:' + currentTrack.id);

                // IE doesn't support track id
                if (browser.msie || browser.edge) {
                    if (trackIndex === i) {
                        mode = 1; // show this track
                    } else {
                        mode = 0; // hide all other tracks
                    }
                } else {

                    if (currentTrack.label.indexOf('manualTrack') !== -1) {
                        continue;
                    }
                    if (currentTrack.id === expectedId) {
                        mode = 1; // show this track
                    } else {
                        mode = 0; // hide all other tracks
                    }
                }

                console.log('Setting track ' + i + ' mode to: ' + mode);

                // Safari uses integers for the mode property
                // http://www.jwplayer.com/html5/scripting/
                // edit: not anymore
                var useNumericMode = false;

                if (!isNaN(currentTrack.mode)) {
                    //useNumericMode = true;
                }

                if (useNumericMode) {
                    currentTrack.mode = mode;
                } else {
                    currentTrack.mode = modes[mode];
                }
            }
        }

        function updateTextStreamUrls(startPositionTicks) {

            if (!supportsTextTracks()) {
                return;
            }

            var allTracks = self._mediaElement.textTracks; // get list of tracks
            var i;
            var track;

            for (i = 0; i < allTracks.length; i++) {

                track = allTracks[i];

                // This throws an error in IE, but is fine in chrome
                // In IE it's not necessary anyway because changing the src seems to be enough
                try {
                    while (track.cues.length) {
                        track.removeCue(track.cues[0]);
                    }
                } catch (e) {
                    console.log('Error removing cue from textTrack');
                }
            }

            var tracks = self._mediaElement.querySelectorAll('track');
            for (i = 0; i < tracks.length; i++) {

                track = tracks[i];

                track.src = replaceQueryString(track.src, 'startPositionTicks', startPositionTicks);
            }
        }

        function createMediaElement(options) {

            if (browser.tv || browser.noAnimation || browser.iOS) {
                // too slow
                // also on iOS, the backdrop image doesn't look right
                options.backdropUrl = null;
            }
            return new Promise(function (resolve, reject) {

                var dlg = document.querySelector('.videoPlayerContainer');

                if (!dlg) {

                    require(['css!./style'], function () {

                        loading.show();

                        var dlg = document.createElement('div');

                        dlg.classList.add('videoPlayerContainer');

                        if (options.backdropUrl) {

                            dlg.classList.add('videoPlayerContainer-withBackdrop');
                            dlg.style.backgroundImage = "url('" + options.backdropUrl + "')";
                        }

                        if (options.fullscreen) {
                            dlg.classList.add('videoPlayerContainer-onTop');
                        }

                        // playsinline new for iOS 10
                        // https://developer.apple.com/library/content/releasenotes/General/WhatsNewInSafari/Articles/Safari_10_0.html

                        var html = '';
                        // Can't autoplay in these browsers so we need to use the full controls, at least until playback starts
                        if (!appHost.supports('htmlvideoautoplay')) {
                            html += '<video class="htmlvideoplayer" preload="metadata" autoplay="autoplay" controls="controls" webkit-playsinline playsinline>';
                        } else {

                            // Chrome 35 won't play with preload none
                            html += '<video class="htmlvideoplayer" preload="metadata" autoplay="autoplay" webkit-playsinline playsinline>';
                        }

                        html += '</video>';

                        dlg.innerHTML = html;
                        var videoElement = dlg.querySelector('video');

                        videoElement.volume = htmlMediaHelper.getSavedVolume();
                        videoElement.addEventListener('timeupdate', onTimeUpdate);
                        videoElement.addEventListener('ended', onEnded);
                        videoElement.addEventListener('volumechange', onVolumeChange);
                        videoElement.addEventListener('pause', onPause);
                        videoElement.addEventListener('playing', onPlaying);
                        videoElement.addEventListener('play', onPlay);
                        videoElement.addEventListener('click', onClick);
                        videoElement.addEventListener('dblclick', onDblClick);

                        document.body.insertBefore(dlg, document.body.firstChild);
                        videoDialog = dlg;
                        self._mediaElement = videoElement;

                        // don't animate on smart tv's, too slow
                        if (options.fullscreen && browser.supportsCssAnimation() && !browser.slow) {
                            zoomIn(dlg).then(function () {
                                resolve(videoElement);
                            });
                        } else {
                            resolve(videoElement);
                        }

                    });

                } else {

                    if (options.backdropUrl) {

                        dlg.classList.add('videoPlayerContainer-withBackdrop');
                        dlg.style.backgroundImage = "url('" + options.backdropUrl + "')";
                    }

                    resolve(dlg.querySelector('video'));
                }
            });
        }
    }

    HtmlVideoPlayer.prototype.canPlayMediaType = function (mediaType) {

        return (mediaType || '').toLowerCase() === 'video';
    };

    HtmlVideoPlayer.prototype.supportsPlayMethod = function (playMethod, item) {

        if (appHost.supportsPlayMethod) {
            return appHost.supportsPlayMethod(playMethod, item);
        }

        return true;
    };

    HtmlVideoPlayer.prototype.getDeviceProfile = function (item, options) {

        if (appHost.getDeviceProfile) {
            return appHost.getDeviceProfile(item, options);
        }

        return getDefaultProfile();
    };

    var supportedFeatures;
    function getSupportedFeatures() {

        var list = [];

        var video = document.createElement('video');
        //if (video.webkitSupportsPresentationMode && video.webkitSupportsPresentationMode('picture-in-picture') && typeof video.webkitSetPresentationMode === "function") {
        //    list.push('PictureInPicture');
        //}
        if (browser.ipad) {

            // Unfortunately this creates a false positive on devices where its' not actually supported
            if (navigator.userAgent.toLowerCase().indexOf('os 9') === -1) {
                if (video.webkitSupportsPresentationMode && video.webkitSupportsPresentationMode && typeof video.webkitSetPresentationMode === "function") {
                    list.push('PictureInPicture');
                }
            }
        }

        list.push('SetBrightness');
        return list;
    }

    HtmlVideoPlayer.prototype.supports = function (feature) {

        if (!supportedFeatures) {
            supportedFeatures = getSupportedFeatures();
        }

        return supportedFeatures.indexOf(feature) !== -1;
    };

    // Save this for when playback stops, because querying the time at that point might return 0
    HtmlVideoPlayer.prototype.currentTime = function (val) {

        var mediaElement = this._mediaElement;
        if (mediaElement) {
            if (val != null) {
                mediaElement.currentTime = val / 1000;
                return;
            }

            var currentTime = this._currentTime;
            if (currentTime) {
                return currentTime * 1000;
            }

            return (mediaElement.currentTime || 0) * 1000;
        }
    };

    HtmlVideoPlayer.prototype.duration = function (val) {

        var mediaElement = this._mediaElement;
        if (mediaElement) {
            var duration = mediaElement.duration;
            if (htmlMediaHelper.isValidDuration(duration)) {
                return duration * 1000;
            }
        }

        return null;
    };

    HtmlVideoPlayer.prototype.canSetAudioStreamIndex = function () {

        if (browser.edge || browser.msie) {
            return true;
        }

        return false;
    };

    HtmlVideoPlayer.prototype.setPictureInPictureEnabled = function (isEnabled) {

        var video = this._mediaElement;
        if (video) {
            if (video.webkitSupportsPresentationMode && typeof video.webkitSetPresentationMode === "function") {
                video.webkitSetPresentationMode(isEnabled ? "picture-in-picture" : "inline");
            }
        }
    };

    HtmlVideoPlayer.prototype.isPictureInPictureEnabled = function (isEnabled) {

        var video = this._mediaElement;
        if (video) {
            return video.webkitPresentationMode === "picture-in-picture";
        }

        return false;
    };

    HtmlVideoPlayer.prototype.setBrightness = function (val) {

        var elem = this._mediaElement;

        if (elem) {

            val = Math.max(0, val);
            val = Math.min(100, val);

            var rawValue = val;
            rawValue = Math.max(20, rawValue);

            var cssValue = rawValue >= 100 ? 'none' : (rawValue / 100);
            elem.style['-webkit-filter'] = 'brightness(' + cssValue + ');';
            elem.style.filter = 'brightness(' + cssValue + ')';
            elem.brightnessValue = val;
            events.trigger(this, 'brightnesschange');
        }
    };

    HtmlVideoPlayer.prototype.getBrightness = function () {

        var elem = this._mediaElement;

        if (elem) {
            var val = elem.brightnessValue;
            return val == null ? 100 : val;
        }
    };

    HtmlVideoPlayer.prototype.seekable = function () {
        var mediaElement = this._mediaElement;
        if (mediaElement) {

            var seekable = mediaElement.seekable;
            if (seekable && seekable.length) {

                var start = seekable.start(0);
                var end = seekable.end(0);

                if (!htmlMediaHelper.isValidDuration(start)) {
                    start = 0;
                }
                if (!htmlMediaHelper.isValidDuration(end)) {
                    end = 0;
                }

                return (end - start) > 0;
            }

            return false;
        }
    };

    HtmlVideoPlayer.prototype.pause = function () {
        var mediaElement = this._mediaElement;
        if (mediaElement) {
            mediaElement.pause();
        }
    };

    // This is a retry after error
    HtmlVideoPlayer.prototype.resume = function () {
        var mediaElement = this._mediaElement;
        if (mediaElement) {
            mediaElement.play();
        }
    };

    HtmlVideoPlayer.prototype.unpause = function () {
        var mediaElement = this._mediaElement;
        if (mediaElement) {
            mediaElement.play();
        }
    };

    HtmlVideoPlayer.prototype.paused = function () {

        var mediaElement = this._mediaElement;
        if (mediaElement) {
            return mediaElement.paused;
        }

        return false;
    };

    HtmlVideoPlayer.prototype.setVolume = function (val) {
        var mediaElement = this._mediaElement;
        if (mediaElement) {
            mediaElement.volume = val / 100;
        }
    };

    HtmlVideoPlayer.prototype.getVolume = function () {
        var mediaElement = this._mediaElement;
        if (mediaElement) {
            return mediaElement.volume * 100;
        }
    };

    HtmlVideoPlayer.prototype.volumeUp = function () {
        this.setVolume(Math.min(this.getVolume() + 2, 100));
    };

    HtmlVideoPlayer.prototype.volumeDown = function () {
        this.setVolume(Math.max(this.getVolume() - 2, 0));
    };

    HtmlVideoPlayer.prototype.setMute = function (mute) {

        var mediaElement = this._mediaElement;
        if (mediaElement) {
            mediaElement.muted = mute;
        }
    };

    HtmlVideoPlayer.prototype.isMuted = function () {
        var mediaElement = this._mediaElement;
        if (mediaElement) {
            return mediaElement.muted;
        }
        return false;
    };

    HtmlVideoPlayer.prototype.setAspectRatio = function (val) {

    };

    HtmlVideoPlayer.prototype.getAspectRatio = function () {

        return this._currentAspectRatio;
    };

    HtmlVideoPlayer.prototype.getSupportedAspectRatios = function () {

        return [];
    };

    HtmlVideoPlayer.prototype.togglePictureInPicture = function () {
        return this.setPictureInPictureEnabled(!this.isPictureInPictureEnabled());
    };

    return HtmlVideoPlayer;
});