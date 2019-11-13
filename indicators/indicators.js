define(['datetime', 'itemHelper', 'css!./indicators.css', 'material-icons'], function (datetime, itemHelper) {
    'use strict';

    function getProgressHtml(pct, options) {

        var containerClass = 'itemProgressBar';

        if (options) {
            if (options.containerClass) {
                containerClass += ' ' + options.containerClass;
            }
        }

        return '<div class="' + containerClass + '"><div class="itemProgressBarForeground" style="width:' + pct + '%;"></div></div>';
    }

    var progressBarRequired;
    function getAutoTimeProgressHtml(pct, options, isRecording, start, end) {

        if (!progressBarRequired) {
            progressBarRequired = true;
            require(['emby-progressbar']);
        }

        var containerClass = 'itemProgressBar';

        if (options) {
            if (options.containerClass) {
                containerClass += ' ' + options.containerClass;
            }
        }

        var foregroundClass = 'itemProgressBarForeground';

        if (isRecording) {
            foregroundClass += ' itemProgressBarForeground-recording';
        }

        return '<div is="emby-progressbar" data-automode="time" data-starttime="' + start + '" data-endtime="' + end + '" class="' + containerClass + '"><div class="' + foregroundClass + '" style="width:' + pct + '%;"></div></div>';
    }

    function getProgressBarHtml(item, options) {

        var pct;

        var itemType = item.Type;

        if (itemType !== "Recording") {

            var userData = options ? (options.userData || item.UserData) : item.UserData;
            if (userData) {
                pct = userData.PlayedPercentage;

                if (pct && pct < 100) {

                    return getProgressHtml(pct, options);
                }
            }
        }

        item = item.CurrentProgram || item;

        if ((itemType === 'Program' || itemType === 'Timer' || itemType === 'Recording' || itemType === 'TvChannel') && item.StartDate && item.EndDate) {

            var startDate = 0;
            var endDate = 1;

            try {

                startDate = datetime.parseISO8601Date(item.StartDate).getTime();

            } catch (err) {
            }

            try {

                endDate = datetime.parseISO8601Date(item.EndDate).getTime();

            } catch (err) {
            }

            var now = Date.now();
            var total = endDate - startDate;
            pct = 100 * ((now - startDate) / total);

            if (pct > 0 && pct < 100) {

                var isRecording = itemType === 'Timer' || itemType === 'Recording' || item.TimerId;

                return getAutoTimeProgressHtml(pct, options, isRecording, startDate, endDate);
            }
        }

        return '';
    }

    function getPlayedIndicator(item) {

        var userData = item.UserData;

        if (userData) {

            if (userData.Played && itemHelper.canMarkPlayed(item)) {
                if (!item.IsFolder || item.Type === 'MusicAlbum') {
                    return '<div class="playedIndicator indicator"><i class="md-icon indicatorIcon">&#xE5CA;</i></div>';
                }
            }

            if (userData.UnplayedItemCount && itemHelper.canMarkPlayed(item)) {
                return '<div class="countIndicator indicator">' + userData.UnplayedItemCount + '</div>';
            }
        }

        return '';
    }

    function getCountIndicatorHtml(count) {

        return '<div class="countIndicator indicator">' + count + '</div>';
    }

    function getChildCountIndicatorHtml(item, options) {

        var minCount = 0;

        if (options) {
            minCount = options.minCount || minCount;
        }

        if (item.ChildCount && item.ChildCount > minCount) {
            return getCountIndicatorHtml(item.ChildCount);
        }

        return '';
    }

    function getTimerIndicator(item) {

        var status;

        var itemType = item.Type;

        if (itemType === 'SeriesTimer') {
            return '<i class="md-icon timerIndicator indicatorIcon">&#xE062;</i>';
        }
        else if (item.TimerId || item.SeriesTimerId) {

            status = item.Status || 'Cancelled';
        }
        else if (itemType === 'Timer') {

            status = item.Status;
        }
        else {
            return '';
        }

        if (item.SeriesTimerId) {

            if (status !== 'Cancelled') {
                return '<i class="md-icon timerIndicator indicatorIcon">&#xE062;</i>';
            }

            return '<i class="md-icon timerIndicator timerIndicator-inactive indicatorIcon">&#xE062;</i>';
        }

        return '<i class="md-icon timerIndicator indicatorIcon">&#xE061;</i>';
    }

    function getSyncIndicator(item) {

        if (item.SyncPercent === 100) {
            return '<div class="syncIndicator indicator fullSyncIndicator"><i class="md-icon indicatorIcon">&#xE2C0;</i></div>';
        } else if (item.SyncPercent != null) {
            return '<div class="syncIndicator indicator emptySyncIndicator"><i class="md-icon indicatorIcon">&#xE2C0;</i></div>';
        }

        return '';
    }

    function getTypeIndicator(item) {

        var itemType = item.Type;

        if (itemType === 'Video') {

            return '<div class="indicator videoIndicator"><i class="md-icon indicatorIcon">&#xE04B;</i></div>';
        }
        if (itemType === 'Folder' || itemType === 'PhotoAlbum') {

            return '<div class="indicator videoIndicator"><i class="md-icon indicatorIcon">&#xE2C7;</i></div>';
        }
        if (itemType === 'Photo') {

            return '<div class="indicator videoIndicator"><i class="md-icon indicatorIcon">&#xE410;</i></div>';
            //return '<div class="indicator videoIndicator"><i class="md-icon indicatorIcon">&#xE412;</i></div>';
        }

        return '';
    }

    function getMissingIndicator(item) {

        if (item.Type === 'Episode' && item.LocationType === 'Virtual') {

            if (item.PremiereDate) {
                try {

                    var premiereDate = datetime.parseISO8601Date(item.PremiereDate).getTime();

                    if (premiereDate > Date.now()) {
                        return '<div class="unairedIndicator">Unaired</div>';
                    }

                } catch (err) {
                }
            }

            return '<div class="missingIndicator">Missing</div>';
        }

        return '';
    }

    return {
        getProgressBarHtml: getProgressBarHtml,
        getPlayedIndicatorHtml: getPlayedIndicator,
        getChildCountIndicatorHtml: getChildCountIndicatorHtml,
        getTimerIndicator: getTimerIndicator,
        getSyncIndicator: getSyncIndicator,
        getTypeIndicator: getTypeIndicator,
        getMissingIndicator: getMissingIndicator
    };
});