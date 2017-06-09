define(['actionsheet', 'datetime', 'playbackManager', 'globalize', 'appSettings', 'qualityoptions'], function (actionsheet, datetime, playbackManager, globalize, appSettings, qualityoptions) {
    'use strict';

    function showQualityMenu(player, btn) {

        var videoStream = playbackManager.currentMediaSource(player).MediaStreams.filter(function (stream) {
            return stream.Type === "Video";
        })[0];
        var videoWidth = videoStream ? videoStream.Width : null;

        var options = qualityoptions.getVideoQualityOptions({
            currentMaxBitrate: playbackManager.getMaxStreamingBitrate(player),
            isAutomaticBitrateEnabled: playbackManager.enableAutomaticBitrateDetection(player),
            videoWidth: videoWidth,
            enableAuto: true
        });

        var menuItems = options.map(function (o) {

            var opt = {
                name: o.name,
                id: o.bitrate,
                secondaryText: o.secondaryText
            };

            if (o.selected) {
                opt.selected = true;
            }

            return opt;
        });

        var selectedId = options.filter(function (o) {
            return o.selected;
        });

        selectedId = selectedId.length ? selectedId[0].bitrate : null;

        return actionsheet.show({
            items: menuItems,
            positionTo: btn

        }).then(function (id) {
            var bitrate = parseInt(id);
            if (bitrate !== selectedId) {

                playbackManager.setMaxStreamingBitrate({

                    enableAutomaticBitrateDetection: bitrate ? false : true,
                    maxBitrate: bitrate

                }, player);
            }
        });
    }

    function showRepeatModeMenu(player, btn) {

        var menuItems = [];

        menuItems.push({
            name: globalize.translate('sharedcomponents#RepeatOne'),
            id: 'RepeatOne'
        });

        menuItems.push({
            name: globalize.translate('sharedcomponents#RepeatAll'),
            id: 'RepeatAll'
        });
        menuItems.push({
            name: globalize.translate('sharedcomponents#None'),
            id: 'RepeatNone'
        });

        return actionsheet.show({
            items: menuItems,
            positionTo: btn

        }).then(function (mode) {

            if (mode) {
                playbackManager.setRepeatMode(mode, player);
            }
        });
    }

    function getQualitySecondaryText(player) {

        return playbackManager.getPlayerState(player).then(function (state) {
            var isAutoEnabled = playbackManager.enableAutomaticBitrateDetection(player);
            var currentMaxBitrate = playbackManager.getMaxStreamingBitrate(player);

            var videoStream = playbackManager.currentMediaSource(player).MediaStreams.filter(function (stream) {
                return stream.Type === "Video";
            })[0];
            var videoWidth = videoStream ? videoStream.Width : null;

            var options = qualityoptions.getVideoQualityOptions({
                currentMaxBitrate: playbackManager.getMaxStreamingBitrate(player),
                isAutomaticBitrateEnabled: playbackManager.enableAutomaticBitrateDetection(player),
                videoWidth: videoWidth,
                enableAuto: true
            });

            var menuItems = options.map(function (o) {

                var opt = {
                    name: o.name,
                    id: o.bitrate,
                    secondaryText: o.secondaryText
                };

                if (o.selected) {
                    opt.selected = true;
                }

                return opt;
            });

            var selectedOption = options.filter(function (o) {
                return o.selected;
            });

            if (!selectedOption.length) {
                return null;
            }

            selectedOption = selectedOption[0];

            var text = selectedOption.name;

            if (selectedOption.autoText) {
                if (state.PlayState && state.PlayState.PlayMethod !== 'Transcode') {
                    text += ' - Direct';
                } else {
                    text += ' ' + selectedOption.autoText;
                }
            }

            return text;
        });
    }

    function showAspectRatioMenu(player, btn) {

        // Each has name/id
        var currentId = playbackManager.getAspectRatio(player);
        var menuItems = playbackManager.getSupportedAspectRatios(player).map(function (i) {
            return {
                id: i.id,
                name: i.name,
                selected: i.id === currentId
            };
        });

        return actionsheet.show({

            items: menuItems,
            positionTo: btn

        }).then(function (id) {

            if (id) {
                playbackManager.setAspectRatio(id, player);
                return Promise.resolve();
            }

            return Promise.reject();
        });
    }

    function show(options) {

        var player = options.player;

        var supportedCommands = playbackManager.getSupportedCommands(player);

        return getQualitySecondaryText(player).then(function (secondaryQualityText) {
            var mediaType = options.mediaType;

            var menuItems = [];

            if (supportedCommands.indexOf('SetAspectRatio') !== -1) {

                var currentAspectRatioId = playbackManager.getAspectRatio(player);
                var currentAspectRatio = playbackManager.getSupportedAspectRatios(player).filter(function (i) {
                    return i.id === currentAspectRatioId;
                })[0];

                menuItems.push({
                    name: globalize.translate('sharedcomponents#AspectRatio'),
                    id: 'aspectratio',
                    secondaryText: currentAspectRatio ? currentAspectRatio.name : null
                });
            }

            menuItems.push({
                name: globalize.translate('sharedcomponents#Quality'),
                id: 'quality',
                secondaryText: secondaryQualityText
            });

            var repeatMode = playbackManager.getRepeatMode(player);

            if (supportedCommands.indexOf('SetRepeatMode') !== -1) {

                menuItems.push({
                    name: globalize.translate('sharedcomponents#RepeatMode'),
                    id: 'repeatmode',
                    secondaryText: repeatMode === 'RepeatNone' ? globalize.translate('sharedcomponents#None') : globalize.translate('sharedcomponents#' + repeatMode)
                });
            }

            //menuItems.push({
            //    name: globalize.translate('sharedcomponents#Settings'),
            //    id: 'settings'
            //});

            return actionsheet.show({

                items: menuItems,
                positionTo: options.positionTo

            }).then(function (id) {

                switch (id) {

                    case 'quality':
                        return showQualityMenu(player, options.positionTo);
                    case 'aspectratio':
                        return showAspectRatioMenu(player, options.positionTo);
                    case 'repeatmode':
                        return showRepeatModeMenu(player, options.positionTo);
                    default:
                        break;
                }

                return Promise.reject();
            });
        });
    }

    return {
        show: show
    };
});