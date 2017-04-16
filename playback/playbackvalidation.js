define(['playbackManager', 'itemHelper'], function (playbackManager, itemHelper) {
    "use strict";

    function getRequirePromise(deps) {

        return new Promise(function (resolve, reject) {

            require(deps, resolve);
        });
    }

    function validatePlayback(options) {
        return getRequirePromise(["registrationServices"]).then(function (registrationServices) {
            return registrationServices.validateFeature('playback', options).then(function (result) {

                if (result && result.enableTimeLimit) {
                    startAutoStopTimer();
                }
            });
        });
    }

    var autoStopTimeout;
    function startAutoStopTimer() {
        stopAutoStopTimer();
        autoStopTimeout = setTimeout(onAutoStopTimeout, 63000);
    }

    function onAutoStopTimeout() {
        stopAutoStopTimer();
        playbackManager.stop();
    }

    function stopAutoStopTimer() {

        var timeout = autoStopTimeout;
        if (timeout) {
            clearTimeout(timeout);
            autoStopTimeout = null;
        }
    }

    function PlaybackValidation() {

        this.name = 'Playback validation';
        this.type = 'preplayintercept';
        this.id = 'playbackvalidation';
        this.order = -1;
    }

    PlaybackValidation.prototype.intercept = function (options) {

        // Don't care about video backdrops, or theme music or any kind of non-fullscreen playback
        if (!options.fullscreen) {
            return Promise.resolve();
        }

        if (options.item && itemHelper.isLocalItem(options.item)) {
            return Promise.resolve();
        }

        return validatePlayback(options);
    };

    return PlaybackValidation;
});