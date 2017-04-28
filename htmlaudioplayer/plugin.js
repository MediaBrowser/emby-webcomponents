define(['events', 'browser', 'pluginManager', 'apphost', 'appSettings'], function (events, browser, pluginManager, appHost, appSettings) {
    "use strict";

    function getSavedVolume() {
        return appSettings.get("volume") || 1;
    }

    function saveVolume(value) {
        if (value) {
            appSettings.set("volume", value);
        }
    }

    function getDefaultProfile() {

        return new Promise(function (resolve, reject) {

            require(['browserdeviceprofile'], function (profileBuilder) {

                resolve(profileBuilder({}));
            });
        });
    }

    var fadeTimeout;

    function fade(elem, startingVolume) {

        // Need to record the starting volume on each pass rather than querying elem.volume
        // This is due to iOS safari not allowing volume changes and always returning the system volume value

        var newVolume = Math.max(0, startingVolume - 0.15);
        console.log('fading volume to ' + newVolume);
        elem.volume = newVolume;

        if (newVolume <= 0) {
            return Promise.resolve();
        }

        return new Promise(function (resolve, reject) {

            cancelFadeTimeout();

            fadeTimeout = setTimeout(function () {
                fade(elem, newVolume).then(resolve, reject);
            }, 100);
        });
    }

    function cancelFadeTimeout() {
        var timeout = fadeTimeout;
        if (timeout) {
            clearTimeout(timeout);
            fadeTimeout = null;
        }
    }

    function HtmlAudioPlayer() {

        var self = this;

        self.name = 'Html Audio Player';
        self.type = 'mediaplayer';
        self.id = 'htmlaudioplayer';

        // Let any players created by plugins take priority
        self.priority = 1;

        var currentPlayOptions;
        var started;

        function playUwp(options, elem) {

            return Windows.Storage.StorageFile.getFileFromPathAsync(options.url).then(function (file) {

                var playlist = new Windows.Media.Playback.MediaPlaybackList();
                var source1 = Windows.Media.Core.MediaSource.createFromStorageFile(file);
                var startTime = (options.playerStartPositionTicks || 0) / 10000;
                var winJsPlaybackItem = new Windows.Media.Playback.MediaPlaybackItem(source1, startTime);
                playlist.items.append(winJsPlaybackItem);
                elem.src = URL.createObjectURL(playlist, { oneTimeOnly: true });
                self._currentSrc = elem.src;
                currentPlayOptions = options;
                return playWithPromise(elem);
            });
        }

        function createMediaElement() {

            var elem = document.querySelector('.mediaPlayerAudio');

            if (!elem) {
                elem = document.createElement('audio');
                elem.classList.add('mediaPlayerAudio');
                elem.classList.add('hide');

                document.body.appendChild(elem);

                elem.volume = getSavedVolume();

                elem.addEventListener('timeupdate', onTimeUpdate);
                elem.addEventListener('ended', onEnded);
                elem.addEventListener('volumechange', onVolumeChange);
                elem.addEventListener('pause', onPause);
                elem.addEventListener('playing', onPlaying);
                elem.addEventListener('error', onError);
            }

            return elem;
        }

        self.play = function (options) {

            self._currentTime = null;

            started = false;
            var elem = createMediaElement();
            self.mediaElement = elem;

            var val = options.url;

            var seconds = (options.playerStartPositionTicks || 0) / 10000000;
            if (seconds) {
                val += '#t=' + seconds;
            }

            var crossOrigin = getCrossOriginValue(options.mediaSource);
            if (crossOrigin) {
                elem.crossOrigin = crossOrigin;
            }

            elem.title = options.title;

            // Opera TV guidelines suggest using source elements, so let's do that if we have a valid mimeType
            if (options.mimeType && browser.operaTv) {

                // Need to do this or we won't be able to restart a new stream
                if (elem.currentSrc) {
                    elem.src = '';
                    elem.removeAttribute('src');
                }

                elem.innerHTML = '<source src="' + val + '" type="' + options.mimeType + '">';
            } else {

                if (window.Windows && options.mediaSource && options.mediaSource.IsLocal) {

                    return playUwp(options, elem);
                } else {

                    elem.src = val;
                }
            }

            self._currentSrc = val;
            currentPlayOptions = options;

            return playWithPromise(elem);
        };

        function playWithPromise(elem) {

            try {
                var promise = elem.play();
                if (promise && promise.then) {
                    // Chrome now returns a promise
                    return promise.catch(function (e) {

                        var errorName = (e.name || '').toLowerCase();
                        // safari uses aborterror
                        if (errorName === 'notallowederror' ||
                            errorName === 'aborterror') {
                            // swallow this error because the user can still click the play button on the audio element
                            return Promise.resolve();
                        }
                        return Promise.reject();
                    });
                } else {
                    return Promise.resolve();
                }
            } catch (err) {
                console.log('error calling audio.play: ' + err);
                return Promise.reject();
            }
        }

        function getCrossOriginValue(mediaSource) {

            if (mediaSource.IsRemote) {
                return null;
            }

            return 'anonymous';
        }

        function supportsFade() {

            if (browser.tv) {
                // Not working on tizen. 
                // We could possibly enable on other tv's, but all smart tv browsers tend to be pretty primitive
                return false;
            }

            return true;
        }

        self.stop = function (destroyPlayer) {

            cancelFadeTimeout();

            var elem = self.mediaElement;
            var src = self._currentSrc;

            if (elem && src) {

                if (!destroyPlayer || !supportsFade()) {

                    if (!elem.paused) {
                        elem.pause();
                    }
                    elem.src = '';
                    elem.innerHTML = '';
                    elem.removeAttribute("src");
                    onEnded();
                    return Promise.resolve();
                }

                var originalVolume = elem.volume;

                return fade(elem, elem.volume).then(function () {
                    if (!elem.paused) {
                        elem.pause();
                    }
                    elem.src = '';
                    elem.innerHTML = '';
                    elem.removeAttribute("src");

                    elem.volume = originalVolume;
                    onEnded();
                });
            }
            return Promise.resolve();
        };

        function onEnded() {

            var stopInfo = {
                src: self._currentSrc
            };

            events.trigger(self, 'stopped', [stopInfo]);

            self._currentTime = null;
            self._currentSrc = null;
            currentPlayOptions = null;
        }

        function onTimeUpdate() {

            // Get the player position + the transcoding offset
            var time = this.currentTime;

            self._currentTime = time;
            events.trigger(self, 'timeupdate');
        }

        function onVolumeChange() {

            if (!fadeTimeout) {
                saveVolume(this.volume);
                events.trigger(self, 'volumechange');
            }
        }

        function onPlaying(e) {

            if (!started) {
                started = true;
                this.removeAttribute('controls');

                seekOnPlaybackStart(e.target);
            } else {
                events.trigger(self, 'unpause');
            }
            events.trigger(self, 'playing');
        }

        function seekOnPlaybackStart(element) {

            var seconds = (currentPlayOptions.playerStartPositionTicks || 0) / 10000000;

            if (seconds) {
                var src = (self.currentSrc() || '').toLowerCase();

                // Appending #t=xxx to the query string doesn't seem to work with HLS
                // For plain video files, not all browsers support it either
                if (!browser.chrome || src.indexOf('.m3u8') !== -1) {

                    var delay = browser.safari ? 2500 : 0;
                    if (delay) {
                        setTimeout(function () {
                            element.currentTime = seconds;
                        }, delay);
                    } else {
                        element.currentTime = seconds;
                    }
                }
            }
        }

        function onPause() {
            events.trigger(self, 'pause');
        }

        function onError() {

            var errorCode = this.error ? this.error.code : '';
            errorCode = (errorCode || '').toString();
            console.log('Media element error code: ' + errorCode);

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
                    type = 'mediadecodeerror';
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

            onErrorInternal(type);
        }

        function onErrorInternal(type) {

            events.trigger(self, 'error', [
            {
                type: type
            }]);
        }

        function onDocumentClick() {
            document.removeEventListener('click', onDocumentClick);

            var elem = document.createElement('audio');
            elem.classList.add('mediaPlayerAudio');
            elem.classList.add('hide');

            document.body.appendChild(elem);

            elem.src = pluginManager.mapPath(self, 'blank.mp3');
            elem.play();

            setTimeout(function () {
                elem.src = '';
                elem.removeAttribute("src");
            }, 1000);
        }

        // Mobile browsers don't allow autoplay, so this is a nice workaround
        if (!appHost.supports('htmlaudioautoplay')) {
            document.addEventListener('click', onDocumentClick);
        }
    }

    HtmlAudioPlayer.prototype.currentSrc = function () {
        return this._currentSrc;
    };

    HtmlAudioPlayer.prototype.canPlayMediaType = function (mediaType) {

        return (mediaType || '').toLowerCase() === 'audio';
    };

    HtmlAudioPlayer.prototype.getDeviceProfile = function (item) {

        if (appHost.getDeviceProfile) {
            return appHost.getDeviceProfile(item);
        }

        return getDefaultProfile();
    };

    // Save this for when playback stops, because querying the time at that point might return 0
    HtmlAudioPlayer.prototype.currentTime = function (val) {

        var mediaElement = this.mediaElement;
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

    HtmlAudioPlayer.prototype.duration = function (val) {

        var mediaElement = this.mediaElement;
        if (mediaElement) {
            var duration = mediaElement.duration;
            if (duration && !isNaN(duration) && duration !== Number.POSITIVE_INFINITY && duration !== Number.NEGATIVE_INFINITY) {
                return duration * 1000;
            }
        }

        return null;
    };

    HtmlAudioPlayer.prototype.pause = function () {
        var mediaElement = this.mediaElement;
        if (mediaElement) {
            mediaElement.pause();
        }
    };

    // This is a retry after error
    HtmlAudioPlayer.prototype.resume = function () {
        var mediaElement = this.mediaElement;
        if (mediaElement) {
            mediaElement.play();
        }
    };

    HtmlAudioPlayer.prototype.unpause = function () {
        var mediaElement = this.mediaElement;
        if (mediaElement) {
            mediaElement.play();
        }
    };

    HtmlAudioPlayer.prototype.paused = function () {

        var mediaElement = this.mediaElement;
        if (mediaElement) {
            return mediaElement.paused;
        }

        return false;
    };

    HtmlAudioPlayer.prototype.setVolume = function (val) {
        var mediaElement = this.mediaElement;
        if (mediaElement) {
            mediaElement.volume = val / 100;
        }
    };

    HtmlAudioPlayer.prototype.getVolume = function () {
        var mediaElement = this.mediaElement;
        if (mediaElement) {
            return mediaElement.volume * 100;
        }
    };

    HtmlAudioPlayer.prototype.volumeUp = function () {
        this.setVolume(Math.min(this.getVolume() + 2, 100));
    };

    HtmlAudioPlayer.prototype.volumeDown = function () {
        this.setVolume(Math.max(this.getVolume() - 2, 0));
    };

    HtmlAudioPlayer.prototype.setMute = function (mute) {

        var mediaElement = this.mediaElement;
        if (mediaElement) {
            mediaElement.muted = mute;
        }
    };

    HtmlAudioPlayer.prototype.isMuted = function () {
        var mediaElement = this.mediaElement;
        if (mediaElement) {
            return mediaElement.muted;
        }
        return false;
    };

    HtmlAudioPlayer.prototype.destroy = function () {

    };

    return HtmlAudioPlayer;
});