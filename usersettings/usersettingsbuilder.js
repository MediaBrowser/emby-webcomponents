define(['appSettings', 'events', 'browser'], function (appsettings, events, browser) {
    'use strict';

    function UserSettings() {

        var self = this;
        var currentUserId;
        var currentApiClient;
        var displayPrefs;
        var saveTimeout;

        self.setUserInfo = function (userId, apiClient) {

            if (saveTimeout) {
                clearTimeout(saveTimeout);
            }

            currentUserId = userId;
            currentApiClient = apiClient;

            if (!userId) {
                displayPrefs = null;
                return Promise.resolve();
            }

            return apiClient.getDisplayPreferences('usersettings', userId, 'emby').then(function (result) {
                result.CustomPrefs = result.CustomPrefs || {};
                displayPrefs = result;
            });
        };

        function onSaveTimeout() {
            saveTimeout = null;
            currentApiClient.updateDisplayPreferences('usersettings', displayPrefs, currentUserId, 'emby');
        }
        function saveServerPreferences() {
            if (saveTimeout) {
                clearTimeout(saveTimeout);
            }
            saveTimeout = setTimeout(onSaveTimeout, 50);
        }

        self.getData = function () {
            return displayPrefs;
        };

        self.importFrom = function (instance) {
            displayPrefs = instance.getData();
        };

        self.set = function (name, value, enableOnServer) {

            var userId = currentUserId;
            if (!userId) {
                throw new Error('userId cannot be null');
            }

            var currentValue = self.get(name);
            appsettings.set(name, value, userId);

            if (enableOnServer !== false && displayPrefs) {
                displayPrefs.CustomPrefs[name] = value == null ? value : value.toString();
                saveServerPreferences();
            }

            if (currentValue !== value) {
                events.trigger(self, 'change', [name]);
            }
        };

        self.get = function (name, enableOnServer) {
            var userId = currentUserId;
            if (!userId) {
                // TODO: I'd like to continue to throw this exception but it causes issues with offline use
                // Revisit in the future and restore it
                return null;
                //throw new Error('userId cannot be null');
            }

            if (enableOnServer !== false) {
                if (displayPrefs) {
                    return displayPrefs.CustomPrefs[name];
                }
            }

            return appsettings.get(name, userId);
        };

        self.serverConfig = function (config) {

            var apiClient = currentApiClient;

            if (config) {

                return apiClient.updateUserConfiguration(currentUserId, config);

            } else {

                return apiClient.getUser(currentUserId).then(function (user) {

                    return user.Configuration;
                });
            }
        };

        self.loadQuerySettings = function () {

        };
    }

    UserSettings.prototype.enableCinemaMode = function (val) {

        if (val != null) {
            this.set('enableCinemaMode', val.toString(), false);
        }

        val = this.get('enableCinemaMode', false);

        if (val) {
            return val !== 'false';
        }

        return true;
    };

    UserSettings.prototype.enableThemeSongs = function (val) {

        if (val != null) {
            this.set('enableThemeSongs', val.toString(), false);
        }

        val = this.get('enableThemeSongs', false);

        return val !== 'false';
    };

    UserSettings.prototype.enableThemeVideos = function (val) {

        if (val != null) {
            this.set('enableThemeVideos', val.toString(), false);
        }

        val = this.get('enableThemeVideos', false);

        if (val) {
            return val !== 'false';
        }

        return !browser.slow;
    };

    UserSettings.prototype.language = function (val) {

        if (val != null) {
            this.set('language', val.toString(), false);
        }

        return this.get('language', false);
    };

    UserSettings.prototype.skipBackLength = function (val) {

        if (val != null) {
            this.set('skipBackLength', val.toString());
        }

        return parseInt(this.get('skipBackLength') || '15000');
    };

    UserSettings.prototype.skipForwardLength = function (val) {

        if (val != null) {
            this.set('skipForwardLength', val.toString());
        }

        return parseInt(this.get('skipForwardLength') || '15000');
    };

    function getSavedQueryKey(context) {

        return 'query-' + context;
    }

    UserSettings.prototype.loadQuerySettings = function (query, context) {

        var key = getSavedQueryKey(context);
        var values = this.get(key);

        if (values) {

            values = JSON.parse(values);

            return Object.assign(query, values);
        }
    };

    UserSettings.prototype.saveQuerySettings = function (query, context) {

        var key = getSavedQueryKey(context);
        var values = {};

        if (query.SortBy) {
            values.SortBy = query.SortBy;
        }
        if (query.SortOrder) {
            values.SortOrder = query.SortOrder;
        }

        this.set(key, JSON.stringify(values));
    };

    return UserSettings;
});