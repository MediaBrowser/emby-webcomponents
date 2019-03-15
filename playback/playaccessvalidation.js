define(['connectionManager', 'globalize'], function (connectionManager, globalize) {
    "use strict";

    function showErrorMessage() {
        return require(['alert']).then(function (deps) {

            var alert = deps[0];

            return alert(globalize.translate('MessagePlayAccessRestricted')).then(function () {
                return Promise.reject();
            });
        });
    }

    function PlayAccessValidation() {

        this.name = 'Playback validation';
        this.type = 'preplayintercept';
        this.id = 'playaccessvalidation';
        this.order = -2;
    }

    PlayAccessValidation.prototype.intercept = function (options) {

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
    };

    return PlayAccessValidation;
});