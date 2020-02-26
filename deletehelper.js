define(['connectionManager', 'confirm', 'appRouter', 'globalize'], function (connectionManager, confirm, appRouter, globalize) {
    'use strict';

    function alertText(options) {

        return new Promise(function (resolve, reject) {

            require(['alert'], function (alert) {
                alert(options).then(resolve, resolve);
            });
        });
    }

    function onItemDeleted(options, serverId, parentId) {
        if (options.navigate === 'back') {
            appRouter.back();
        }
        else if (options.navigate) {
            if (parentId) {
                appRouter.showItem(parentId, serverId);
            } else {
                appRouter.goHome();
            }
        }
    }

    function uninstallPlugin(item, apiClient, options) {

        return require(['confirm']).then(function (responses) {

            var confirm = responses[0];

            return confirm({

                text: globalize.translate('UninstallPluginConfirmation'),
                title: globalize.translate('HeaderUninstallPlugin'),
                confirmText: globalize.translate('Uninstall'),
                primary: 'cancel'

            }).then(function () {

                return apiClient.uninstallPlugin(item.Id).then(function () {

                    return onItemDeleted(options);
                });
            });

        });
    }

    function deleteUser(item, apiClient, options) {

        return require(['confirm']).then(function (responses) {

            var confirm = responses[0];

            return confirm({

                text: globalize.translate('DeleteUserConfirmation', item.Name),
                title: globalize.translate('HeaderDeleteUser'),
                confirmText: globalize.translate('Delete'),
                primary: 'cancel'

            }).then(function () {

                return apiClient.deleteUser(item.Id).then(function () {

                    return onItemDeleted(options);
                });
            });

        });
    }

    function deleteDevice(item, apiClient, options) {

        return require(['confirm']).then(function (responses) {

            var confirm = responses[0];

            return confirm({

                text: globalize.translate('DeleteDeviceConfirmation'),
                title: globalize.translate('HeaderDeleteDevice'),
                confirmText: globalize.translate('Delete'),
                primary: 'cancel'

            }).then(function () {

                return apiClient.ajax({
                    type: "DELETE",
                    url: apiClient.getUrl('Devices', {
                        Id: item.Id
                    })

                }).then(function () {

                    return onItemDeleted(options);
                });
            });

        });
    }

    function deleteServer(item, apiClient, options) {

        return require(['confirm']).then(function (responses) {

            var confirm = responses[0];

            return confirm({

                text: globalize.translate('DeleteServerConfirmation', item.Name),
                title: globalize.translate('HeaderDeleteServer'),
                confirmText: globalize.translate('Delete'),
                primary: 'cancel'

            }).then(function () {

                return connectionManager.deleteServer(item.Id).then(function () {

                    return onItemDeleted(options);
                });
            });

        });
    }

    function deleteItem(options) {

        var item = options.item;
        var apiClient = connectionManager.getApiClient(item);

        if (item.Type === 'Device') {
            return deleteDevice(item, apiClient, options);
        }

        if (item.Type === 'Server') {
            return deleteServer(item, apiClient, options);
        }

        if (item.Type === 'User') {
            return deleteUser(item, apiClient, options);
        }

        if (item.Type === 'Plugin') {
            return uninstallPlugin(item, apiClient, options);
        }

        var itemId = item.Id;
        var parentId = item.SeasonId || item.SeriesId || item.ParentId;
        var serverId = item.ServerId;

        var msg = globalize.translate('ConfirmDeleteItem');
        var title = globalize.translate('HeaderDeleteItem');

        return apiClient.getDeleteInfo(itemId).then(function (deleteInfo) {

            if (deleteInfo.Paths.length) {

                msg += '\n\n' + globalize.translate('FollowingFilesWillBeDeleted') + '\n' + deleteInfo.Paths.join('\n');
            }

            msg += '\n\n' + globalize.translate('AreYouSureToContinue');

            return confirm({

                title: title,
                text: msg,
                confirmText: globalize.translate('Delete'),
                primary: 'cancel'

            }).then(function () {

                return apiClient.deleteItem(itemId).then(function () {

                    return onItemDeleted(options, serverId, parentId);

                }, function (err) {

                    var result = function () {
                        return Promise.reject(err);
                    };

                    return alertText(globalize.translate('ErrorDeletingItem')).then(result, result);
                });
            });
        });
    }

    return {
        deleteItem: deleteItem
    };
});