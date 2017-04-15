define(['appStorage', 'events'], function (appStorage, events) {
    'use strict';

    function getKey(name, userId) {

        if (userId) {
            name = userId + '-' + name;
        }

        return name;
    }

    function AppSettings() {

    }

    AppSettings.prototype.enableAutoLogin = function (val) {

        if (val != null) {
            this.set('enableAutoLogin', val.toString());
        }

        return this.get('enableAutoLogin') !== 'false';
    };

    AppSettings.prototype.enableAutomaticBitrateDetection = function (val) {

        if (val != null) {
            this.set('enableAutomaticBitrateDetection', val.toString());
        }

        return this.get('enableAutomaticBitrateDetection') !== 'false';
    };

    AppSettings.prototype.maxStreamingBitrate = function (val) {

        if (val != null) {
            this.set('preferredVideoBitrate', val);
        }

        return parseInt(this.get('preferredVideoBitrate') || '0') || 1500000;
    };

    AppSettings.prototype.maxStaticMusicBitrate = function (val) {

        if (val !== undefined) {
            this.set('maxStaticMusicBitrate', val);
        }

        var defaultValue = 320000;
        return parseInt(this.get('maxStaticMusicBitrate') || defaultValue.toString()) || defaultValue;
    };

    AppSettings.prototype.maxChromecastBitrate = function (val) {

        if (val != null) {
            this.set('chromecastBitrate1', val);
        }

        val = this.get('chromecastBitrate1');

        return val ? parseInt(val) : null;
    };

    AppSettings.prototype.syncOnlyOnWifi = function (val) {

        if (val != null) {
            this.set('syncOnlyOnWifi', val.toString());
        }

        return this.get('syncOnlyOnWifi') !== 'false';
    };

    AppSettings.prototype.syncPath = function (val) {

        if (val != null) {
            this.set('syncPath', val);
        }

        return this.get('syncPath');
    };

    AppSettings.prototype.cameraUploadServers = function (val) {

        if (val != null) {
            this.set('cameraUploadServers', val.join(','));
        }

        val = this.get('cameraUploadServers');

        if (val) {
            return val.split(',');
        }

        return [];
    };

    AppSettings.prototype.set = function (name, value, userId) {

        var currentValue = this.get(name, userId);

        appStorage.setItem(getKey(name, userId), value);

        if (currentValue !== value) {
            events.trigger(this, 'change', [name]);
        }
    };

    AppSettings.prototype.get = function (name, userId) {

        return appStorage.getItem(getKey(name, userId));
    };

    return new AppSettings();
});