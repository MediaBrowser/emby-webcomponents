define(['dom', 'playbackManager', 'connectionManager', 'events', 'mediaInfo', 'layoutManager', 'globalize', 'itemHelper', 'css!./upnextdialog', 'emby-button', 'flexStyles'], function (dom, playbackManager, connectionManager, events, mediaInfo, layoutManager, globalize, itemHelper) {
    'use strict';

    var transitionEndEventName = dom.whichTransitionEvent();

    function seriesImageUrl(item, options) {

        if (item.Type !== 'Episode') {
            return null;
        }

        options = options || {};
        options.type = options.type || "Primary";

        if (options.type === 'Primary') {

            if (item.SeriesPrimaryImageTag) {

                options.tag = item.SeriesPrimaryImageTag;

                return connectionManager.getApiClient(item.ServerId).getScaledImageUrl(item.SeriesId, options);
            }
        }

        if (options.type === 'Thumb') {

            if (item.SeriesThumbImageTag) {

                options.tag = item.SeriesThumbImageTag;

                return connectionManager.getApiClient(item.ServerId).getScaledImageUrl(item.SeriesId, options);
            }
            if (item.ParentThumbImageTag) {

                options.tag = item.ParentThumbImageTag;

                return connectionManager.getApiClient(item.ServerId).getScaledImageUrl(item.ParentThumbItemId, options);
            }
        }

        return null;
    }

    function imageUrl(item, options) {

        options = options || {};
        options.type = options.type || "Primary";

        if (item.ImageTags && item.ImageTags[options.type]) {

            options.tag = item.ImageTags[options.type];
            return connectionManager.getApiClient(item.ServerId).getScaledImageUrl(item.PrimaryImageItemId || item.Id, options);
        }

        if (options.type === 'Primary') {
            if (item.AlbumId && item.AlbumPrimaryImageTag) {

                options.tag = item.AlbumPrimaryImageTag;
                return connectionManager.getApiClient(item.ServerId).getScaledImageUrl(item.AlbumId, options);
            }
        }

        return null;
    }

    function setPoster(osdPoster, item, secondaryItem) {

        if (item) {

            var imgUrl = seriesImageUrl(item, { type: 'Primary' }) ||
                seriesImageUrl(item, { type: 'Thumb' }) ||
                imageUrl(item, { type: 'Primary' });

            if (!imgUrl && secondaryItem) {
                imgUrl = seriesImageUrl(secondaryItem, { type: 'Primary' }) ||
                    seriesImageUrl(secondaryItem, { type: 'Thumb' }) ||
                    imageUrl(secondaryItem, { type: 'Primary' });
            }

            if (imgUrl) {
                osdPoster.innerHTML = '<img class="upNextDialog-poster-img" src="' + imgUrl + '" />';
                return;
            }
        }

        osdPoster.innerHTML = '';
    }

    function getHtml() {

        var html = '';

        html += '<div class="upNextDialog-poster">';
        html += '</div>';

        html += '<div class="flex flex-direction-column flex-grow">';

        html += '<h2 class="upNextDialog-nextVideoText" style="margin:.25em 0;">&nbsp;</h2>';

        html += '<h3 class="upNextDialog-title" style="margin:.25em 0 .5em;"></h3>';

        html += '<div class="flex flex-direction-row upNextDialog-mediainfo">';
        html += '</div>';

        html += '<div class="upNextDialog-overview" style="margin-top:1em;"></div>';

        html += '<div class="flex flex-direction-row upNextDialog-buttons" style="margin-top:1em;">';

        html += '<button type="button" is="emby-button" class="raised raised-mini btnStartNow">';
        html += globalize.translate('sharedcomponents#HeaderStartNow');
        html += '</button>';

        html += '<button type="button" is="emby-button" class="raised raised-mini btnHide">';
        html += globalize.translate('sharedcomponents#Hide');
        html += '</button>';

        // buttons
        html += '</div>';

        // main
        html += '</div>';

        return html;
    }

    function setNextVideoText() {

        var instance = this;

        var hideTime = instance._hideTime;

        if (!hideTime) {
            return;
        }

        var elem = instance.options.parent;

        var secondsRemaining = Math.max(Math.round((hideTime - new Date().getTime()) / 1000), 0);

        var timeText = '<span class="upNextDialog-countdownText">' + globalize.translate('sharedcomponents#HeaderSecondsValue', secondsRemaining) + '</span>';

        var nextVideoText = instance.itemType === 'Episode' ?
            globalize.translate('sharedcomponents#HeaderNextEpisodePlayingInValue', timeText) :
            globalize.translate('sharedcomponents#HeaderNextVideoPlayingInValue', timeText);

        elem.querySelector('.upNextDialog-nextVideoText').innerHTML = nextVideoText;
    }

    function fillItem(item) {

        var instance = this;

        var elem = instance.options.parent;

        setPoster(elem.querySelector('.upNextDialog-poster'), item);

        elem.querySelector('.upNextDialog-overview').innerHTML = item.Overview || '';

        elem.querySelector('.upNextDialog-mediainfo').innerHTML = mediaInfo.getPrimaryMediaInfoHtml(item, {
        });

        var title = itemHelper.getDisplayName(item);
        if (item.SeriesName) {
            title = item.SeriesName + ' - ' + title;
        }

        elem.querySelector('.upNextDialog-title').innerHTML = title || '';

        instance.itemType = item.Type;

        instance.show();
    }

    function clearCountdownTextTimeout(instance) {
        if (instance._countdownTextTimeout) {
            clearTimeout(instance._countdownTextTimeout);
            instance._countdownTextTimeout = null;
        }
    }

    function startCountdownTextTimeout(instance) {

        setNextVideoText.call(instance);
        clearCountdownTextTimeout(instance);

        instance._countdownTextTimeout = setInterval(setNextVideoText.bind(instance), 500);
    }

    function onStartNowClick() {

        this._playNextOnHide = true;

        hideComingUpNext.call(this);
    }

    function init(instance, options) {

        options.parent.innerHTML = getHtml();

        options.parent.classList.add('upNextDialog');
        options.parent.classList.add('upNextDialog-hidden');

        playbackManager.nextItem(options.player).then(fillItem.bind(instance));

        options.parent.querySelector('.btnHide').addEventListener('click', instance.hide.bind(instance));
        options.parent.querySelector('.btnStartNow').addEventListener('click', onStartNowClick.bind(instance));
    }

    function onHideAnimationComplete(e) {

        var instance = this;
        var elem = e.target;

        elem.classList.add('hide');

        clearHideAnimationEventListeners(instance, elem);
        events.trigger(instance, 'hide');

        if (instance._playNextOnHide !== false) {
            advanceFromUpNext(instance);
        }
    }

    function clearHideAnimationEventListeners(instance, elem) {

        var fn = instance._onHideAnimationComplete;

        if (fn) {
            dom.removeEventListener(elem, transitionEndEventName, fn, {
                once: true
            });
        }
    }

    function hideComingUpNext() {

        var instance = this;
        stopComingUpNextHideTimer(instance);
        clearCountdownTextTimeout(this);

        var elem = instance.options.parent;

        clearHideAnimationEventListeners(this, elem);

        // trigger a reflow to force it to animate again
        void elem.offsetWidth;

        elem.classList.add('upNextDialog-hidden');

        var fn = onHideAnimationComplete.bind(instance);
        instance._onHideAnimationComplete = fn;

        dom.addEventListener(elem, transitionEndEventName, fn, {
            once: true
        });
    }

    function advanceFromUpNext(instance) {

        var options = instance.options;

        var endTimeMs = options.endTimeMs;

        // If we're already at the end, or close enough, then don't do anything and just allow the normal track advancement to take place
        if ((new Date().getTime() + 1000) >= endTimeMs) {
            return;
        }

        if (options && instance._playNextOnHide !== false) {
            playbackManager.nextTrack(options.player);
        }
    }

    function startComingUpNextHideTimer(instance) {

        stopComingUpNextHideTimer(instance);
        instance._playNextOnHide = true;

        var timeoutLength = instance.options.countdownMs;
        instance._hideTime = new Date().getTime() + timeoutLength;

        startCountdownTextTimeout(instance);

        instance._comimgUpNextHideTimeout = setTimeout(hideComingUpNext.bind(instance), timeoutLength);
    }

    function stopComingUpNextHideTimer(instance) {
        if (instance._comimgUpNextHideTimeout) {
            clearTimeout(instance._comimgUpNextHideTimeout);
            instance._comimgUpNextHideTimeout = null;
        }
    }

    function UpNextDialog(options) {

        this.options = options;

        init(this, options);
    }

    UpNextDialog.prototype.show = function () {

        var elem = this.options.parent;

        clearHideAnimationEventListeners(this, elem);

        elem.classList.remove('hide');

        // trigger a reflow to force it to animate again
        void elem.offsetWidth;

        elem.classList.remove('upNextDialog-hidden');

        if (layoutManager.tv) {
            setTimeout(function () {
                focusManager.focus(elem.querySelector('.btnStartNow'));
            }, 50);
        }

        startComingUpNextHideTimer(this);
    };

    UpNextDialog.prototype.hide = function () {

        this._playNextOnHide = false;

        hideComingUpNext.call(this);
    };

    UpNextDialog.prototype.reset = function () {

        this._playNextOnHide = false;

        hideComingUpNext.call(this);
    };

    UpNextDialog.prototype.destroy = function () {

        this._playNextOnHide = null;
        this.reset();
        this.options = null;
        this.itemType = null;
        this._hideTime = null;
    };

    return UpNextDialog;
});