define(['playbackManager', 'focusManager', 'appRouter', 'dom'], function (playbackManager, focusManager, appRouter, dom) {
    'use strict';

    var lastInputTime = Date.now();

    function notify() {
        lastInputTime = Date.now();

        // TODO: Why did we do this?
        handleCommand('unknown');
    }

    function notifyMouseMove() {
        lastInputTime = Date.now();
    }

    function idleTime() {
        return Date.now() - lastInputTime;
    }

    function select(sourceElement) {

        sourceElement.click();
    }

    var eventListenerCount = 0;
    function on(scope, fn) {
        eventListenerCount++;
        dom.addEventListener(scope, 'command', fn, {

        });
    }

    function off(scope, fn) {

        if (eventListenerCount) {
            eventListenerCount--;
        }

        dom.removeEventListener(scope, 'command', fn, {

        });
    }

    var commandTimes = {};

    function checkCommandTime(command) {

        var last = commandTimes[command] || 0;
        var now = Date.now();

        if ((now - last) < 1000) {
            return false;
        }

        commandTimes[command] = now;
        return true;
    }

    function handleCommand(name, options) {

        lastInputTime = Date.now();

        var sourceElement = (options ? options.sourceElement : null);

        if (!sourceElement) {
            sourceElement = document.activeElement;
        }

        if (sourceElement) {
            var tagName = sourceElement.tagName;
            if (tagName === 'BODY' || tagName === 'HTML') {
                sourceElement = focusManager.getCurrentScope();
            }
        }
        else {
            sourceElement = focusManager.getCurrentScope();
        }

        if (eventListenerCount) {
            var customEvent = new CustomEvent("command", {
                detail: {
                    command: name
                },
                bubbles: true,
                cancelable: true
            });

            var eventResult = sourceElement.dispatchEvent(customEvent);
            if (!eventResult) {
                // event cancelled
                return true;
            }
        }

        switch (name) {

            case 'up':
                focusManager.moveUp(sourceElement);
                return true;
            case 'down':
                focusManager.moveDown(sourceElement);
                return true;
            case 'left':
                focusManager.moveLeft(sourceElement);
                return true;
            case 'right':
                focusManager.moveRight(sourceElement);
                return true;
            case 'home':
                appRouter.goHome();
                return true;
            case 'settings':
                appRouter.showSettings();
                return true;
            case 'back':
                appRouter.back();
                return true;
            case 'forward':
                return true;
            case 'select':
                select(sourceElement);
                return true;
            //case 'pageup':
            //    focusManager.moveFocus(sourceElement, -10);
            //    return true;
            //case 'pagedown':
            //    focusManager.moveFocus(sourceElement, 10);
            //    return true;
            //case 'end':
            //    focusManager.focusLast(sourceElement);
            //    return true;
            case 'menu':
            case 'info':
                return true;
            case 'nextchapter':
                playbackManager.nextChapter();
                return true;
            case 'next':
            case 'nexttrack':
                playbackManager.nextTrack();
                return true;
            case 'previous':
            case 'previoustrack':
                playbackManager.previousTrack();
                return true;
            case 'previouschapter':
                playbackManager.previousChapter();
                return true;
            case 'guide':
                appRouter.showGuide();
                return true;
            case 'recordedtv':
                appRouter.showRecordedTV();
                return true;
            case 'record':
                return true;
            case 'livetv':
                appRouter.showLiveTV();
                return true;
            case 'mute':
                playbackManager.setMute(true);
                return true;
            case 'unmute':
                playbackManager.setMute(false);
                return true;
            case 'togglemute':
                playbackManager.toggleMute();
                return true;
            case 'channelup':
                playbackManager.channelUp();
                return true;
            case 'channeldown':
                playbackManager.channelDown();
                return true;
            case 'volumedown':
                playbackManager.volumeDown();
                return true;
            case 'volumeup':
                playbackManager.volumeUp();
                return true;
            case 'play':
                playbackManager.unpause();
                return true;
            case 'pause':
                playbackManager.pause();
                return true;
            case 'playpause':
                playbackManager.playPause();
                return true;
            case 'stop':
                if (checkCommandTime('stop')) {
                    playbackManager.stop();
                }
                return true;
            case 'changezoom':
                playbackManager.toggleAspectRatio();
                return true;
            case 'changeaudiotrack':
                playbackManager.changeAudioStream();
                return true;
            case 'changesubtitletrack':
                playbackManager.changeSubtitleStream();
                return true;
            case 'search':
                appRouter.showSearch();
                return true;
            case 'favorites':
                appRouter.showFavorites();
                return true;
            case 'fastforward':
                playbackManager.fastForward();
                return true;
            case 'rewind':
                playbackManager.rewind();
                return true;
            case 'togglefullscreen':
                playbackManager.toggleFullscreen();
                return true;
            case 'disabledisplaymirror':
                playbackManager.enableDisplayMirroring(false);
                return true;
            case 'enabledisplaymirror':
                playbackManager.enableDisplayMirroring(true);
                return true;
            case 'toggledisplaymirror':
                playbackManager.toggleDisplayMirroring();
                return true;
            case 'togglestats':
                //playbackManager.toggleStats();
                return true;
            case 'movies':
                // TODO
                appRouter.goHome();
                return true;
            case 'music':
                // TODO
                appRouter.goHome();
                return true;
            case 'tv':
                // TODO
                appRouter.goHome();
                return true;
            case 'nowplaying':
                appRouter.showNowPlaying();
                return true;
            case 'save':
                return true;
            case 'screensaver':
                // TODO
                return true;
            case 'refresh':
                // TODO
                return true;
            case 'changebrightness':
                // TODO
                return true;
            case 'red':
                // TODO
                return true;
            case 'green':
                // TODO
                return true;
            case 'yellow':
                // TODO
                return true;
            case 'blue':
                // TODO
                return true;
            case 'grey':
                // TODO
                return true;
            case 'brown':
                // TODO
                return true;
            case 'repeatnone':
                playbackManager.setRepeatMode('RepeatNone');
                return true;
            case 'repeatall':
                playbackManager.setRepeatMode('RepeatAll');
                return true;
            case 'repeatone':
                playbackManager.setRepeatMode('RepeatOne');
                return true;
            default:
                return false;
        }
    }

    dom.addEventListener(document, 'click', notify, {
        passive: true
    });

    return {
        trigger: handleCommand,
        handle: handleCommand,
        notify: notify,
        notifyMouseMove: notifyMouseMove,
        idleTime: idleTime,
        on: on,
        off: off
    };
});