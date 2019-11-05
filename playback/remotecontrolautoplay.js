define(['events', 'playbackManager'], function (events, playbackManager) {
    'use strict';

    function transferPlayback(oldPlayer, newPlayer) {

        var state = playbackManager.getPlayerState(oldPlayer);
        var item = state.NowPlayingItem;

        if (!item) {
            return;
        }

        var playState = state.PlayState || {};
        var resumePositionTicks = playState.PositionTicks || 0;

        return playbackManager.stop(oldPlayer).then(function () {

            playbackManager.play({
                ids: [item.Id],
                serverId: item.ServerId,
                startPositionTicks: resumePositionTicks

            }, newPlayer);
        });
    }

    events.on(playbackManager, 'playerchange', function (e, newPlayer, newTarget, oldPlayer) {

        if (!oldPlayer) {
            return;
        }

        if (oldPlayer.isLocalPlayer && (!newPlayer || newPlayer.isLocalPlayer)) {
            console.log('Skipping remote control autoplay because both old and new players are local');
            return;
        }

        if (!newPlayer || newPlayer.isLocalPlayer) {
            console.log('Skipping remote control autoplay because newPlayer is a local player');
            return;
        }

        return transferPlayback(oldPlayer, newPlayer);
    });

});