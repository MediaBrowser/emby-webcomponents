define(['appSettings', 'events', 'browser', 'loading', 'playbackManager', 'appRouter', 'globalize', 'apphost'], function (appSettings, events, browser, loading, playbackManager, appRouter, globalize, appHost) {
    'use strict';

    var currentItem;

    function mirrorIfEnabled(item) {

        if (item) {
            currentItem = item;
        } else {
            item = currentItem;
        }

        if (item) {

            if (item.IsFolder && item.Type !== 'Series' && item.Type !== 'MusicAlbum' && item.Type !== 'MusicArtist') {
                return;
            }

            var currentPlayer = playbackManager.getCurrentPlayer();

            if (currentPlayer && !currentPlayer.isLocalPlayer) {

                playbackManager.displayContent({

                    ItemName: item.Name,
                    ItemId: item.Id,
                    ItemType: item.Type

                }, currentPlayer);
            }
        }
    }

    function emptyCallback() {
        // avoid console logs about uncaught promises
    }

    function getTargetSecondaryText(target) {

        if (target.user) {

            return target.user.Name;
        }

        return null;
    }

    function getIcon(target) {

        var deviceType = target.deviceType;

        if (!deviceType && target.isLocalPlayer) {
            if (browser.tv) {
                deviceType = 'tv';
            } else if (browser.mobile) {
                deviceType = 'smartphone';
            } else {
                deviceType = 'desktop';
            }
        }

        if (!deviceType) {
            deviceType = 'tv';
        }

        switch (deviceType) {

            case 'smartphone':
                return '&#xE32C;';
            case 'tablet':
                return '&#xE32F;';
            case 'tv':
                return '&#xE333;';
            case 'cast':
                return '&#xE307;';
            case 'desktop':
                return '&#xE30A;';
            default:
                return '&#xE333;';
        }
    }

    function showPlayerSelection(button) {

        var currentPlayerInfo = playbackManager.getPlayerInfo();

        if (currentPlayerInfo) {
            if (!currentPlayerInfo.isLocalPlayer) {
                showActivePlayerMenu(currentPlayerInfo);
                return;
            }
        }

        var currentPlayerId = currentPlayerInfo ? currentPlayerInfo.id : null;

        loading.show();

        playbackManager.getTargets().then(function (targets) {

            var menuItems = targets.map(function (t) {

                var name = t.name;

                if (t.appName && t.appName !== t.name) {
                    name += " - " + t.appName;
                }

                return {
                    name: name,
                    id: t.id,
                    selected: currentPlayerId === t.id,
                    secondaryText: getTargetSecondaryText(t),
                    icon: getIcon(t)
                };

            });

            require(['actionsheet'], function (actionsheet) {

                loading.hide();

                var menuOptions = {
                    title: globalize.translate('HeaderPlayOn'),
                    items: menuItems,
                    positionTo: button,

                    resolveOnClick: true
                };

                // Unfortunately we can't allow the url to change or chromecast will throw a security error
                // Might be able to solve this in the future by moving the dialogs to hashbangs
                if (!(!browser.chrome || appHost.supports('castmenuhashchange'))) {
                    menuOptions.enableHistory = false;
                }

                actionsheet.show(menuOptions).then(function (id) {

                    var target = targets.filter(function (t) {
                        return t.id === id;
                    })[0];

                    playbackManager.trySetActivePlayer(target.playerName, target);

                    mirrorIfEnabled();

                }, emptyCallback);
            });
        });
    }

    function showActivePlayerMenu(playerInfo) {

        require(['dialog'], function (dialog) {
            showActivePlayerMenuInternal(dialog, playerInfo);
        });
    }


    function disconnectFromPlayer(currentDeviceName) {

        if (playbackManager.getSupportedCommands().indexOf('EndSession') !== -1) {

            require(['dialog'], function (dialog) {

                var menuItems = [];

                menuItems.push({
                    name: globalize.translate('Yes'),
                    id: 'yes'
                });
                menuItems.push({
                    name: globalize.translate('No'),
                    id: 'no'
                });

                dialog({
                    buttons: menuItems,
                    //positionTo: positionTo,
                    text: globalize.translate('ConfirmEndPlayerSession', currentDeviceName)

                }).then(function (id) {
                    switch (id) {

                        case 'yes':
                            playbackManager.getCurrentPlayer().endSession();
                            playbackManager.setDefaultPlayerActive();
                            break;
                        case 'no':
                            playbackManager.setDefaultPlayerActive();
                            break;
                        default:
                            break;
                    }
                }, emptyCallback);

            });


        } else {

            playbackManager.setDefaultPlayerActive();
        }
    }

    function showActivePlayerMenuInternal(dialog, playerInfo) {

        var items = [];

        var currentDeviceName = (playerInfo.deviceName || playerInfo.name);

        var options = {
            title: currentDeviceName
        };

        items.push({
            name: globalize.translate('HeaderRemoteControl'),
            id: 'remote'
        });

        items.push({
            name: globalize.translate('Disconnect'),
            id: 'disconnect'
        });

        items.push({
            name: globalize.translate('Cancel'),
            id: 'cancel',
            type: 'cancel'
        });

        options.buttons = items;

        return dialog(options).then(function (result) {

            if (result === 'remote') {
                return appRouter.showNowPlaying();
            }
            else if (result === 'disconnect') {
                disconnectFromPlayer(currentDeviceName);
            }

            return Promise.resolve();

        }, emptyCallback);
    }

    document.addEventListener('viewshow', function (e) {

        var state = e.detail.state || {};
        var item = state.item;

        if (item && item.ServerId) {
            mirrorIfEnabled(item);
            return;
        }
    });

    events.on(playbackManager, 'pairing', function (e) {
        loading.show();
    });

    events.on(playbackManager, 'paired', function (e) {
        loading.hide();
    });

    events.on(playbackManager, 'pairerror', function (e) {
        loading.hide();
    });

    return {
        show: showPlayerSelection
    };
});