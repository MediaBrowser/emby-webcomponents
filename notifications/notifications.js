define(['serverNotifications', 'playbackManager', 'events', 'globalize', 'require'], function (serverNotifications, playbackManager, events, globalize, require) {
    'use strict';

    function onOneDocumentClick() {

        document.removeEventListener('click', onOneDocumentClick);
        document.removeEventListener('keydown', onOneDocumentClick);

        if (window.Notification) {
            Notification.requestPermission();
        }
    }
    document.addEventListener('click', onOneDocumentClick);
    document.addEventListener('keydown', onOneDocumentClick);

    var serviceWorkerRegistration;

    function closeAfter(notification, timeoutMs) {

        setTimeout(function () {

            if (notification.close) {
                notification.close();
            }
            else if (notification.cancel) {
                notification.cancel();
            }
        }, timeoutMs);
    }

    function resetRegistration() {

        var serviceWorker = navigator.serviceWorker;

        if (serviceWorker) {
            serviceWorker.ready.then(function (registration) {
                serviceWorkerRegistration = registration;
            });
        }
    }

    resetRegistration();

    function showPersistentNotification(title, options, timeoutMs) {
        serviceWorkerRegistration.showNotification(title, options);
    }

    function showNonPersistentNotification(title, options, timeoutMs) {

        try {
            var notif = new Notification(title, options);

            if (notif.show) {
                notif.show();
            }

            if (timeoutMs) {
                closeAfter(notif, timeoutMs);
            }
        } catch (err) {
            if (options.actions) {
                options.actions = [];
                showNonPersistentNotification(title, options, timeoutMs);
            } else {
                throw err;
            }
        }
    }

    function showNotification(options, timeoutMs, apiClient) {

        var title = options.title;

        options.data = options.data || {};
        options.data.serverId = apiClient.serverInfo().Id;
        options.icon = options.icon || getIconUrl();
        options.badge = options.badge || getIconUrl('badge.png');

        resetRegistration();

        if (serviceWorkerRegistration) {
            showPersistentNotification(title, options, timeoutMs);
            return;
        }

        showNonPersistentNotification(title, options, timeoutMs);
    }

    function showNewItemNotification(item, apiClient) {

        if (playbackManager.isPlayingLocally(['Video'])) {
            return;
        }

        var body = item.Name;

        if (item.SeriesName) {
            body = item.SeriesName + ' - ' + body;
        }

        var notification = {
            title: "New " + item.Type,
            body: body,
            vibrate: true,
            tag: "newItem" + item.Id,
            data: {
                //options: {
                //    url: LibraryBrowser.getHref(item)
                //}
            }
        };

        var imageTags = item.ImageTags || {};

        if (imageTags.Primary) {

            notification.icon = apiClient.getScaledImageUrl(item.Id, {
                width: 80,
                tag: imageTags.Primary,
                type: "Primary"
            });
        }

        showNotification(notification, 15000, apiClient);
    }

    function onLibraryChanged(data, apiClient) {

        var newItems = data.ItemsAdded;

        if (!newItems.length) {
            return;
        }

        // Don't put a massive number of Id's onto the query string
        if (newItems.length > 12) {
            newItems.length = 12;
        }

        apiClient.getItems(apiClient.getCurrentUserId(), {

            Recursive: true,
            Limit: 3,
            Filters: "IsNotFolder",
            SortBy: "DateCreated",
            SortOrder: "Descending",
            Ids: newItems.join(','),
            MediaTypes: "Audio,Video",
            EnableTotalRecordCount: false

        }).then(function (result) {

            var items = result.Items;

            for (var i = 0, length = items.length ; i < length; i++) {

                showNewItemNotification(items[i], apiClient);
            }
        });
    }

    function getIconUrl(name) {

        name = name || 'notificationicon.png';

        return require.toUrl('.').split('?')[0] + '/' + name;
    }

    function showPackageInstallNotification(apiClient, installation, status) {

        apiClient.getCurrentUser().then(function (user) {

            if (!user.Policy.IsAdministrator) {
                return;
            }

            var notification = {
                tag: "install" + installation.Id,
                data: {}
            };

            if (status === 'completed') {
                notification.title = globalize.translate('PackageInstallCompleted').replace('{0}', installation.Name + ' ' + installation.Version);
                notification.vibrate = true;
            }
            else if (status === 'cancelled') {
                notification.title = globalize.translate('PackageInstallCancelled').replace('{0}', installation.Name + ' ' + installation.Version);
            }
            else if (status === 'failed') {
                notification.title = globalize.translate('PackageInstallFailed').replace('{0}', installation.Name + ' ' + installation.Version);
                notification.vibrate = true;
            }
            else if (status === 'progress') {
                notification.title = globalize.translate('InstallingPackage').replace('{0}', installation.Name + ' ' + installation.Version);

                notification.actions =
                [
                    {
                        action: 'cancel-install',
                        title: globalize.translate('Cancel'),
                        icon: getIconUrl()
                    }
                ];

                notification.data.id = installation.id;
            }

            if (status === 'progress') {

                var percentComplete = Math.round(installation.PercentComplete || 0);

                notification.body = percentComplete + '% complete.';
            }

            var timeout = status === 'cancelled' ? 5000 : 0;

            showNotification(notification, timeout, apiClient);
        });
    }

    events.on(serverNotifications, 'LibraryChanged', function (e, apiClient, data) {
        onLibraryChanged(data, apiClient);
    });

    events.on(serverNotifications, 'PackageInstallationCompleted', function (e, apiClient, data) {
        showPackageInstallNotification(apiClient, data, "completed");
    });

    events.on(serverNotifications, 'PackageInstallationFailed', function (e, apiClient, data) {
        showPackageInstallNotification(apiClient, data, "failed");
    });

    events.on(serverNotifications, 'PackageInstallationCancelled', function (e, apiClient, data) {
        showPackageInstallNotification(apiClient, data, "cancelled");
    });

    events.on(serverNotifications, 'PackageInstalling', function (e, apiClient, data) {
        showPackageInstallNotification(apiClient, data, "progress");
    });

    events.on(serverNotifications, 'ServerShuttingDown', function (e, apiClient, data) {
        var serverId = apiClient.serverInfo().Id;
        var notification = {
            tag: "restart" + serverId,
            title: globalize.translate('ServerNameIsShuttingDown', apiClient.serverInfo().Name)
        };
        showNotification(notification, 0, apiClient);
    });

    events.on(serverNotifications, 'ServerRestarting', function (e, apiClient, data) {
        var serverId = apiClient.serverInfo().Id;
        var notification = {
            tag: "restart" + serverId,
            title: globalize.translate('ServerNameIsRestarting', apiClient.serverInfo().Name)
        };
        showNotification(notification, 0, apiClient);
    });

    events.on(serverNotifications, 'RestartRequired', function (e, apiClient) {

        var serverId = apiClient.serverInfo().Id;
        var notification = {
            tag: "restart" + serverId,
            title: globalize.translate('PleaseRestartServerName', apiClient.serverInfo().Name)
        };

        notification.actions =
        [
            {
                action: 'restart',
                title: globalize.translate('RestartServer'),
                icon: getIconUrl()
            }
        ];

        showNotification(notification, 0, apiClient);
    });
});