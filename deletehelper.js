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

    function deleteUser(item, apiClient, options) {

        return require(['confirm']).then(function (responses) {

            var confirm = responses[0];

            confirm({

                text: globalize.translate('DeleteUserConfirmation'),
                title: globalize.translate('HeaderDeleteUser'),
                confirmText: globalize.translate('Delete'),
                primary: 'cancel'

            }).then(function () {

                ApiClient.deleteUser(item.Id).then(function () {

                    onItemDeleted(options);
                });
            });

        });
    }

    function deleteDevice(item, apiClient, options) {

        return require(['confirm']).then(function (responses) {

            var confirm = responses[0];

            confirm({

                text: globalize.translate('DeleteDeviceConfirmation'),
                title: globalize.translate('HeaderDeleteDevice'),
                confirmText: globalize.translate('Delete'),
                primary: 'cancel'

            }).then(function () {

                apiClient.ajax({
                    type: "DELETE",
                    url: apiClient.getUrl('Devices', {
                        Id: item.Id
                    })

                }).then(function () {

                    onItemDeleted(options);
                });
            });

        });
    }

    function deleteItem(options) {

        var item = options.item;
        var apiClient = connectionManager.getApiClient(item.ServerId);

        if (item.Type === 'Device') {
            return deleteDevice(item, apiClient, options);
        }

        if (item.Type === 'User') {
            return deleteUser(item, apiClient, options);
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

                    onItemDeleted(options, serverId, parentId);

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