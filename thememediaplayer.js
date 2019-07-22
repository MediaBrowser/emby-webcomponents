define(['playbackManager', 'userSettings', 'connectionManager'], function (playbackManager, userSettings, connectionManager) {
    'use strict';

    var currentOwnerId;
    var currentThemeIds = [];

    function playThemeMedia(items, ownerId) {

        var currentThemeItems = items.filter(function (i) {
            return enabled(i.MediaType);
        });

        if (currentThemeItems.length) {

            // Stop if a theme song from another ownerId
            // Leave it alone if anything else (e.g user playing a movie)
            if (!currentOwnerId && playbackManager.isPlaying()) {
                return;
            }

            currentThemeIds = currentThemeItems.map(function (i) {
                return i.Id;
            });

            playbackManager.play({
                items: currentThemeItems,
                fullscreen: false,
                enableRemotePlayers: false
            }).then(function () {
                currentOwnerId = ownerId;
            });

        } else {
            stopIfPlaying();
        }
    }

    function stopIfPlaying() {
        if (currentOwnerId) {
            playbackManager.stop();
        }

        currentOwnerId = null;
    }

    function enabled(mediaType) {

        if (mediaType === 'Video') {
            return userSettings.enableThemeVideos();
        }

        return userSettings.enableThemeSongs();
    }

    var excludeTypes = ['CollectionFolder', 'UserView', 'Program', 'SeriesTimer', 'Person', 'TvChannel', 'Channel'];

    function loadThemeMedia(item) {

        if (item.CollectionType) {
            stopIfPlaying();
            return;
        }

        if (excludeTypes.indexOf(item.Type) !== -1) {
            stopIfPlaying();
            return;
        }

        var apiClient = connectionManager.getApiClient(item.ServerId);

        apiClient.getThemeMedia(item.Id, {

            UserId: apiClient.getCurrentUserId(),
            InheritFromParent: true,
            EnableThemeSongs: userSettings.enableThemeSongs(),
            EnableThemeVideos: userSettings.enableThemeVideos()

        }).then(function (themeMediaResult) {

            var ownerId = themeMediaResult.ThemeVideosResult.Items.length ? themeMediaResult.ThemeVideosResult.OwnerId : themeMediaResult.ThemeSongsResult.OwnerId;

            if (ownerId !== currentOwnerId) {

                var items = themeMediaResult.ThemeVideosResult.Items.length ? themeMediaResult.ThemeVideosResult.Items : themeMediaResult.ThemeSongsResult.Items;

                playThemeMedia(items, ownerId);
            }
        });
    }

    document.addEventListener('viewshow', function (e) {

        var state = e.detail.state || {};
        var item = state.item;

        if (item && item.ServerId) {

            var itemType = item.Type;

            if (itemType !== 'User' && itemType !== 'Plugin' && itemType !== 'Device') {
                loadThemeMedia(item);
                return;
            }
        }

        if (e.detail.supportsThemeMedia) {
            // Do nothing here, allow it to keep playing
        }
        else {
            playThemeMedia([], null);
        }

    }, true);

    //Events.on(playbackManager, 'playbackstart', function (e, player) {
    //    var item = playbackManager.currentItem(player);
    //    // User played something manually
    //    if (currentThemeIds.indexOf(item.Id) == -1) {
    //        currentOwnerId = null;
    //    }
    //});

});