define(['connectionManager', 'serverNotifications', 'events', 'globalize', 'emby-button'], function (connectionManager, serverNotifications, events, globalize, EmbyButtonPrototype) {
    'use strict';

    function onClick(e) {

        var button = this;
        var id = button.getAttribute('data-id');
        var serverId = button.getAttribute('data-serverid');
        var apiClient = connectionManager.getApiClient(serverId);

        if (!button.classList.contains('downloadbutton-on')) {

            require(['syncDialog'], function (syncDialog) {
                syncDialog.showMenu({

                    items: [id],
                    isLocalSync: true,
                    serverId: serverId

                }).then(function () {

                    button.dispatchEvent(new CustomEvent('download', {
                        cancelable: false
                    }));

                });
            });

        } else {

            require(['confirm'], function (confirm) {

                confirm({

                    text: globalize.translate('sharedcomponents#ConfirmRemoveDownload'),
                    confirmText: globalize.translate('sharedcomponents#RemoveDownload'),
                    cancelText: globalize.translate('sharedcomponents#KeepDownload'),
                    primary: 'cancel'

                }).then(function () {
                    apiClient.cancelSyncItems([id]);

                    button.dispatchEvent(new CustomEvent('download-cancel', {
                        cancelable: false
                    }));
                });
            });
        }
    }

    function updateSyncStatus(button, syncPercent) {

        if (syncPercent != null) {
            button.classList.add('downloadbutton-on');
        } else {
            button.classList.remove('downloadbutton-on');
        }

        if ((syncPercent || 0) >= 100) {
            button.classList.add('downloadbutton-complete');
        } else {
            button.classList.remove('downloadbutton-complete');
        }

        var text;
        if ((syncPercent || 0) >= 100) {
            text = globalize.translate('sharedcomponents#Downloaded');
        } else if (syncPercent != null) {
            text = globalize.translate('sharedcomponents#Downloading');
        } else {
            text = globalize.translate('sharedcomponents#Download');
        }

        var textElement = button.querySelector('.emby-downloadbutton-downloadtext');
        if (textElement) {
            textElement.innerHTML = text;
        }

        button.title = text;
    }

    function clearEvents(button) {

        button.removeEventListener('click', onClick);
    }

    function bindEvents(button) {

        clearEvents(button);

        button.addEventListener('click', onClick);
    }

    var EmbyDownloadButtonPrototype = Object.create(EmbyButtonPrototype);

    EmbyDownloadButtonPrototype.createdCallback = function () {

        // base method
        if (EmbyButtonPrototype.createdCallback) {
            EmbyButtonPrototype.createdCallback.call(this);
        }
    };

    EmbyDownloadButtonPrototype.attachedCallback = function () {

        // base method
        if (EmbyButtonPrototype.attachedCallback) {
            EmbyButtonPrototype.attachedCallback.call(this);
        }

        var itemId = this.getAttribute('data-id');
        var serverId = this.getAttribute('data-serverid');
        if (itemId && serverId) {

            bindEvents(this);
        }
    };

    EmbyDownloadButtonPrototype.detachedCallback = function () {

        // base method
        if (EmbyButtonPrototype.detachedCallback) {
            EmbyButtonPrototype.detachedCallback.call(this);
        }

        clearEvents(this);
    };

    EmbyDownloadButtonPrototype.setItem = function (item) {

        if (item) {

            this.setAttribute('data-id', item.Id);
            this.setAttribute('data-serverid', item.ServerId);

            updateSyncStatus(this, item.SyncPercent);
            bindEvents(this);

        } else {

            this.removeAttribute('data-id');
            this.removeAttribute('data-serverid');
            clearEvents(this);
        }
    };

    document.registerElement('emby-downloadbutton', {
        prototype: EmbyDownloadButtonPrototype,
        extends: 'button'
    });
});