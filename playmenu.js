define(['actionsheet', 'datetime', 'playbackManager', 'globalize', 'appSettings'], function (actionsheet, datetime, playbackManager, globalize, appSettings) {
    'use strict';

    function show(options) {

        var item = options.item;

        var itemType = item.Type;
        var isFolder = item.IsFolder;
        var itemId = item.Id;
        var channelId = item.ChannelId;
        var serverId = item.ServerId;
        var resumePositionTicks = item.UserData ? item.UserData.PlaybackPositionTicks : null;

        var playableItemId = itemType === 'Program' ? channelId : itemId;

        if (!resumePositionTicks || isFolder) {
            playbackManager.play({
                ids: [playableItemId],
                serverId: serverId
            });
            return;
        }

        var menuItems = [];

        menuItems.push({
            name: globalize.translate('ResumeAt', datetime.getDisplayRunningTime(resumePositionTicks)),
            id: 'resume'
        });

        menuItems.push({
            name: globalize.translate('PlayFromBeginning'),
            id: 'play'
        });

        actionsheet.show({

            items: menuItems,
            positionTo: options.positionTo

        }).then(function (id) {
            switch (id) {

                case 'play':
                    playbackManager.play({
                        ids: [playableItemId],
                        serverId: serverId
                    });
                    break;
                case 'resume':
                    playbackManager.play({
                        ids: [playableItemId],
                        startPositionTicks: resumePositionTicks,
                        serverId: serverId
                    });
                    break;
                case 'queue':
                    playbackManager.queue({
                        items: [item]
                    });
                    break;
                case 'shuffle':
                    playbackManager.shuffle(item);
                    break;
                default:
                    break;
            }
        });
    }

    return {
        show: show
    };
});