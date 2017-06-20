define(['itemHelper', 'globalize', 'apphost', 'connectionManager', 'events', 'emby-button'], function (itemHelper, globalize, appHost, connectionManager, events) {
    'use strict';

    function updateSyncStatus(container, item) {

        var btnSyncToggle = container.querySelector('.btnSyncToggle');

        if (btnSyncToggle) {

            if (item.SyncPercent != null) {
                btnSyncToggle.classList.add('sync-on');
                btnSyncToggle.querySelector('i').innerHTML = '#4285F4';
            } else {
                btnSyncToggle.classList.remove('sync-on');
                btnSyncToggle.querySelector('i').style.color = 'inherit';
            }
        }
    }

    function syncToggle(options) {

        var self = this;

        options = options || {};
        self.options = options;

        function resetSyncStatus() {
            updateSyncStatus(options.container, options.item);
        }

        function onSyncLocalClick() {

            if (!this.classList.contains('sync-on')) {
                require(['syncDialog'], function (syncDialog) {
                    syncDialog.showMenu({
                        items: [options.item],
                        isLocalSync: true,
                        serverId: options.item.ServerId

                    }).then(function () {
                        events.trigger(self, 'sync');
                    }, resetSyncStatus);
                });
            } else {

                require(['confirm'], function (confirm) {

                    confirm({

                        text: globalize.translate('sharedcomponents#ConfirmRemoveDownload'),
                        confirmText: globalize.translate('sharedcomponents#RemoveDownload'),
                        cancelText: globalize.translate('sharedcomponents#KeepDownload'),
                        primary: 'cancel'

                    }).then(function () {
                        connectionManager.getApiClient(options.item.ServerId).cancelSyncItems([options.item.Id]);
                    }, resetSyncStatus);
                });
            }
        }

        var container = options.container;
        var user = options.user;
        var item = options.item;

        var html = '';
        html += '<button type="button" is="emby-button" class="button-flat btnSyncToggle" style="margin:0;padding:.25em .5em;"><i class="md-icon">&#xE2C4;</i>';
        html += '<div style="margin: 0 0 0 .5em;font-weight:normal;">' + globalize.translate('sharedcomponents#Download') + '</div>';
        html += '</button>';

        if (itemHelper.canSync(user, item)) {
            if (appHost.supports('sync')) {
                container.classList.remove('hide');
            } else {
                container.classList.add('hide');
            }

            container.innerHTML = html;

            container.querySelector('.btnSyncToggle').addEventListener('click', onSyncLocalClick);
            updateSyncStatus(container, item);

        } else {
            container.classList.add('hide');
        }
    }

    syncToggle.prototype.refresh = function (item) {

        this.options.item = item;
        updateSyncStatus(this.options.container, item);
    };

    syncToggle.prototype.destroy = function () {

        var options = this.options;

        if (options) {
            options.container.innerHTML = '';
            this.options = null;
        }
    };

    return syncToggle;
});