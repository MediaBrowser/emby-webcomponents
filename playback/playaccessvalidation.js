define(['connectionManager', 'globalize'], function (connectionManager, globalize) {
    "use strict";

    return function () {

        var self = this;

        self.name = 'Playback validation';
        self.type = 'preplayintercept';
        self.id = 'playaccessvalidation';
        self.order = -2;

        self.intercept = function (options) {

            return validatePlayback(options);
        };

        function validatePlayback(options) {

            var item = options.item;
            if (!item) {
                return Promise.resolve();
            }
            var serverId = item.ServerId;
            if (!serverId) {
                return Promise.resolve();
            }

            return connectionManager.getApiClient(serverId).getCurrentUser().then(function (user) {

                if (user.Policy.EnableMediaPlayback) {
                    return Promise.resolve();
                }

                // reject but don't show an error message
                if (!options.fullscreen) {
                    return Promise.reject();
                }

                return showErrorMessage();
            });
        }

        function getRequirePromise(deps) {

            return new Promise(function (resolve, reject) {

                require(deps, resolve);
            });
        }

        function showErrorMessage() {
            return getRequirePromise(['alert']).then(function (alert) {

                return alert(globalize.translate('sharedcomponents#MessagePlayAccessRestricted')).then(function () {
                    return Promise.reject();
                });
            });
        }
    };
});