define(['datetime', 'imageLoader', 'connectionManager', 'itemHelper', 'focusManager', 'indicators', 'globalize', 'layoutManager', 'apphost', 'dom', 'browser', 'playbackManager', 'itemShortcuts', 'css!./card', 'paper-icon-button-light', 'programStyles'],
    function (datetime, imageLoader, connectionManager, itemHelper, focusManager, indicators, globalize, layoutManager, appHost, dom, browser, playbackManager, itemShortcuts) {
        'use strict';

        var devicePixelRatio = window.devicePixelRatio || 1;
        var enableFocusTransfrom = !browser.slow && !browser.edge;

        function getCardsHtml(items, options) {

            if (arguments.length === 1) {

                options = arguments[0];
                items = options.items;
            }

            var html = buildCardsHtmlInternal(items, options);

            return html;
        }

        function getPostersPerRow(shape, screenWidth, isOrientationLandscape) {

            switch (shape) {

                case 'portrait':
                case 'square':
                    if (layoutManager.tv) {
                        return 100 / 16.66666667;
                    }
                    if (screenWidth >= 2100) {
                        return 100 / 10;
                    }
                    if (screenWidth >= 1760) {
                        return 100 / 11.1111111111;
                    }
                    if (screenWidth >= 1600) {
                        return 100 / 12.5;
                    }
                    if (screenWidth >= 1320) {
                        return 100 / 14.28571428571;
                    }
                    if (screenWidth >= 1120) {
                        return 100 / 16.66666667;
                    }
                    if (screenWidth >= 800) {
                        return 5;
                    }
                    if (screenWidth >= 700) {
                        return 4;
                    }
                    if (screenWidth >= 500) {
                        return 100 / 33.33333333;
                    }
                    return 100 / 33.33333333;
                case 'fourthree':
                    if (layoutManager.tv) {
                        return 100 / 20;
                    }
                    if (screenWidth >= 2100) {
                        return 100 / 14.28571428571;
                    }
                    if (screenWidth >= 1600) {
                        return 100 / 16.66666667;
                    }
                    if (screenWidth >= 1000) {
                        return 100 / 20;
                    }
                    if (screenWidth >= 700) {
                        return 100 / 25;
                    }
                    if (screenWidth >= 500) {
                        return 100 / 33.33333333;
                    }
                    return 2;
                case 'banner':
                    if (screenWidth >= 2200) {
                        return 100 / 25;
                    }
                    if (screenWidth >= 1200) {
                        return 100 / 33.33333333;
                    }
                    if (screenWidth >= 800) {
                        return 2;
                    }
                    return 1;
                case 'backdrop':
                    if (layoutManager.tv) {
                        return 100 / 25;
                    }
                    if (screenWidth >= 1920) {
                        return 100 / 16.66666667;
                    }
                    if (screenWidth >= 1520) {
                        return 5;
                    }
                    if (screenWidth >= 1200) {
                        return 4;
                    }
                    if (screenWidth >= 770) {
                        return 3;
                    }
                    if (screenWidth >= 420) {
                        return 2;
                    }
                    return 1;
                case 'smallBackdrop':
                    if (screenWidth >= 1600) {
                        return 100 / 12.5;
                    }
                    if (screenWidth >= 1400) {
                        return 100 / 14.2857142857;
                    }
                    if (screenWidth >= 1200) {
                        return 100 / 16.666666666666666666;
                    }
                    if (screenWidth >= 1000) {
                        return 5;
                    }
                    if (screenWidth >= 800) {
                        return 4;
                    }
                    if (screenWidth >= 500) {
                        return 100 / 33.33333333;
                    }
                    return 2;
                case 'overflowFourThree':
                    if (layoutManager.tv) {
                        return 100 / 18.8;
                    }
                    if (screenWidth >= 2100) {
                        return 100 / 13.3;
                    }
                    if (screenWidth >= 1600) {
                        return 100 / 15.5;
                    }
                    if (screenWidth >= 1200) {
                        return 100 / 18.4;
                    }
                    if (isOrientationLandscape) {
                        if (screenWidth >= 770) {
                            return 100 / 23.3;
                        }
                        return 100 / 31.2;
                    }
                    if (screenWidth >= 504) {
                        return 100 / 31.2;
                    }
                    return 100 / 40;
                case 'overflowSmallBackdrop':
                    if (layoutManager.tv) {
                        return 100 / 18.9;
                    }
                    if (isOrientationLandscape) {
                        if (screenWidth >= 800) {
                            return 100 / 15.5;
                        }
                        return 100 / 23.3;
                    } else {
                        if (screenWidth >= 540) {
                            return 100 / 30;
                        }
                        return 100 / 72;
                    }
                    break;
                case 'overflowSquare':
                case 'overflowPortrait':

                    if (layoutManager.tv) {
                        return 100 / 15.5;
                    }
                    if (screenWidth >= 2100) {
                        return 100 / 9.3;
                    }
                    if (screenWidth >= 1920) {
                        return 100 / 10.3;
                    }
                    if (screenWidth >= 1600) {
                        return 100 / 11.6;
                    }
                    if (screenWidth >= 1400) {
                        return 100 / 13.3;
                    }
                    if (screenWidth >= 1200) {
                        return 100 / 15.5;
                    }
                    if (screenWidth >= 800) {
                        return 100 / 18.4;
                    }

                    if (isOrientationLandscape) {
                        return 100 / 23.3;
                    } else {
                        return 100 / 40;
                    }
                    break;
                case 'overflowBackdrop':
                    if (layoutManager.tv) {
                        return 100 / 23.3;
                    }
                    if (isOrientationLandscape) {
                        if (screenWidth >= 1700) {
                            return 100 / 18.5;
                        }
                        return 100 / 23.3;
                    } else {
                        if (screenWidth >= 1800) {
                            return 100 / 23.5;
                        }
                        if (screenWidth >= 1400) {
                            return 100 / 30;
                        }
                        if (screenWidth >= 760) {
                            return 100 / 40;
                        }
                        if (screenWidth >= 640) {
                            return 100 / 56;
                        }
                        return 100 / 72;
                    }
                    break;
                default:
                    return 4;
            }
        }

        function isResizable(windowWidth) {

            var screen = window.screen;
            if (screen) {
                var screenWidth = screen.availWidth;

                if ((screenWidth - windowWidth) > 20) {
                    return true;
                }
            }

            return false;
        }

        function getImageWidth(shape, screenWidth, isOrientationLandscape) {

            //console.log(screenWidth);
            var imagesPerRow = getPostersPerRow(shape, screenWidth, isOrientationLandscape);
            //console.log(shape + '--' + imagesPerRow);

            var shapeWidth = screenWidth / imagesPerRow;

            return Math.round(shapeWidth);
        }

        function setCardData(items, options) {

            options.shape = options.shape || "auto";

            var primaryImageAspectRatio = imageLoader.getPrimaryImageAspectRatio(items);

            if (options.shape === 'auto' || options.shape === 'autohome' || options.shape === 'autooverflow' || options.shape === 'autoVertical') {

                var requestedShape = options.shape;
                options.shape = null;

                if (primaryImageAspectRatio) {

                    if (primaryImageAspectRatio >= 3) {
                        options.shape = 'banner';
                        options.coverImage = true;
                    } else if (primaryImageAspectRatio >= 1.4) {
                        options.shape = requestedShape === 'autooverflow' ? 'overflowBackdrop' : 'backdrop';
                    } else if (primaryImageAspectRatio > 1.2) {
                        options.shape = requestedShape === 'autooverflow' ? 'overflowFourThree' : 'fourThree';
                    } else if (primaryImageAspectRatio > 0.71) {
                        options.shape = requestedShape === 'autooverflow' ? 'overflowSquare' : 'square';
                    } else {
                        options.shape = requestedShape === 'autooverflow' ? 'overflowPortrait' : 'portrait';
                    }
                }

                if (!options.shape) {
                    options.shape = options.defaultShape || (requestedShape === 'autooverflow' ? 'overflowSquare' : 'square');
                }
            }

            if (options.preferThumb === 'auto') {
                options.preferThumb = options.shape === 'backdrop' || options.shape === 'overflowBackdrop';
            }

            options.uiAspect = getDesiredAspect(options.shape);
            options.primaryImageAspectRatio = primaryImageAspectRatio;

            if (!options.width && options.widths) {
                options.width = options.widths[options.shape];
            }

            if (options.rows && typeof (options.rows) !== 'number') {
                options.rows = options.rows[options.shape];
            }

            if (!options.width) {
                var screenWidth = dom.getWindowSize().innerWidth;
                var screenHeight = dom.getWindowSize().innerHeight;

                if (isResizable(screenWidth)) {
                    var roundScreenTo = 100;
                    screenWidth = Math.floor(screenWidth / roundScreenTo) * roundScreenTo;
                }

                options.width = getImageWidth(options.shape, screenWidth, screenWidth > (screenHeight * 1.3));
            }
        }

        function buildCardsHtmlInternal(items, options) {

            var isVertical;

            if (options.shape === 'autoVertical') {
                isVertical = true;
            }

            setCardData(items, options);

            var html = '';
            var itemsInRow = 0;

            var currentIndexValue;
            var hasOpenRow;
            var hasOpenSection;

            var sectionTitleTagName = options.sectionTitleTagName || 'div';
            var apiClient;
            var lastServerId;

            var i, length;

            for (i = 0, length = items.length; i < length; i++) {

                var item = items[i];
                var serverId = item.ServerId || options.serverId;

                if (serverId !== lastServerId) {
                    lastServerId = serverId;
                    apiClient = connectionManager.getApiClient(lastServerId);
                }

                if (options.rows && itemsInRow === 0) {

                    if (hasOpenRow) {
                        html += '</div>';
                        hasOpenRow = false;
                    }

                    html += '<div class="cardColumn">';
                    hasOpenRow = true;
                }

                html += buildCard(i, item, apiClient, options);

                itemsInRow++;

                if (options.rows && itemsInRow >= options.rows) {
                    html += '</div>';
                    hasOpenRow = false;
                    itemsInRow = 0;
                }
            }

            if (hasOpenRow) {
                html += '</div>';
            }

            if (hasOpenSection) {
                html += '</div>';

                if (isVertical) {
                    html += '</div>';
                }
            }

            var cardFooterHtml = '';
            for (i = 0, length = (options.lines || 0); i < length; i++) {

                if (i === 0) {
                    cardFooterHtml += '<div class="cardText cardTextCentered cardText-first">&nbsp;</div>';
                } else {
                    cardFooterHtml += '<div class="cardText cardTextCentered cardText-secondary">&nbsp;</div>';
                }
            }

            return html;
        }

        function getDesiredAspect(shape) {

            if (shape) {
                shape = shape.toLowerCase();
                if (shape.indexOf('portrait') !== -1) {
                    return (2 / 3);
                }
                if (shape.indexOf('backdrop') !== -1) {
                    return (16 / 9);
                }
                if (shape.indexOf('square') !== -1) {
                    return 1;
                }
                if (shape.indexOf('fourthree') !== -1) {
                    return (4 / 3);
                }
                if (shape.indexOf('banner') !== -1) {
                    return (1000 / 185);
                }
            }
            return null;
        }

        function getCardImageUrl(item, apiClient, options, shape) {

            var imageItem = item.ProgramInfo || item;
            item = imageItem;

            var width = options.width;
            var height = null;
            var primaryImageAspectRatio = item.PrimaryImageAspectRatio;
            var forceName = false;
            var imgUrl = null;
            var coverImage = false;
            var uiAspect = null;
            // .24 as opposed to .2 looks nice for nintendo 64
            var coverImageTolerance = 0.28;

            var imageTags = item.ImageTags;

            if (options.preferThumb && imageTags && imageTags.Thumb) {

                imgUrl = apiClient.getScaledImageUrl(item.Id, {
                    type: "Thumb",
                    maxWidth: width,
                    tag: imageTags.Thumb
                });

            } else if ((options.preferBanner || shape === 'banner') && imageTags && imageTags.Banner) {

                imgUrl = apiClient.getScaledImageUrl(item.Id, {
                    type: "Banner",
                    maxWidth: width,
                    tag: imageTags.Banner
                });

            } else if (options.preferDisc && imageTags && imageTags.Disc) {

                imgUrl = apiClient.getScaledImageUrl(item.Id, {
                    type: "Disc",
                    maxWidth: width,
                    tag: imageTags.Disc
                });

            } else if (options.preferLogo && imageTags && imageTags.Logo) {

                imgUrl = apiClient.getScaledImageUrl(item.Id, {
                    type: "Logo",
                    maxWidth: width,
                    tag: imageTags.Logo
                });

            } else if (options.preferLogo && item.ParentLogoImageTag && item.ParentLogoItemId) {

                imgUrl = apiClient.getScaledImageUrl(item.ParentLogoItemId, {
                    type: "Logo",
                    maxWidth: width,
                    tag: item.ParentLogoImageTag
                });

            } else if (options.preferThumb && item.SeriesThumbImageTag && options.inheritThumb !== false) {

                imgUrl = apiClient.getScaledImageUrl(item.SeriesId, {
                    type: "Thumb",
                    maxWidth: width,
                    tag: item.SeriesThumbImageTag
                });

            } else if (options.preferThumb && item.ParentThumbItemId && options.inheritThumb !== false && item.MediaType !== 'Photo') {

                imgUrl = apiClient.getScaledImageUrl(item.ParentThumbItemId, {
                    type: "Thumb",
                    maxWidth: width,
                    tag: item.ParentThumbImageTag
                });

            } else if (options.preferThumb && item.BackdropImageTags && item.BackdropImageTags.length) {

                imgUrl = apiClient.getScaledImageUrl(item.Id, {
                    type: "Backdrop",
                    maxWidth: width,
                    tag: item.BackdropImageTags[0]
                });

                forceName = true;

            } else if (options.preferThumb && item.ParentBackdropImageTags && item.ParentBackdropImageTags.length && options.inheritThumb !== false && item.Type === 'Episode') {

                imgUrl = apiClient.getScaledImageUrl(item.ParentBackdropItemId, {
                    type: "Backdrop",
                    maxWidth: width,
                    tag: item.ParentBackdropImageTags[0]
                });

            } else if (imageTags && imageTags.Primary) {

                height = width && primaryImageAspectRatio ? Math.round(width / primaryImageAspectRatio) : null;

                imgUrl = apiClient.getScaledImageUrl(item.Id, {
                    type: "Primary",
                    maxHeight: height,
                    maxWidth: width,
                    tag: imageTags.Primary
                });

                if (options.preferThumb && options.showTitle !== false) {
                    forceName = true;
                }

                if (primaryImageAspectRatio) {
                    uiAspect = getDesiredAspect(shape);
                    if (uiAspect) {
                        coverImage = (Math.abs(primaryImageAspectRatio - uiAspect) / uiAspect) <= coverImageTolerance;
                    }
                }

            } else if (item.PrimaryImageTag) {

                height = width && primaryImageAspectRatio ? Math.round(width / primaryImageAspectRatio) : null;

                imgUrl = apiClient.getScaledImageUrl(item.PrimaryImageItemId || item.Id || item.ItemId, {
                    type: "Primary",
                    maxHeight: height,
                    maxWidth: width,
                    tag: item.PrimaryImageTag
                });

                if (options.preferThumb && options.showTitle !== false) {
                    forceName = true;
                }

                if (primaryImageAspectRatio) {
                    uiAspect = getDesiredAspect(shape);
                    if (uiAspect) {
                        coverImage = (Math.abs(primaryImageAspectRatio - uiAspect) / uiAspect) <= coverImageTolerance;
                    }
                }
            }
            else if (item.ParentPrimaryImageTag) {

                imgUrl = apiClient.getScaledImageUrl(item.ParentPrimaryImageItemId, {
                    type: "Primary",
                    maxWidth: width,
                    tag: item.ParentPrimaryImageTag
                });
            }
            else if (item.SeriesPrimaryImageTag) {

                imgUrl = apiClient.getScaledImageUrl(item.SeriesId, {
                    type: "Primary",
                    maxWidth: width,
                    tag: item.SeriesPrimaryImageTag
                });
            }
            else if (item.AlbumId && item.AlbumPrimaryImageTag) {

                width = primaryImageAspectRatio ? Math.round(height * primaryImageAspectRatio) : null;

                imgUrl = apiClient.getScaledImageUrl(item.AlbumId, {
                    type: "Primary",
                    maxHeight: height,
                    maxWidth: width,
                    tag: item.AlbumPrimaryImageTag
                });

                if (primaryImageAspectRatio) {
                    uiAspect = getDesiredAspect(shape);
                    if (uiAspect) {
                        coverImage = (Math.abs(primaryImageAspectRatio - uiAspect) / uiAspect) <= coverImageTolerance;
                    }
                }
            }
            else if (item.Type === 'Season' && imageTags && imageTags.Thumb) {

                imgUrl = apiClient.getScaledImageUrl(item.Id, {
                    type: "Thumb",
                    maxWidth: width,
                    tag: imageTags.Thumb
                });

            }
            else if (item.BackdropImageTags && item.BackdropImageTags.length) {

                imgUrl = apiClient.getScaledImageUrl(item.Id, {
                    type: "Backdrop",
                    maxWidth: width,
                    tag: item.BackdropImageTags[0]
                });

            } else if (imageTags && imageTags.Thumb) {

                imgUrl = apiClient.getScaledImageUrl(item.Id, {
                    type: "Thumb",
                    maxWidth: width,
                    tag: imageTags.Thumb
                });

            } else if (item.SeriesThumbImageTag && options.inheritThumb !== false) {

                imgUrl = apiClient.getScaledImageUrl(item.SeriesId, {
                    type: "Thumb",
                    maxWidth: width,
                    tag: item.SeriesThumbImageTag
                });

            } else if (item.ParentThumbItemId && options.inheritThumb !== false) {

                imgUrl = apiClient.getScaledImageUrl(item.ParentThumbItemId, {
                    type: "Thumb",
                    maxWidth: width,
                    tag: item.ParentThumbImageTag
                });

            } else if (item.ParentBackdropImageTags && item.ParentBackdropImageTags.length && options.inheritThumb !== false) {

                imgUrl = apiClient.getScaledImageUrl(item.ParentBackdropItemId, {
                    type: "Backdrop",
                    maxWidth: width,
                    tag: item.ParentBackdropImageTags[0]
                });

            }

            return {
                imgUrl: imgUrl,
                forceName: forceName,
                coverImage: coverImage
            };
        }

        function getRandomInt(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }

        var numRandomColors = 5;
        function getDefaultColorIndex(str) {

            if (str) {
                var charIndex = Math.floor(str.length / 2);
                var character = String(str.substr(charIndex, 1).charCodeAt());
                var sum = 0;
                for (var i = 0; i < character.length; i++) {
                    sum += parseInt(character.charAt(i));
                }
                var index = String(sum).substr(-1);

                return (index % numRandomColors) + 1;
            } else {
                return getRandomInt(1, numRandomColors);
            }
        }

        function getCardTextLines(lines, cssClass, forceLines, isOuterFooter, cardLayout, addRightMargin, maxLines) {

            var html = '';

            var valid = 0;
            var i, length;
            var currentCssClass = cssClass;

            for (i = 0, length = lines.length; i < length; i++) {

                currentCssClass = cssClass;
                var text = lines[i];

                if (valid > 0 && isOuterFooter) {
                    currentCssClass += ' cardText-secondary';
                } else if (valid === 0 && isOuterFooter) {
                    currentCssClass += ' cardText-first';
                }

                if (addRightMargin) {
                    currentCssClass += ' cardText-rightmargin';
                }

                if (text) {
                    html += "<div class='" + currentCssClass + "'>";
                    html += text;
                    html += "</div>";
                    valid++;

                    if (maxLines && valid >= maxLines) {
                        break;
                    }
                }
            }

            if (forceLines) {

                length = maxLines || Math.min(lines.length, maxLines || lines.length);

                while (valid < length) {

                    currentCssClass = cssClass;
                    if (valid > 0 && isOuterFooter) {
                        currentCssClass += ' cardText-secondary';
                    }

                    html += "<div class='" + currentCssClass + "'>&nbsp;</div>";
                    valid++;
                }
            }

            return html;
        }

        function isUsingLiveTvNaming(itemType) {

            return itemType === 'Program' || itemType === 'Timer' || itemType === 'Recording';
        }

        function getAirTimeText(item, showAirDateTime, showAirEndTime) {

            var airTimeText = '';
            if (item.StartDate) {

                try {
                    var date = datetime.parseISO8601Date(item.StartDate);

                    if (showAirDateTime) {
                        airTimeText += datetime.toLocaleDateString(date, { weekday: 'short', month: 'short', day: 'numeric' }) + ' ';
                    }

                    airTimeText += datetime.getDisplayTime(date);

                    if (item.EndDate && showAirEndTime) {
                        date = datetime.parseISO8601Date(item.EndDate);
                        airTimeText += ' &ndash; ' + datetime.getDisplayTime(date);
                    }
                }
                catch (e) {
                    console.log("Error parsing date: " + item.StartDate);
                }
            }

            return airTimeText;
        }

        function getCardFooterText(item, apiClient, options, showTitle, forceName, overlayText, imgUrl, footerClass, progressHtml, logoUrl, isOuterFooter) {

            var itemType = item.Type;

            var html = '';

            if (logoUrl) {
                html += '<div class="lazy cardFooterLogo" data-src="' + logoUrl + '"></div>';
            }

            var showOtherText = isOuterFooter ? !overlayText : overlayText;

            if (isOuterFooter && options.cardLayout && layoutManager.mobile && options.cardFooterAside !== false) {

                html += '<button is="paper-icon-button-light" class="itemAction btnCardOptions cardText-secondary" data-action="menu"><i class="md-icon">&#xE5D3;</i></button>';
            }

            var cssClass = options.centerText ? "cardText cardTextCentered" : "cardText";

            var lines = [];
            var parentTitleUnderneath = itemType === 'MusicAlbum' || itemType === 'Audio' || itemType === 'MusicVideo' || itemType === 'Game';
            var titleAdded;

            var serverId = item.ServerId || options.serverId;

            if (showOtherText) {
                if ((options.showParentTitle || options.showParentTitleOrTitle) && !parentTitleUnderneath) {

                    if (isOuterFooter && itemType === 'Episode' && item.SeriesName) {

                        if (item.SeriesId) {
                            lines.push(getTextActionButton({
                                Id: item.SeriesId,
                                ServerId: serverId,
                                Name: item.SeriesName,
                                Type: 'Series',
                                IsFolder: true
                            }));
                        } else {
                            lines.push(dom.htmlEncode(item.SeriesName));
                        }
                    }
                    else {

                        if (isUsingLiveTvNaming(itemType)) {

                            lines.push(dom.htmlEncode(item.Name));

                            if (!item.EpisodeTitle) {
                                titleAdded = true;
                            }

                        } else {
                            var parentTitle = item.SeriesName || item.Series || item.Album || item.AlbumArtist || item.GameSystem || "";

                            if (parentTitle || showTitle) {
                                lines.push(dom.htmlEncode(parentTitle));
                            }
                        }
                    }
                }
            }

            var showMediaTitle = (showTitle && !titleAdded) || (options.showParentTitleOrTitle && !lines.length);
            if (!showMediaTitle && !titleAdded && (showTitle || forceName)) {
                showMediaTitle = true;
            }

            if (showMediaTitle) {

                var name = options.showTitle === 'auto' && !item.IsFolder && item.MediaType === 'Photo' ? '' : itemHelper.getDisplayName(item, {
                    includeParentInfo: options.includeParentInfoInTitle
                });

                lines.push(dom.htmlEncode(name));
            }

            if (showOtherText) {
                if (options.showParentTitle && parentTitleUnderneath) {

                    if (isOuterFooter && options.preferArtistTitle && item.ArtistItems && item.ArtistItems.length) {
                        item.ArtistItems[0].Type = 'MusicArtist';
                        item.ArtistItems[0].IsFolder = true;
                        lines.push(getTextActionButton(item.ArtistItems[0], null, serverId));
                    } else if (isOuterFooter && item.AlbumArtists && item.AlbumArtists.length) {
                        item.AlbumArtists[0].Type = 'MusicArtist';
                        item.AlbumArtists[0].IsFolder = true;
                        lines.push(getTextActionButton(item.AlbumArtists[0], null, serverId));
                    } else if (isOuterFooter && item.GameSystem && item.GameSystemId) {
                        lines.push(getTextActionButton({
                            Id: item.GameSystemId,
                            ServerId: serverId,
                            Name: item.GameSystem,
                            Type: 'GameSystem',
                            IsFolder: true
                        }));
                    } else {
                        lines.push(dom.htmlEncode(isUsingLiveTvNaming(itemType) ? item.Name : (item.SeriesName || item.Series || item.Album || item.AlbumArtist || item.GameSystem || "")));
                    }
                }

                if (options.textLines) {
                    var additionalLines = options.textLines(item);
                    for (var i = 0, length = additionalLines.length; i < length; i++) {
                        lines.push(additionalLines[i]);
                    }
                }

                if (options.showPremiereDate) {

                    if (item.PremiereDate) {
                        try {

                            lines.push(getPremiereDateText(item));

                        } catch (err) {
                            lines.push('');

                        }
                    } else {
                        lines.push('');
                    }
                }

                if (options.showYear) {

                    if (itemType === 'Series') {
                        if (item.Status === "Continuing") {

                            lines.push(globalize.translate('sharedcomponents#SeriesYearToPresent', item.ProductionYear || ''));

                        } else {

                            var endYear = item.EndDate ? datetime.parseISO8601Date(item.EndDate).getFullYear() : null;

                            if (endYear && item.ProductionYear && endYear !== item.ProductionYear) {
                                lines.push(item.ProductionYear + ' &ndash; ' + endYear);
                            } else {
                                lines.push(item.ProductionYear || '');
                            }
                        }
                    } else {
                        lines.push(item.ProductionYear || '');
                    }
                }

                if (options.showRuntime) {

                    if (item.RunTimeTicks) {

                        lines.push(datetime.getDisplayRunningTime(item.RunTimeTicks));
                    } else {
                        lines.push('');
                    }
                }

                if (options.showAirTime) {

                    lines.push(getAirTimeText(item, options.showAirDateTime, options.showAirEndTime) || '');
                }

                if (options.showChannelName) {

                    if (item.ChannelId) {

                        lines.push(getTextActionButton({

                            Id: item.ChannelId,
                            ServerId: serverId,
                            Name: item.ChannelName,
                            Type: 'TvChannel',
                            MediaType: item.MediaType,
                            IsFolder: false

                        }, item.ChannelName));
                    } else {
                        lines.push(item.ChannelName || '&nbsp;');
                    }
                }

                if (options.showCurrentProgram && itemType === 'TvChannel') {

                    if (item.CurrentProgram) {
                        lines.push(item.CurrentProgram.Name);
                    } else {
                        lines.push('');
                    }
                }

                if (options.showCurrentProgramTime && itemType === 'TvChannel') {

                    if (item.CurrentProgram) {
                        lines.push(getAirTimeText(item.CurrentProgram, false, true) || '');
                    } else {
                        lines.push('');
                    }
                }

                if (options.showSeriesTimerTime) {
                    if (item.RecordAnyTime) {

                        lines.push(globalize.translate('sharedcomponents#Anytime'));
                    } else {
                        lines.push(datetime.getDisplayTime(item.StartDate));
                    }
                }

                if (options.showSeriesTimerChannel) {
                    if (item.RecordAnyChannel) {
                        lines.push(globalize.translate('sharedcomponents#AllChannels'));
                    }
                    else {
                        lines.push(item.ChannelName || globalize.translate('sharedcomponents#OneChannel'));
                    }
                }

                if (options.showPersonRoleOrType) {
                    if (item.Role) {
                        lines.push(globalize.translate('sharedcomponents#ActorAsRole', item.Role));
                    }
                    else if (itemType) {
                        lines.push(globalize.translate('sharedcomponents#' + itemType));
                    } else {
                        lines.push('');
                    }
                }
            }

            if ((showTitle || !imgUrl) && forceName && overlayText && lines.length === 1) {
                lines = [];
            }

            var addRightTextMargin = isOuterFooter && options.cardLayout && !options.centerText && options.cardFooterAside !== 'none' && layoutManager.mobile;

            html += getCardTextLines(lines, cssClass, !options.overlayText, isOuterFooter, options.cardLayout, addRightTextMargin, options.lines);

            if (progressHtml) {
                html += progressHtml;
            }

            if (html) {

                if (!isOuterFooter || logoUrl || options.cardLayout) {
                    html = '<div class="' + footerClass + '">' + html;

                    //cardFooter
                    html += "</div>";
                }
            }

            return html;
        }

        function getTextActionButton(item, text, serverId) {

            if (!text) {
                text = itemHelper.getDisplayName(item);
            }

            if (layoutManager.tv) {
                return dom.htmlEncode(text);
            }

            var html = '<button ' + itemShortcuts.getShortcutAttributesHtml(item, serverId) + ' type="button" class="itemAction textActionButton" data-action="link">';
            html += dom.htmlEncode(text);
            html += '</button>';

            return html;
        }

        function getProgramIndicators(item) {

            item = item.ProgramInfo || item;

            var html = '';

            if (item.IsLive) {
                html += '<div class="liveTvProgram programAttributeIndicator">' + globalize.translate('sharedcomponents#Live') + '</div>';
            }

            if (item.IsPremiere) {
                html += '<div class="premiereTvProgram programAttributeIndicator">' + globalize.translate('sharedcomponents#Premiere') + '</div>';
            }
            else if (item.IsSeries && !item.IsRepeat) {
                html += '<div class="newTvProgram programAttributeIndicator">' + globalize.translate('sharedcomponents#AttributeNew') + '</div>';
            }
            //else if (item.IsRepeat) {
            //    html += '<div class="repeatTvProgram programAttributeIndicator">' + globalize.translate('sharedcomponents#Repeat') + '</div>';
            //}

            if (html) {
                html = '<div class="cardProgramAttributeIndicators">' + html;
                html += '</div>';
            }

            return html;
        }

        var refreshIndicatorLoaded;
        function requireRefreshIndicator() {

            if (!refreshIndicatorLoaded) {
                refreshIndicatorLoaded = true;
                require(['emby-itemrefreshindicator']);
            }
        }

        function getDefaultBackgroundClass(str) {
            return 'defaultCardBackground defaultCardBackground' + getDefaultColorIndex(str);
        }

        function buildCard(index, item, apiClient, options) {

            var itemType = item.Type;
            var action = options.action || 'link';

            if (action === 'play' && item.IsFolder) {
                // If this hard-coding is ever removed make sure to test nested photo albums
                action = 'link';
            }
            else if (item.MediaType === 'Photo') {
                action = 'play';
            }

            var shape = options.shape;

            if (shape === 'mixed') {

                shape = null;

                var primaryImageAspectRatio = item.PrimaryImageAspectRatio;

                if (primaryImageAspectRatio) {

                    if (primaryImageAspectRatio >= 1.33) {
                        shape = 'mixedBackdrop';
                    } else if (primaryImageAspectRatio > 0.71) {
                        shape = 'mixedSquare';
                    } else {
                        shape = 'mixedPortrait';
                    }
                }

                shape = shape || 'mixedSquare';
            }

            var className = 'card';

            if (shape) {
                className += ' ' + shape + 'Card';
            }

            if (options.cardCssClass) {
                className += ' ' + options.cardCssClass;
            }

            if (options.cardClass) {
                className += " " + options.cardClass;
            }

            var isLayoutTv = layoutManager.tv;
            var isLayoutDesktop = layoutManager.desktop;
            var isLayoutMobile = layoutManager.mobile;

            if (isLayoutDesktop) {
                className += ' card-hoverable';
            }

            if (!enableFocusTransfrom || !isLayoutTv) {
                className += ' card-nofocustransform';
            }

            var imgInfo = getCardImageUrl(item, apiClient, options, shape);
            var imgUrl = imgInfo.imgUrl;

            var forceName = imgInfo.forceName;

            var showTitle = options.showTitle === 'auto' ? true : (options.showTitle || itemType === 'PhotoAlbum' || itemType === 'Folder');
            var overlayText = options.overlayText;

            if (forceName && !options.cardLayout) {

                if (overlayText == null) {
                    overlayText = true;
                }
            }

            var cardImageContainerClass = 'cardImageContainer';
            var coveredImage = options.coverImage || imgInfo.coverImage;

            if (coveredImage) {
                cardImageContainerClass += ' coveredImage';

                if (item.MediaType === 'Photo' || itemType === 'PhotoAlbum' || itemType === 'Folder' || itemType === 'Program' || itemType === 'Recording' || itemType === 'TvChannel') {
                    cardImageContainerClass += ' coveredImage-noScale';
                }
            }

            if (options.defaultBackground) {
                cardImageContainerClass += ' defaultCardBackground defaultCardBackground0';
            }
            else if (!imgUrl) {
                cardImageContainerClass += ' ' + getDefaultBackgroundClass(item.Name);
            }

            var cardBoxClass = options.cardLayout ? 'cardBox visualCardBox' : 'cardBox';

            if (isLayoutTv) {

                if (enableFocusTransfrom) {
                    cardBoxClass += ' cardBox-focustransform cardBox-withfocuscontent';
                } else {
                    cardBoxClass += ' cardBox-withfocuscontent-large';
                }

                if (options.cardLayout) {
                    cardBoxClass += ' card-focuscontent';

                    if (!enableFocusTransfrom) {
                        cardBoxClass += ' card-focuscontent-large';
                    }
                }
            }

            var footerCssClass;
            var progressHtml = indicators.getProgressBarHtml(item);

            var innerCardFooter = '';

            var footerOverlayed = false;

            var logoUrl;
            var logoHeight = 40;

            if (options.showChannelLogo && item.ChannelPrimaryImageTag) {
                logoUrl = apiClient.getScaledImageUrl(item.ChannelId, {
                    type: "Primary",
                    height: logoHeight,
                    tag: item.ChannelPrimaryImageTag
                });
            }
            else if (options.showLogo && item.ParentLogoImageTag) {
                logoUrl = apiClient.getScaledImageUrl(item.ParentLogoItemId, {
                    type: "Logo",
                    height: logoHeight,
                    tag: item.ParentLogoImageTag
                });
            }

            if (overlayText) {

                logoUrl = null;

                footerCssClass = progressHtml ? 'innerCardFooter fullInnerCardFooter' : 'innerCardFooter';
                innerCardFooter += getCardFooterText(item, apiClient, options, showTitle, forceName, overlayText, imgUrl, footerCssClass, progressHtml, logoUrl, false);
                footerOverlayed = true;
            }
            else if (progressHtml) {
                innerCardFooter += '<div class="innerCardFooter fullInnerCardFooter innerCardFooterClear">';
                innerCardFooter += progressHtml;
                innerCardFooter += '</div>';

                progressHtml = '';
            }

            var outerCardFooter = '';
            if (!overlayText && !footerOverlayed) {
                footerCssClass = options.cardLayout ? 'cardFooter' : 'cardFooter cardFooter-transparent';

                if (logoUrl) {
                    footerCssClass += ' cardFooter-withlogo';
                }

                if (!options.cardLayout) {
                    logoUrl = null;
                }

                outerCardFooter = getCardFooterText(item, apiClient, options, showTitle, forceName, overlayText, imgUrl, footerCssClass, progressHtml, logoUrl, true);
            }

            if (outerCardFooter && !options.cardLayout /*&& options.allowBottomPadding !== false*/) {
                cardBoxClass += ' cardBox-bottompadded';
            }

            var overlayButtons = '';
            if (isLayoutMobile) {

                //var overlayPlayButton = options.overlayPlayButton;

                //if (overlayPlayButton == null && !options.overlayMoreButton && !options.overlayInfoButton && !options.cardLayout) {
                //    overlayPlayButton = item.MediaType === 'Video';
                //}

                var btnCssClass = 'cardOverlayButton cardOverlayButton-br itemAction';

                if (options.centerPlayButton) {
                    overlayButtons += '<button is="paper-icon-button-light" class="' + btnCssClass + ' cardOverlayButton-centered" data-action="play"><i class="md-icon cardOverlayButtonIcon">&#xE037;</i></button>';
                }

                //if (overlayPlayButton && !item.IsPlaceHolder && (item.LocationType !== 'Virtual' || !item.MediaType || itemType === 'Program') && itemType !== 'Person') {
                //    overlayButtons += '<button is="paper-icon-button-light" class="' + btnCssClass + '" data-action="play"><i class="md-icon cardOverlayButtonIcon">&#xE037;</i></button>';
                //}

                //if (options.overlayMoreButton) {

                //    overlayButtons += '<button is="paper-icon-button-light" class="' + btnCssClass + '" data-action="menu"><i class="md-icon cardOverlayButtonIcon">&#xE5D3;</i></button>';
                //}
            }

            if (options.showChildCountIndicator && item.ChildCount) {
                className += ' groupedCard';
            }

            // cardBox can be it's own separate element if an outer footer is ever needed
            var cardImageContainerOpen;
            var cardImageContainerClose = '';
            var cardBoxClose = '';
            var cardScalableClose = '';

            var cardContentClass = 'cardContent';
            if (!options.cardLayout) {
                cardContentClass += ' cardContent-shadow';
            }

            if (isLayoutTv) {

                // Don't use the IMG tag with safari because it puts a white border around it
                cardImageContainerOpen = imgUrl ? ('<div class="' + cardImageContainerClass + ' ' + cardContentClass + ' lazy" data-src="' + imgUrl + '">') : ('<div class="' + cardImageContainerClass + ' ' + cardContentClass + '">');

                cardImageContainerClose = '</div>';
            } else {

                if (isLayoutMobile) {
                    className += ' card-touchzoom';
                }

                // Don't use the IMG tag with safari because it puts a white border around it
                cardImageContainerOpen = imgUrl ? ('<button data-action="' + action + '" class="cardContent-button ' + cardImageContainerClass + ' ' + cardContentClass + ' itemAction lazy" data-src="' + imgUrl + '">') : ('<button data-action="' + action + '" class="cardContent-button ' + cardImageContainerClass + ' ' + cardContentClass + ' itemAction">');

                cardImageContainerClose = '</button>';
            }

            var cardScalableClass = 'cardScalable';

            if (isLayoutTv && !options.cardLayout) {

                cardScalableClass += ' card-focuscontent';

                if (!enableFocusTransfrom) {
                    cardScalableClass += ' card-focuscontent-large';
                }
            }

            cardImageContainerOpen = '<div class="' + cardBoxClass + '"><div class="' + cardScalableClass + '"><div class="cardPadder-' + shape + '"></div>' + cardImageContainerOpen;
            cardBoxClose = '</div>';
            cardScalableClose = '</div>';

            cardImageContainerOpen += indicators.getTypeIndicator(item);

            var indicatorsHtml = '';

            if (options.missingIndicator !== false) {
                indicatorsHtml += indicators.getMissingIndicator(item);
            }

            indicatorsHtml += indicators.getSyncIndicator(item);
            indicatorsHtml += indicators.getTimerIndicator(item);

            indicatorsHtml += indicators.getPlayedIndicatorHtml(item);

            if (itemType === 'CollectionFolder' || item.CollectionType) {
                var refreshClass = item.RefreshProgress || (item.RefreshStatus && virtualFolder.item !== 'Idle') ? '' : ' class="hide"';
                indicatorsHtml += '<div is="emby-itemrefreshindicator"' + refreshClass + ' data-progress="' + (item.RefreshProgress || 0) + '" data-status="' + item.RefreshStatus + '"></div>';
                requireRefreshIndicator();
            }

            if (indicatorsHtml) {
                cardImageContainerOpen += '<div class="cardIndicators">' + indicatorsHtml + '</div>';
            }

            //if (itemType === 'Program' || itemType === 'Timer') {
            //    cardImageContainerOpen += getProgramIndicators(item);
            //}

            if (!imgUrl) {
                cardImageContainerOpen += getCardDefaultText(item, options);
            }

            var tagName = (isLayoutTv) && !overlayButtons ? 'button' : 'div';

            var nameWithPrefix = (item.SortName || item.Name || '');
            var prefix = nameWithPrefix.substring(0, Math.min(3, nameWithPrefix.length));

            if (prefix) {
                prefix = prefix.toUpperCase();
            }

            var timerAttributes = '';
            if (item.TimerId) {
                timerAttributes += ' data-timerid="' + item.TimerId + '"';
            }
            if (item.SeriesTimerId) {
                timerAttributes += ' data-seriestimerid="' + item.SeriesTimerId + '"';
            }

            var actionAttribute;

            if (tagName === 'button') {
                className += " itemAction";
                actionAttribute = ' data-action="' + action + '"';
            } else {
                actionAttribute = '';
            }

            if (itemType !== 'MusicAlbum' && itemType !== 'MusicArtist' && itemType !== 'Audio') {
                className += ' card-withuserdata';
            }

            var positionTicksData = item.UserData && item.UserData.PlaybackPositionTicks ? (' data-positionticks="' + item.UserData.PlaybackPositionTicks + '"') : '';
            var collectionIdData = options.collectionId ? (' data-collectionid="' + options.collectionId + '"') : '';
            var playlistIdData = options.playlistId ? (' data-playlistid="' + options.playlistId + '"') : '';
            var mediaTypeData = item.MediaType ? (' data-mediatype="' + item.MediaType + '"') : '';
            var collectionTypeData = item.CollectionType ? (' data-collectiontype="' + item.CollectionType + '"') : '';
            var channelIdData = item.ChannelId ? (' data-channelid="' + item.ChannelId + '"') : '';
            var contextData = options.context ? (' data-context="' + options.context + '"') : '';
            var parentIdData = options.parentId ? (' data-parentid="' + options.parentId + '"') : '';

            var additionalCardContent = '';

            if (isLayoutDesktop) {
                additionalCardContent += getHoverMenuHtml(item, action, options);
            }

            return '<' + tagName + ' data-index="' + index + '"' + timerAttributes + actionAttribute + ' data-isfolder="' + (item.IsFolder || false) + '" data-serverid="' + (item.ServerId || options.serverId) + '" data-id="' + (item.Id || item.ItemId) + '" data-type="' + itemType + '"' + mediaTypeData + collectionTypeData + channelIdData + positionTicksData + collectionIdData + playlistIdData + contextData + parentIdData + ' data-prefix="' + prefix + '" class="' + className + '">' + cardImageContainerOpen + innerCardFooter + cardImageContainerClose + overlayButtons + additionalCardContent + cardScalableClose + outerCardFooter + cardBoxClose + '</' + tagName + '>';
        }

        function getHoverMenuHtml(item, action, options) {

            var html = '';

            html += '<div class="cardOverlayContainer itemAction" data-action="' + action + '">';

            var btnCssClass = 'cardOverlayButton cardOverlayButton-hover itemAction';

            var serverId = item.ServerId || options.serverId;
            var itemType = item.Type;
            var itemId = item.Id;

            if (playbackManager.canPlay(item) && options.hoverPlayButton !== false) {

                html += '<button is="paper-icon-button-light" class="' + btnCssClass + ' cardOverlayFab-primary" data-action="resume"><i class="md-icon cardOverlayButtonIcon">&#xE037;</i></button>';
            }

            html += '<div class="cardOverlayButton-br">';

            //if (itemHelper.canEdit({ Policy: { IsAdministrator: true } }, item)) {

            //    //require(['emby-playstatebutton']);
            //    html += '<button is="paper-icon-button-light" class="' + btnCssClass + '" data-action="edit"><i class="md-icon cardOverlayButtonIcon cardOverlayButtonIcon-hover">&#xE254;</i></button>';
            //}

            var userData = item.UserData || {};

            if (itemHelper.canMarkPlayed(item)) {

                require(['emby-playstatebutton']);
                html += '<button is="emby-playstatebutton" type="button" data-action="none" class="' + btnCssClass + '" data-id="' + itemId + '" data-serverid="' + serverId + '" data-itemtype="' + itemType + '" data-played="' + (userData.Played) + '"><i class="md-icon cardOverlayButtonIcon cardOverlayButtonIcon-hover">&#xE5CA;</i></button>';
            }

            if (itemHelper.canRate(item)) {

                var likes = userData.Likes == null ? '' : userData.Likes;

                require(['emby-ratingbutton']);
                html += '<button is="emby-ratingbutton" type="button" data-action="none" class="' + btnCssClass + '" data-id="' + itemId + '" data-serverid="' + serverId + '" data-itemtype="' + itemType + '" data-likes="' + likes + '" data-isfavorite="' + (userData.IsFavorite) + '"><i class="md-icon cardOverlayButtonIcon cardOverlayButtonIcon-hover">&#xE87D;</i></button>';
            }

            html += '<button is="paper-icon-button-light" class="' + btnCssClass + '" data-action="menu"><i class="md-icon cardOverlayButtonIcon cardOverlayButtonIcon-hover">&#xE5D3;</i></button>';

            html += '</div>';
            html += '</div>';

            return html;
        }

        function getCardDefaultText(item, options) {

            var itemType = item.Type;

            var collectionType = item.CollectionType;
            if (collectionType === 'livetv') {
                return '<i class="cardImageIcon md-icon">&#xE1B2;</i>';
            }
            if (collectionType === 'playlists') {
                return '<i class="cardImageIcon md-icon">&#xE5D2;</i>';
            }
            if (collectionType === 'games') {
                return '<i class="cardImageIcon md-icon">&#xe30f;</i>';
            }
            if (collectionType === 'homevideos' || collectionType === 'photos') {
                return '<i class="cardImageIcon md-icon">&#xE412;</i>';
            }
            if (collectionType === 'music') {
                return '<i class="cardImageIcon md-icon">&#xE310;</i>';
            }
            if (itemType === 'MusicAlbum') {
                return '<i class="cardImageIcon md-icon">&#xE019;</i>';
            }
            if (itemType === 'MusicArtist' || itemType === 'Person') {
                return '<i class="cardImageIcon md-icon">&#xE7FD;</i>';
            }
            if (itemType === 'Channel') {
                return '<i class="cardImageIcon md-icon">&#xE2C7;</i>';
            }
            if (options.defaultCardImageIcon) {
                return '<i class="cardImageIcon md-icon">' + options.defaultCardImageIcon + '</i>';
            }

            var defaultName = isUsingLiveTvNaming(itemType) ? item.Name : itemHelper.getDisplayName(item);
            return '<div class="cardText cardDefaultText">' + defaultName + '</div>';
        }

        function buildCards(items, options) {

            // Abort if the container has been disposed
            if (!document.body.contains(options.itemsContainer)) {
                return;
            }

            if (options.parentContainer) {
                if (items.length) {
                    options.parentContainer.classList.remove('hide');
                } else {
                    options.parentContainer.classList.add('hide');
                    return;
                }
            }

            var html = buildCardsHtmlInternal(items, options);

            if (html) {

                if (options.itemsContainer.cardBuilderHtml !== html) {
                    options.itemsContainer.innerHTML = html;

                    if (items.length < 50) {
                        options.itemsContainer.cardBuilderHtml = html;
                    } else {
                        options.itemsContainer.cardBuilderHtml = null;
                    }
                }

                imageLoader.lazyChildren(options.itemsContainer);
            } else {

                options.itemsContainer.innerHTML = html;
                options.itemsContainer.cardBuilderHtml = null;
            }

            if (options.autoFocus) {
                focusManager.autoFocus(options.itemsContainer, true);
            }
        }

        function ensureIndicators(card, indicatorsElem) {

            if (indicatorsElem) {
                return indicatorsElem;
            }

            indicatorsElem = card.querySelector('.cardIndicators');

            if (!indicatorsElem) {

                var cardImageContainer = card.querySelector('.cardImageContainer');
                indicatorsElem = document.createElement('div');
                indicatorsElem.classList.add('cardIndicators');
                cardImageContainer.appendChild(indicatorsElem);
            }

            return indicatorsElem;
        }

        function updateUserData(card, userData) {

            var type = card.getAttribute('data-type');
            var enableCountIndicator = type === 'Series' || type === 'BoxSet' || type === 'Season';
            var indicatorsElem = null;
            var playedIndicator = null;
            var countIndicator = null;
            var itemProgressBar = null;

            if (userData.Played) {

                playedIndicator = card.querySelector('.playedIndicator');

                if (!playedIndicator) {

                    playedIndicator = document.createElement('div');
                    playedIndicator.classList.add('playedIndicator');
                    playedIndicator.classList.add('indicator');
                    indicatorsElem = ensureIndicators(card, indicatorsElem);
                    indicatorsElem.appendChild(playedIndicator);
                }
                playedIndicator.innerHTML = '<i class="md-icon indicatorIcon">&#xE5CA;</i>';
            } else {

                playedIndicator = card.querySelector('.playedIndicator');
                if (playedIndicator) {

                    playedIndicator.parentNode.removeChild(playedIndicator);
                }
            }
            if (userData.UnplayedItemCount) {
                countIndicator = card.querySelector('.countIndicator');

                if (!countIndicator) {

                    countIndicator = document.createElement('div');
                    countIndicator.classList.add('countIndicator');
                    indicatorsElem = ensureIndicators(card, indicatorsElem);
                    indicatorsElem.appendChild(countIndicator);
                }
                countIndicator.innerHTML = userData.UnplayedItemCount;
            } else if (enableCountIndicator) {

                countIndicator = card.querySelector('.countIndicator');
                if (countIndicator) {

                    countIndicator.parentNode.removeChild(countIndicator);
                }
            }

            var progressHtml = indicators.getProgressBarHtml({
                Type: type,
                UserData: userData,
                MediaType: 'Video'
            });

            if (progressHtml) {

                itemProgressBar = card.querySelector('.itemProgressBar');

                if (!itemProgressBar) {
                    itemProgressBar = document.createElement('div');
                    itemProgressBar.classList.add('itemProgressBar');

                    var innerCardFooter = card.querySelector('.innerCardFooter');
                    if (!innerCardFooter) {
                        innerCardFooter = document.createElement('div');
                        innerCardFooter.classList.add('innerCardFooter');
                        var cardImageContainer = card.querySelector('.cardImageContainer');
                        cardImageContainer.appendChild(innerCardFooter);
                    }
                    innerCardFooter.appendChild(itemProgressBar);
                }

                itemProgressBar.innerHTML = progressHtml;
            }
            else {

                itemProgressBar = card.querySelector('.itemProgressBar');
                if (itemProgressBar) {
                    itemProgressBar.parentNode.removeChild(itemProgressBar);
                }
            }
        }

        function onUserDataChanged(userData, scope) {

            var cards = (scope || document.body).querySelectorAll('.card-withuserdata[data-id="' + userData.ItemId + '"]');

            for (var i = 0, length = cards.length; i < length; i++) {
                updateUserData(cards[i], userData);
            }
        }

        function onTimerCreated(programId, newTimerId, itemsContainer) {

            var cells = itemsContainer.querySelectorAll('.card[data-id="' + programId + '"]');

            for (var i = 0, length = cells.length; i < length; i++) {
                var cell = cells[i];
                var icon = cell.querySelector('.timerIndicator');
                if (!icon) {
                    var indicatorsElem = ensureIndicators(cell);
                    indicatorsElem.insertAdjacentHTML('beforeend', '<i class="md-icon timerIndicator indicatorIcon">&#xE061;</i>');
                }
                cell.setAttribute('data-timerid', newTimerId);
            }
        }

        function onTimerCancelled(id, itemsContainer) {

            var cells = itemsContainer.querySelectorAll('.card[data-timerid="' + id + '"]');

            for (var i = 0, length = cells.length; i < length; i++) {
                var cell = cells[i];
                var icon = cell.querySelector('.timerIndicator');
                if (icon) {
                    icon.parentNode.removeChild(icon);
                }
                cell.removeAttribute('data-timerid');
            }
        }

        function onSeriesTimerCancelled(id, itemsContainer) {

            var cells = itemsContainer.querySelectorAll('.card[data-seriestimerid="' + id + '"]');

            for (var i = 0, length = cells.length; i < length; i++) {
                var cell = cells[i];
                var icon = cell.querySelector('.timerIndicator');
                if (icon) {
                    icon.parentNode.removeChild(icon);
                }
                cell.removeAttribute('data-seriestimerid');
            }
        }

        return {
            getCardsHtml: getCardsHtml,
            buildCards: buildCards,
            onUserDataChanged: onUserDataChanged,
            onTimerCreated: onTimerCreated,
            onTimerCancelled: onTimerCancelled,
            onSeriesTimerCancelled: onSeriesTimerCancelled
        };
    });