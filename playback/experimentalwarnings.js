define(['connectionManager', 'globalize', 'userSettings', 'apphost'], function (connectionManager, globalize, userSettings, appHost) {
    "use strict";

    function getRequirePromise(deps) {

        return new Promise(function (resolve, reject) {

            require(deps, resolve);
        });
    }

    function showMessage(text, userSettingsKey, appHostFeature) {

        if (appHost.supports(appHostFeature)) {
            return Promise.resolve();
        }

        var now = +new Date();

        userSettingsKey += now.getFullYear() + '-' + now.getMonth();

        if (userSettings.get(userSettingsKey, false) === '1') {
            return Promise.resolve();
        }

        return new Promise(function (resolve, reject) {

            userSettings.set(userSettingsKey, '1', false);

            require(['alert'], function (alert) {

                return alert(text).then(resolve, resolve);
            });
        });
    }

    function showBlurayMessage() {

        var message =
            'Playback of Bluray folders in this app is experimental. Some titles may not work at all. For a better experience, consider converting to mkv video files, or use an Emby app with native Bluray folder support.';
        return showMessage(message, 'blurayexpirementalinfo', 'nativeblurayplayback');
    }

    function showDvdMessage() {

        var message =
            'Playback of Dvd folders in this app is experimental. Some titles may not work at all. For a better experience, consider converting to mkv video files, or use an Emby app with native Dvd folder support.';
        return showMessage(message, 'dvdexpirementalinfo', 'nativedvdplayback');
    }

    function showIsoMessage() {

        var message =
            'Playback of ISO files in this app is experimental. Some titles may not work at all. For a better experience, consider converting to mkv video files, or use an Emby app with native ISO support.';
        return showMessage(message, 'isoexpirementalinfo', 'nativeisoplayback');
    }

    function ExpirementalPlaybackWarnings() {

        this.name = 'Experimental playback warnings';
        this.type = 'preplayintercept';
        this.id = 'expirementalplaybackwarnings';
    }

    ExpirementalPlaybackWarnings.prototype.intercept = function (options) {

        var item = options.item;
        if (!item) {
            return Promise.resolve();
        }

        if (item.VideoType === 'Iso') {
            return showIsoMessage();
        }

        if (item.VideoType === 'BluRay') {
            return showBlurayMessage();
        }

        if (item.VideoType === 'Dvd') {
            return showDvdMessage();
        }

        return Promise.resolve();
    };

    return ExpirementalPlaybackWarnings;
});