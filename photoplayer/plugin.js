define(['browser', 'require', 'events', 'apphost', 'loading', 'dom', 'playbackManager', 'appRouter', 'appSettings', 'connectionManager'], function (browser, require, events, appHost, loading, dom, playbackManager, appRouter, appSettings, connectionManager) {
    "use strict";

    function PhotoPlayer() {

        this.name = 'Photo Player';
        this.type = 'mediaplayer';
        this.id = 'photoplayer';

        // Let any players created by plugins take priority
        this.priority = 1;
    }

    PhotoPlayer.prototype.play = function (options) {

        var self = this;

        return new Promise(function (resolve, reject) {

            require(['slideshow'], function (slideshow) {

                var index = options.startIndex || 0;

                var newSlideShow = new slideshow({
                    showTitle: false,
                    cover: false,
                    items: options.items,
                    startIndex: index,
                    interval: 11000,
                    interactive: true
                });

                newSlideShow.show();

                events.on(newSlideShow, 'closed', self.onSlideShowClosed.bind(self));

                self.slideshow = newSlideShow;

                resolve();
            });
        });
    };

    PhotoPlayer.prototype.onSlideShowClosed = function () {
        events.trigger(this, 'stopped');
    };

    PhotoPlayer.prototype.stop = function (options) {

        if (this.slideshow) {
            this.slideshow.hide();
            this.slideshow = null;

            return new Promise(function (resolve, reject) {

                setTimeout(resolve, 500);
            });
        }

        return Promise.resolve();
    };

    PhotoPlayer.prototype.destroy = function (options) {

        this.stop();
    };

    PhotoPlayer.prototype.isPlaying = function () {

        return this.slideshow != null;
    };

    PhotoPlayer.prototype.pause = function () {
    };

    PhotoPlayer.prototype.unpause = function () {
    };

    PhotoPlayer.prototype.paused = function () {

        return false;
    };

    PhotoPlayer.prototype.getVolume = function () {

        return 100;
    };

    PhotoPlayer.prototype.setVolume = function () {

    };

    PhotoPlayer.prototype.volumeUp = function () {
    };

    PhotoPlayer.prototype.volumeDown = function () {
    };

    PhotoPlayer.prototype.setMute = function (mute) {

    };

    PhotoPlayer.prototype.currentTime = function () {

    };

    PhotoPlayer.prototype.duration = function () {

    };

    PhotoPlayer.prototype.isMuted = function () {
        return false;
    };

    PhotoPlayer.prototype.canPlayMediaType = function (mediaType) {

        return (mediaType || '').toLowerCase() === 'photo';
    };

    return PhotoPlayer;
});