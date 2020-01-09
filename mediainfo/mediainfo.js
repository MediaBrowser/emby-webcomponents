define(['browser', 'datetime', 'connectionManager', 'globalize', 'appRouter', 'itemHelper', 'indicators', 'material-icons', 'css!./mediainfo.css', 'programStyles', 'emby-linkbutton'], function (browser, datetime, connectionManager, globalize, appRouter, itemHelper, indicators) {
    'use strict';

    function addLeadingZeros(number, count) {
        var res = number + "";
        while (res.length < count) { res = "0" + res; }
        return res;
    }

    function getHumanReadableRuntime(ticks) {

        try {
            var days = Math.trunc(ticks / 864000000000);
            var hours = Math.trunc((ticks % 864000000000) / 36000000000);
            var mins = Math.trunc((ticks % 36000000000) / 600000000);

            var parts = [];

            if (days) {
                parts.push(days + 'd');
            }

            if (hours) {
                parts.push(hours + 'h');
            }

            if (mins) {
                parts.push(mins + 'm');
            }

            if (!parts.length) {
                return datetime.getDisplayRunningTime(ticks);
            }

            return parts.join(' ');
        }
        catch (err) {
            return datetime.getDisplayRunningTime(ticks);
        }
    }

    function getTimerIndicator(item) {

        var status;

        if (item.Type === 'SeriesTimer') {
            return '<i class="md-icon mediaInfoItem mediaInfoIconItem mediaInfoTimerIcon">&#xE062;</i>';
        }
        else if (item.TimerId || item.SeriesTimerId) {

            status = item.Status || 'Cancelled';
        }
        else if (item.Type === 'Timer') {

            status = item.Status;
        }
        else {
            return '';
        }

        if (item.SeriesTimerId) {

            if (status !== 'Cancelled') {
                return '<i class="md-icon mediaInfoItem mediaInfoIconItem mediaInfoTimerIcon">&#xE062;</i>';
            }

            return '<i class="md-icon mediaInfoItem mediaInfoIconItem">&#xE062;</i>';
        }

        return '<i class="md-icon mediaInfoItem mediaInfoIconItem mediaInfoTimerIcon">&#xE061;</i>';
    }

    function getProgramInfoHtml(item, options) {
        var html = '';

        var miscInfo = [];
        var text, date;

        if (item.StartDate && options.programTime !== false) {

            try {

                text = '';

                date = datetime.parseISO8601Date(item.StartDate);

                if (options.startDate !== false) {
                    text += datetime.toLocaleDateString(date, { weekday: 'short', month: 'short', day: 'numeric' });
                }

                text += ' ' + datetime.getDisplayTime(date);

                if (item.EndDate) {
                    date = datetime.parseISO8601Date(item.EndDate);
                    text += ' &ndash; ' + datetime.getDisplayTime(date);
                }

                miscInfo.push(text);
            }
            catch (e) {
                console.log("Error parsing date: " + item.StartDate);
            }
        }

        if (item.ChannelNumber) {
            miscInfo.push('CH ' + item.ChannelNumber);
        }

        if (item.ChannelName) {

            if (options.interactive && item.ChannelId) {
                miscInfo.push({
                    html: '<a is="emby-linkbutton" style="color:inherit;" class="button-link mediaInfoItem" href="' + appRouter.getRouteUrl({

                        ServerId: item.ServerId,
                        Type: 'TvChannel',
                        Name: item.ChannelName,
                        Id: item.ChannelId

                    }) + '">' + item.ChannelName + '</a>'
                });
            } else {
                miscInfo.push(item.ChannelName);
            }
        }

        if (options.timerIndicator !== false) {
            var timerHtml = getTimerIndicator(item);
            if (timerHtml) {
                miscInfo.push({
                    html: timerHtml
                });
            }
        }

        html += miscInfo.map(getMediaInfoItem).join('');

        return html;
    }

    function getMediaInfoHtml(item, options) {
        var html = '';

        var miscInfo = [];
        options = options || {};
        var text, date;

        var showFolderRuntime = item.Type === "MusicAlbum" || item.Type === 'MusicArtist' || item.Type === 'Playlist' || item.Type === 'MusicGenre';

        if ((item.Type === "Episode" || item.MediaType === 'Photo') && options.originalAirDate !== false) {

            if (item.PremiereDate) {

                try {
                    date = datetime.parseISO8601Date(item.PremiereDate);

                    text = datetime.toLocaleDateString(date);
                    miscInfo.push(text);
                }
                catch (e) {
                    console.log("Error parsing date: " + item.PremiereDate);
                }
            }
        }

        if (item.Type === 'SeriesTimer') {
            if (item.RecordAnyTime) {

                miscInfo.push(globalize.translate('Anytime'));
            } else {
                miscInfo.push(datetime.getDisplayTime(item.StartDate));
            }

            if (item.RecordAnyChannel) {
                miscInfo.push(globalize.translate('AllChannels'));
            }
            else {
                miscInfo.push(item.ChannelName || globalize.translate('OneChannel'));
            }
        }

        if (item.StartDate && item.Type !== 'Program' && item.Type !== 'SeriesTimer') {

            try {
                date = datetime.parseISO8601Date(item.StartDate);

                text = datetime.toLocaleDateString(date);
                miscInfo.push(text);

                if (item.Type !== "Recording") {
                    text = datetime.getDisplayTime(date);
                    miscInfo.push(text);
                }
            }
            catch (e) {
                console.log("Error parsing date: " + item.StartDate);
            }
        }

        if (options.year !== false && item.ProductionYear && item.Type === "Series") {

            if (item.Status === "Continuing") {
                miscInfo.push(globalize.translate('SeriesYearToPresent', item.ProductionYear));

            }
            else if (item.ProductionYear) {

                text = item.ProductionYear;

                if (item.EndDate) {

                    try {

                        var endYear = datetime.parseISO8601Date(item.EndDate).getFullYear();

                        if (endYear !== item.ProductionYear) {
                            text += " &ndash; " + datetime.parseISO8601Date(item.EndDate).getFullYear();
                        }

                    }
                    catch (e) {
                        console.log("Error parsing date: " + item.EndDate);
                    }
                }

                miscInfo.push(text);
            }
        }

        if (item.Type === 'Series') {

            var studioHtml = '';

            if (item.Studios && item.Studios.length) {

                var studio = item.Studios[0];

                if (studioHtml) {
                    studioHtml += ' on ';
                }

                studioHtml += '<a style="color:inherit;" class="button-link" is="emby-linkbutton" href="' + appRouter.getRouteUrl({

                    Name: studio.Name,
                    Type: 'Studio',
                    ServerId: item.ServerId,
                    Id: studio.Id

                }) + '">' + studio.Name + '</a>';
            }


            if (studioHtml) {
                miscInfo.push(studioHtml);
            }
        }

        if (item.Type === 'Program') {

            if (options.programIndicator !== false) {

                var apiClient = connectionManager.getApiClient(item);

                if (item.IsLive) {
                    miscInfo.push({
                        html: '<div class="mediaInfoProgramAttribute mediaInfoItem liveTvProgram">' + globalize.translate('Live') + '</div>'
                    });
                }
                else if (item.IsPremiere) {
                    miscInfo.push({
                        html: '<div class="mediaInfoProgramAttribute mediaInfoItem premiereTvProgram">' + globalize.translate('Premiere') + '</div>'
                    });
                }
                else if (item.IsNew || (item.IsSeries && !item.IsRepeat && !connectionManager.getApiClient(item).isMinServerVersion('3.6.0.0'))) {
                    miscInfo.push({
                        html: '<div class="mediaInfoProgramAttribute mediaInfoItem newTvProgram">' + globalize.translate('AttributeNew') + '</div>'
                    });
                }
                else if (item.IsRepeat) {
                    miscInfo.push({
                        html: '<div class="mediaInfoProgramAttribute mediaInfoItem repeatTvProgram">' + globalize.translate('Repeat') + '</div>'
                    });
                }
            }

            if ((item.IsSeries || item.EpisodeTitle) && options.episodeTitle !== false) {

                text = itemHelper.getDisplayName(item, {
                    includeIndexNumber: options.episodeTitleIndexNumber
                });

                if (text) {
                    miscInfo.push(text);
                }
            }

            else if (item.IsMovie && item.ProductionYear && options.originalAirDate !== false) {
                miscInfo.push(item.ProductionYear);
            }

            else if (item.PremiereDate && options.originalAirDate !== false) {

                try {
                    date = datetime.parseISO8601Date(item.PremiereDate);
                    text = globalize.translate('OriginalAirDateValue', datetime.toLocaleDateString(date));
                    miscInfo.push(text);
                }
                catch (e) {
                    console.log("Error parsing date: " + item.PremiereDate);
                }
            } else if (item.ProductionYear) {
                miscInfo.push(item.ProductionYear);
            }
        }

        if (options.year !== false) {
            if (item.Type !== "Series" && item.Type !== "Episode" && item.Type !== "Person" && item.MediaType !== 'Photo' && item.Type !== 'Program' && item.Type !== 'Season') {

                if (item.ProductionYear) {

                    miscInfo.push(item.ProductionYear);
                }
                else if (item.PremiereDate) {

                    try {
                        text = datetime.parseISO8601Date(item.PremiereDate).getFullYear();
                        miscInfo.push(text);
                    }
                    catch (e) {
                        console.log("Error parsing date: " + item.PremiereDate);
                    }
                }
            }
        }

        if (item.RunTimeTicks && item.Type !== "Series" && item.Type !== 'Program' && !showFolderRuntime && options.runtime !== false) {

            if (item.Type === "Audio") {

                miscInfo.push(datetime.getDisplayRunningTime(item.RunTimeTicks));

            } else {

                miscInfo.push(getHumanReadableRuntime(item.RunTimeTicks));
            }
        }

        if (item.OfficialRating) {
            miscInfo.push({
                text: item.OfficialRating
            });
        }

        if (showFolderRuntime) {

            var count = item.SongCount || item.ChildCount;

            if (count) {

                if (count === 1) {
                    miscInfo.push(globalize.translate('OneTrack'));
                }
                else {
                    miscInfo.push(globalize.translate('TrackCount', count));
                }
            }

            if (item.RunTimeTicks) {
                if (item.Type === 'Playlist') {
                    miscInfo.push(getHumanReadableRuntime(item.RunTimeTicks));
                }
            }
        }

        if (item.Type === 'Series' && item.ChildCount) {

            if (item.ChildCount === 1) {

                miscInfo.push(globalize.translate('OneSeason'));
            } else {
                miscInfo.push(globalize.translate('NumberSeasonsValue', item.ChildCount));
            }
        }

        if (item.Video3DFormat) {
            miscInfo.push("3D");
        }

        if (item.MediaType === 'Photo' && item.Width && item.Height) {
            miscInfo.push(item.Width + "x" + item.Height);
        }

        if (options.container !== false && item.Type === 'Audio' && item.Container) {
            miscInfo.push(item.Container);
        }

        if (options.CommunityRating !== false && item.CommunityRating) {
            html += getStarIconsHtml(item);
        }

        if (item.CriticRating && options.criticRating !== false) {

            if (item.CriticRating >= 60) {
                html += '<div class="mediaInfoItem mediaInfoCriticRating mediaInfoCriticRatingFresh">' + item.CriticRating + '%</div>';
            } else {
                html += '<div class="mediaInfoItem mediaInfoCriticRating mediaInfoCriticRatingRotten">' + item.CriticRating + '%</div>';
            }
        }

        html += miscInfo.map(getMediaInfoItem).join('');

        if (item.HasSubtitles && options.subtitles !== false) {
            html += '<div class="mediaInfoItem mediaInfoText closedCaptionMediaInfoText">CC</div>';
        }

        if (options.endsAt !== false) {

            var endsAt = getEndsAt(item);
            if (endsAt) {
                html += getMediaInfoItem(endsAt, 'endsAt');
            }
        }

        if (options.dateAdded && itemHelper.enableDateAddedDisplay(item)) {
            var dateCreated = datetime.parseISO8601Date(item.DateCreated);

            html += getMediaInfoItem(globalize.translate('AddedOnValue', datetime.toLocaleDateString(dateCreated)));
        }

        html += indicators.getMissingIndicator(item);

        return html;
    }

    function getEndsAt(item) {

        if (item.MediaType === 'Video' && item.RunTimeTicks) {

            if (!item.StartDate) {
                var endDate = Date.now() + (item.RunTimeTicks / 10000);
                endDate = new Date(endDate);

                var displayTime = datetime.getDisplayTime(endDate);
                return globalize.translate('EndsAtValue', displayTime);
            }
        }

        return null;
    }

    function getEndsAtFromPosition(runtimeTicks, positionTicks, includeText) {

        var endDate = Date.now() + ((runtimeTicks - (positionTicks || 0)) / 10000);
        endDate = new Date(endDate);

        var displayTime = datetime.getDisplayTime(endDate);

        if (includeText === false) {
            return displayTime;
        }
        return globalize.translate('EndsAtValue', displayTime);
    }

    function getMediaInfoItem(m, cssClass) {

        cssClass = cssClass ? (cssClass + ' mediaInfoItem') : 'mediaInfoItem';
        var mediaInfoText = m;

        if (typeof (m) !== 'string' && typeof (m) !== 'number') {

            if (m.html) {
                return m.html;
            }
            mediaInfoText = m.text;
            cssClass += ' ' + m.cssClass;
        }
        return '<div class="' + cssClass + '">' + mediaInfoText + '</div>';
    }

    function getStarIconsHtml(item) {

        var html = '';

        var rating = item.CommunityRating;

        if (rating) {
            html += '<div class="starRatingContainer mediaInfoItem">';

            html += '<i class="md-icon starIcon">&#xE838;</i>';
            html += rating;
            html += '</div>';
        }

        return html;
    }

    function dynamicEndTime(elem, item) {

        var interval = setInterval(function () {

            if (!document.body.contains(elem)) {

                clearInterval(interval);
                return;
            }

            elem.innerHTML = getEndsAt(item);

        }, 60000);
    }

    function fillPrimaryMediaInfo(elem, item, options) {
        var html = getPrimaryMediaInfoHtml(item, options);

        elem.innerHTML = html;

        if (html) {
            elem.classList.remove('hide');
        } else {
            elem.classList.add('hide');
        }

        afterFill(elem, item, options);
    }

    function fillSecondaryMediaInfo(elem, item, options) {
        var html = getSecondaryMediaInfoHtml(item, options);

        elem.innerHTML = html;
        afterFill(elem, item, options);
    }

    function afterFill(elem, item, options) {

        if (options.endsAt !== false) {
            var endsAtElem = elem.querySelector('.endsAt');
            if (endsAtElem) {
                dynamicEndTime(endsAtElem, item);
            }
        }
    }

    function onChannelLinkClick(e) {

        var channelId = this.getAttribute('data-id');
        var serverId = this.getAttribute('data-serverid');

        appRouter.showItem(channelId, serverId);

        e.preventDefault();
        return false;
    }

    function getPrimaryMediaInfoHtml(item, options) {

        options = options || {};
        if (options.interactive == null) {
            options.interactive = false;
        }

        return getMediaInfoHtml(item, options);
    }

    function getSecondaryMediaInfoHtml(item, options) {

        options = options || {};
        if (options.interactive == null) {
            options.interactive = false;
        }
        if (item.Type === 'Program') {
            return getProgramInfoHtml(item, options);
        }

        return '';
    }

    function getResolutionText(i) {

        var width = i.Width;
        var height = i.Height;

        if (width && height) {

            if (width >= 3800 || height >= 2000) {
                return '4K';
            }
            if (width >= 2500 || height >= 1400) {
                if (i.IsInterlaced) {
                    return '1440i';
                }
                return '1440P';
            }
            if (width >= 1800 || height >= 1000) {
                if (i.IsInterlaced) {
                    return '1080i';
                }
                return '1080P';
            }
            if (width >= 1200 || height >= 700) {
                if (i.IsInterlaced) {
                    return '720i';
                }
                return '720P';
            }
            if (width >= 700 || height >= 400) {

                if (i.IsInterlaced) {
                    return '480i';
                }
                return '480P';
            }

        }
        return null;
    }

    function getAudioStreamForDisplay(item) {

        if (!item.MediaSources) {
            return null;
        }

        var mediaSource = item.MediaSources[0];
        if (!mediaSource) {
            return null;
        }

        return (mediaSource.MediaStreams || []).filter(function (i) {
            return i.Type === 'Audio' && (i.Index === mediaSource.DefaultAudioStreamIndex || mediaSource.DefaultAudioStreamIndex == null);
        })[0];
    }

    function getMediaInfoStats(item, options) {

        options = options || {};

        var list = [];

        var mediaSource = (item.MediaSources || [])[0] || {};

        var videoStream = (mediaSource.MediaStreams || []).filter(function (i) {
            return i.Type === 'Video';
        })[0] || {};
        var audioStream = getAudioStreamForDisplay(item) || {};

        if (item.VideoType === 'Dvd' || item.Container === 'dvd') {
            list.push({
                type: 'mediainfo',
                text: 'Dvd'
            });
        }

        if (item.VideoType === 'BluRay' || item.Container === 'bluray') {
            list.push({
                type: 'mediainfo',
                text: 'BluRay'
            });
        }

        //if (mediaSource.Container) {
        //    html += '<div class="mediaInfoIcon mediaInfoText">' + mediaSource.Container + '</div>';
        //}

        var resolutionText = getResolutionText(videoStream);
        if (resolutionText) {
            list.push({
                type: 'mediainfo',
                text: resolutionText
            });
        }

        if (videoStream.Codec) {
            list.push({
                type: 'mediainfo',
                text: videoStream.Codec
            });
        }

        var channels = audioStream.Channels;
        var channelText;

        if (channels === 8) {

            channelText = '7.1';

        } else if (channels === 7) {

            channelText = '6.1';

        } else if (channels === 6) {

            channelText = '5.1';

        } else if (channels === 2) {

            channelText = '2.0';
        }

        if (channelText) {
            list.push({
                type: 'mediainfo',
                text: channelText
            });
        }

        var audioCodec = (audioStream.Codec || '').toLowerCase();

        if ((audioCodec === 'dca' || audioCodec === 'dts') && audioStream.Profile) {
            list.push({
                type: 'mediainfo',
                text: audioStream.Profile
            });
        } else if (audioStream.Codec) {
            list.push({
                type: 'mediainfo',
                text: audioStream.Codec
            });
        }

        if (item.DateCreated && itemHelper.enableDateAddedDisplay(item)) {

            var dateCreated = datetime.parseISO8601Date(item.DateCreated);

            list.push({
                type: 'added',
                text: globalize.translate('AddedOnValue', datetime.toLocaleDateString(dateCreated) + ' ' + datetime.getDisplayTime(dateCreated))
            });
        }

        return list;
    }

    return {
        getMediaInfoHtml: getPrimaryMediaInfoHtml,
        fill: fillPrimaryMediaInfo,
        getEndsAt: getEndsAt,
        getEndsAtFromPosition: getEndsAtFromPosition,
        getPrimaryMediaInfoHtml: getPrimaryMediaInfoHtml,
        getSecondaryMediaInfoHtml: getSecondaryMediaInfoHtml,
        fillPrimaryMediaInfo: fillPrimaryMediaInfo,
        fillSecondaryMediaInfo: fillSecondaryMediaInfo,
        getMediaInfoStats: getMediaInfoStats,
        getResolutionText: getResolutionText
    };
});