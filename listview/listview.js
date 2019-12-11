define(['dom', 'itemShortcuts', 'itemHelper', 'mediaInfo', 'indicators', 'connectionManager', 'layoutManager', 'globalize', 'datetime', 'apphost', 'css!./listview', 'emby-ratingbutton', 'emby-playstatebutton', 'embyProgressBarStyle'], function (dom, itemShortcuts, itemHelper, mediaInfo, indicators, connectionManager, layoutManager, globalize, datetime, appHost) {
    'use strict';

    function getIndex(item, options) {

        if (options.index === 'disc') {

            var parentIndexNumber = item.ParentIndexNumber;

            if (parentIndexNumber === 1) {
                return '';
            }

            return parentIndexNumber == null ? '' : globalize.translate('ValueDiscNumber', parentIndexNumber);
        }

        return '';
    }

    function getImageUrl(item, width) {

        var apiClient = connectionManager.getApiClient(item);

        var options = {
            width: width,
            type: "Primary"
        };

        if (item.ImageTags && item.ImageTags.Primary) {

            options.tag = item.ImageTags.Primary;
            return apiClient.getScaledImageUrl(item.Id, options);
        }

        if (item.AlbumId && item.AlbumPrimaryImageTag) {

            options.tag = item.AlbumPrimaryImageTag;
            return apiClient.getScaledImageUrl(item.AlbumId, options);
        }

        else if (item.SeriesId && item.SeriesPrimaryImageTag) {

            options.tag = item.SeriesPrimaryImageTag;
            return apiClient.getScaledImageUrl(item.SeriesId, options);

        }
        else if (item.ParentPrimaryImageTag) {

            options.tag = item.ParentPrimaryImageTag;
            return apiClient.getScaledImageUrl(item.ParentPrimaryImageItemId, options);
        }

        return null;
    }

    function getChannelImageUrl(item, width) {

        var apiClient = connectionManager.getApiClient(item);

        var options = {
            width: width,
            type: "Primary"
        };

        if (item.ChannelId && item.ChannelPrimaryImageTag) {

            options.tag = item.ChannelPrimaryImageTag;
            return apiClient.getScaledImageUrl(item.ChannelId, options);
        }

        return null;
    }

    function getTextLinesHtml(textlines, isLargeStyle) {

        var html = '';

        var largeTitleTagName = layoutManager.tv ? 'h2' : 'div';

        for (var i = 0, length = textlines.length; i < length; i++) {

            var text = textlines[i];

            if (!text) {
                continue;
            }

            if (i === 0) {
                if (isLargeStyle) {
                    html += '<' + largeTitleTagName + ' class="listItemBodyText">';
                } else {
                    html += '<div class="listItemBodyText">';
                }
            } else {
                html += '<div class="listItemBodyText listItemBodyText-secondary">';
            }
            html += dom.htmlEncode(text);
            if (i === 0 && isLargeStyle) {
                html += '</' + largeTitleTagName + '>';
            } else {
                html += '</div>';
            }
        }

        return html;
    }

    function getRightButtonsHtml(options) {

        var html = '';

        for (var i = 0, length = options.rightButtons.length; i < length; i++) {

            var button = options.rightButtons[i];

            html += '<button type="button" is="paper-icon-button-light" class="listItemButton itemAction" data-action="custom" data-customaction="' + button.id + '" title="' + button.title + '"><i class="md-icon">' + button.icon + '</i></button>';
        }

        return html;
    }

    function getId(item) {
        return item.Id;
    }

    function getListViewHtml(options) {

        var items = options.items;

        var groupTitle = '';
        var action = options.action || 'link';

        var isLargeStyle = options.imageSize === 'large';
        var enableOverview = options.enableOverview;

        var clickEntireItem = layoutManager.tv ? true : false;
        var outerTagName = clickEntireItem ? 'button' : 'div';
        var enableSideMediaInfo = options.enableSideMediaInfo != null ? options.enableSideMediaInfo : true;

        var outerHtml = '';

        var enableContentWrapper = options.enableOverview && !layoutManager.tv;
        var containerAlbumArtistIds = (options.containerAlbumArtists || []).map(getId);

        for (var i = 0, length = items.length; i < length; i++) {

            var item = items[i];

            var html = '';

            if (options.showIndex) {

                var itemGroupTitle = getIndex(item, options);

                if (itemGroupTitle !== groupTitle) {

                    if (i === 0) {
                        html += '<h2 class="listGroupHeader listGroupHeader-first">';
                    }
                    else {
                        html += '<h2 class="listGroupHeader">';
                    }

                    html += itemGroupTitle;
                    html += '</h2>';

                    groupTitle = itemGroupTitle;
                }
            }

            var cssClass = "listItem";

            if (options.border || (options.highlight !== false && !layoutManager.tv)) {
                cssClass += ' listItem-border';
            }

            if (clickEntireItem) {
                cssClass += ' itemAction listItem-button';
            }

            if (layoutManager.tv) {
                cssClass += ' listItem-focusscale';
            }

            var downloadWidth = 80;

            if (isLargeStyle) {
                cssClass += " listItem-largeImage";
                downloadWidth = 500;
            }

            var dataAttributes = itemShortcuts.getShortcutAttributesHtml(item, options);

            if (enableContentWrapper) {

                cssClass += ' listItem-withContentWrapper';
            }

            html += '<' + outerTagName + ' class="' + cssClass + '"' + dataAttributes + ' data-action="' + action + '" >';

            if (enableContentWrapper) {

                html += '<div class="listItem-content">';
            }

            if (options.image !== false) {
                var imgUrl = options.imageSource === 'channel' ? getChannelImageUrl(item, downloadWidth) : getImageUrl(item, downloadWidth);
                console.log(imgUrl);
                var imageClass = isLargeStyle ? 'listItemImage listItemImage-large' : 'listItemImage';

                if (isLargeStyle && layoutManager.tv) {
                    imageClass += ' listItemImage-large-tv';
                }

                if (options.playlistItemId && options.playlistItemId === item.PlaylistItemId) {
                    imageClass += ' playlistIndexIndicatorImage';
                }

                var playOnImageClick = options.imagePlayButton && !layoutManager.tv;

                if (!clickEntireItem) {
                    imageClass += ' itemAction';
                }

                var imageAction = playOnImageClick ? 'resume' : action;

                if (imgUrl) {
                    html += '<div data-action="' + imageAction + '" class="' + imageClass + ' lazy" loading="lazy" style="background-image:url(' + imgUrl + ');" item-icon>';
                } else {
                    html += '<div class="' + imageClass + '">';
                }

                var indicatorsHtml = '';
                indicatorsHtml += indicators.getPlayedIndicatorHtml(item);

                if (indicatorsHtml) {
                    html += '<div class="indicators listItemIndicators">' + indicatorsHtml + '</div>';
                }

                if (playOnImageClick) {
                    html += '<button type="button" is="paper-icon-button-light" class="listItemImageButton itemAction" data-action="resume"><i class="md-icon listItemImageButton-icon">&#xE037;</i></button>';
                }

                var progressHtml = indicators.getProgressBarHtml(item, {
                    containerClass: 'listItemProgressBar'
                });

                if (progressHtml) {
                    html += progressHtml;
                }
                html += '</div>';
            }

            if (options.showIndexNumberLeft) {

                html += '<div class="listItem-indexnumberleft">';
                if (item.IndexNumber == null) {
                    html += '&nbsp;';
                } else {
                    html += item.IndexNumber;
                }
                html += '</div>';
            }

            var textlines = [];

            if (options.showProgramDateTime) {
                textlines.push(datetime.toLocaleString(datetime.parseISO8601Date(item.StartDate), {

                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                }));
            }

            if (options.showProgramTime) {
                textlines.push(datetime.getDisplayTime(datetime.parseISO8601Date(item.StartDate)));
            }

            if (options.showChannel) {
                if (item.ChannelName) {
                    textlines.push(item.ChannelName);
                }
            }

            var parentTitle = null;

            if (options.showParentTitle) {
                if (item.Type === 'Episode') {
                    parentTitle = item.SeriesName;
                }

                else if (item.IsSeries || (item.EpisodeTitle && item.Name)) {
                    parentTitle = item.Name;
                }
            }

            var displayName = itemHelper.getDisplayName(item, {
                includeParentInfo: options.includeParentInfoInTitle
            });

            if (options.showIndexNumber && item.IndexNumber != null) {
                displayName = item.IndexNumber + ". " + displayName;
            }

            if (options.showParentTitle && options.parentTitleWithTitle) {

                if (displayName) {

                    if (parentTitle) {
                        parentTitle += ' - ';
                    }
                    parentTitle = (parentTitle || '') + displayName;
                }

                textlines.push(parentTitle || '');
            }
            else if (options.showParentTitle) {
                textlines.push(parentTitle || '');
            }

            if (displayName && !options.parentTitleWithTitle) {
                textlines.push(displayName);
            }

            if (item.IsFolder) {
                if (options.artist !== false) {

                    if (item.AlbumArtist && item.Type === 'MusicAlbum') {
                        textlines.push(item.AlbumArtist);
                    }
                }
            } else {

                var showArtist = options.artist === true;
                var artistItems = item.ArtistItems;

                if (!showArtist && options.artist !== false) {

                    if (!artistItems || !artistItems.length) {
                        showArtist = true;
                    }
                    else if (artistItems.length > 1 || containerAlbumArtistIds.length !== 1 || containerAlbumArtistIds.indexOf(artistItems[0].Id) === -1) {
                        showArtist = true;
                    }
                }

                if (showArtist) {

                    if (artistItems && item.Type !== 'MusicAlbum') {
                        textlines.push(artistItems.map(function (a) {
                            return a.Name;
                        }).join(', '));
                    }
                }
            }

            if (item.Type === 'Game') {
                textlines.push(item.GameSystem);
            }

            if (item.Type === 'TvChannel') {

                if (item.CurrentProgram) {
                    textlines.push(itemHelper.getDisplayName(item.CurrentProgram));
                }
            }

            cssClass = 'listItemBody';
            if (!clickEntireItem) {
                cssClass += ' itemAction';
            }

            if (options.image === false) {
                cssClass += ' listItemBody-noleftpadding';
            }

            html += '<div class="' + cssClass + '">';

            var moreIcon = '&#xE5D3;';

            html += getTextLinesHtml(textlines, isLargeStyle);

            if (options.mediaInfo !== false) {
                if (!enableSideMediaInfo) {

                    var mediaInfoClass = 'listItemMediaInfo listItemBodyText listItemBodyText-secondary';

                    html += '<div class="' + mediaInfoClass + '">' + mediaInfo.getPrimaryMediaInfoHtml(item, {
                        episodeTitle: false,
                        originalAirDate: false,
                        subtitles: false,
                        endsAt: false

                    }) + '</div>';
                }
            }

            if (enableOverview && item.Overview) {
                html += '<div class="listItem-overview listItemBodyText listItemBodyText-secondary">';
                html += dom.htmlEncode(item.Overview);
                html += '</div>';
            }

            html += '</div>';

            if (options.mediaInfo !== false) {
                if (enableSideMediaInfo) {
                    html += '<div class="listItemMediaInfo secondaryText">' + mediaInfo.getPrimaryMediaInfoHtml(item, {

                        year: false,
                        container: false,
                        episodeTitle: false,
                        criticRating: false,
                        endsAt: false

                    }) + '</div>';
                }
            }

            if (!options.recordButton && (item.Type === 'Timer' || item.Type === 'Program')) {
                html += indicators.getTimerIndicator(item).replace('indicatorIcon', 'indicatorIcon listItemAside');
            }

            if (!clickEntireItem) {

                if (options.addToListButton) {
                    html += '<button type="button" is="paper-icon-button-light" class="listItemButton itemAction" data-action="addtoplaylist"><i class="md-icon">&#xE03B;</i></button>';
                }

                if (options.moreButton !== false && item.Type !== 'Program') {
                    html += '<button type="button" is="paper-icon-button-light" class="listItemButton itemAction" data-action="menu"><i class="md-icon">' + moreIcon + '</i></button>';
                }

                if (options.infoButton) {
                    html += '<button type="button" is="paper-icon-button-light" class="listItemButton itemAction" data-action="link"><i class="md-icon">&#xE88F;</i></button>';
                }

                if (options.rightButtons) {
                    html += getRightButtonsHtml(options);
                }

                if (options.enableUserDataButtons !== false) {

                    html += '<span class="listViewUserDataButtons flex align-items-center">';

                    var userData = item.UserData || {};
                    var likes = userData.Likes == null ? '' : userData.Likes;

                    if (itemHelper.canMarkPlayed(item)) {
                        html += '<button type="button" is="emby-playstatebutton" type="button" class="listItemButton paper-icon-button-light" data-id="' + item.Id + '" data-serverid="' + item.ServerId + '" data-itemtype="' + item.Type + '" data-played="' + (userData.Played) + '"><i class="md-icon">&#xE5CA;</i></button>';
                    }

                    if (itemHelper.canRate(item)) {
                        html += '<button type="button" is="emby-ratingbutton" type="button" class="listItemButton paper-icon-button-light" data-id="' + item.Id + '" data-serverid="' + item.ServerId + '" data-itemtype="' + item.Type + '" data-likes="' + likes + '" data-isfavorite="' + (userData.IsFavorite) + '"><i class="md-icon">&#xE87D;</i></button>';
                    }

                    html += '</span>';
                }

                if (options.dragHandle) {
                    //html += '<button is="paper-icon-button-light" class="listViewDragHandle listItemButton"><i class="md-icon">&#xE25D;</i></button>';
                    // Firefox and Edge are not allowing the button to be draggable
                    html += '<i class="listViewDragHandle md-icon listItemIcon listItemIcon-transparent">&#xE25D;</i>';
                }
            }

            if (enableContentWrapper) {
                html += '</div>';

                if (enableOverview && item.Overview) {
                    html += '<div class="listItem-bottomoverview secondaryText">';
                    html += dom.htmlEncode(item.Overview);
                    html += '</div>';
                }
            }

            html += '</' + outerTagName + '>';

            outerHtml += html;
        }

        return outerHtml;
    }

    return {
        getListViewHtml: getListViewHtml
    };
});