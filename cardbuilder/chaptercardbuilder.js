define(['datetime', 'imageLoader', 'connectionManager', 'layoutManager', 'browser'], function (datetime, imageLoader, connectionManager, layoutManager, browser) {
    'use strict';

    function buildChapterCardsHtml(item, chapters, options) {

        var className = 'card itemAction chapterCard';

        if (layoutManager.tv && (browser.animate || browser.edge)) {
            className += ' card-focusscale';
        }

        var mediaStreams = ((item.MediaSources || [])[0] || {}).MediaStreams || [];
        var videoStream = mediaStreams.filter(function (i) {
            return i.Type === 'Video';
        })[0] || {};

        var shape = (options.backdropShape || 'overflowBackdrop');

        if (videoStream.Width && videoStream.Height) {

            if ((videoStream.Width / videoStream.Height) <= 1.2) {
                shape = (options.squareShape || 'overflowSquare');
            }
            else if ((videoStream.Width / videoStream.Height) <= 1.4) {
                shape = 'overflowFourThree';
            }
        }

        className += ' ' + shape + 'Card';

        if (options.block || options.rows) {
            className += ' block';
        }

        var html = '';
        var itemsInRow = 0;

        var apiClient = connectionManager.getApiClient(item.ServerId);

        for (var i = 0, length = chapters.length; i < length; i++) {

            if (options.rows && itemsInRow === 0) {
                html += '<div class="cardColumn">';
            }

            var chapter = chapters[i];

            html += buildChapterCard(item, apiClient, chapter, i, options, className, shape);
            itemsInRow++;

            if (options.rows && itemsInRow >= options.rows) {
                itemsInRow = 0;
                html += '</div>';
            }
        }

        return html;
    }

    function getImgUrl(item, chapter, index, maxWidth, apiClient) {

        if (chapter.ImageTag) {

            return apiClient.getScaledImageUrl(item.Id, {

                maxWidth: maxWidth,
                tag: chapter.ImageTag,
                type: "Chapter",
                index: index
            });
        }

        return null;
    }

    function buildChapterCard(item, apiClient, chapter, index, options, className, shape) {

        var imgUrl = getImgUrl(item, chapter, index, options.width || 400, apiClient);

        var cardImageContainerClass = 'cardContent cardContent-shadow cardImageContainer chapterCardImageContainer';
        if (options.coverImage) {
            cardImageContainerClass += ' coveredImage';
        }
        var dataAttributes = ' data-action="play" data-isfolder="' + item.IsFolder + '" data-id="' + item.Id + '" data-serverid="' + item.ServerId + '" data-type="' + item.Type + '" data-mediatype="' + item.MediaType + '" data-positionticks="' + chapter.StartPositionTicks + '"';
        var cardImageContainer = imgUrl ? ('<div class="' + cardImageContainerClass + ' lazy" loading="lazy" style="background-image:url(' + imgUrl + ');">') : ('<div class="' + cardImageContainerClass + '">');

        if (!imgUrl) {
            cardImageContainer += '<i class="md-icon cardImageIcon">&#xE54D;</i>';
        }

        var cardBoxCssClass = 'cardBox';
        var cardScalableClass = 'cardScalable';

        if (layoutManager.tv) {
            var enableFocusTransfrom = !browser.slow && !browser.edge;

            cardScalableClass += ' card-focuscontent';

            if (enableFocusTransfrom) {
                cardBoxCssClass += ' cardBox-focustransform cardBox-withfocuscontent';
            } else {
                cardBoxCssClass += ' cardBox-withfocuscontent-large';
                cardScalableClass += ' card-focuscontent-large';
            }
        }

        var html = '<button type="button" class="' + className + '"' + dataAttributes + '><div class="' + cardBoxCssClass + '"><div class="' + cardScalableClass + '"><div class="cardPadder-' + shape + '"></div>' + cardImageContainer + '</div></div>';

        html += '<div class="cardText cardTextCentered cardText-first">' + chapter.Name + '</div>';
        html += '<div class="cardText cardTextCentered cardText-secondary">' + datetime.getDisplayRunningTime(chapter.StartPositionTicks) + '</div>';

        html += '</div></button>';

        return html;
    }

    function buildChapterCards(item, chapters, options) {

        if (options.parentContainer) {
            // Abort if the container has been disposed
            if (!document.body.contains(options.parentContainer)) {
                return;
            }

            if (chapters.length) {
                options.parentContainer.classList.remove('hide');
            } else {
                options.parentContainer.classList.add('hide');
                return;
            }
        }

        var html = buildChapterCardsHtml(item, chapters, options);

        options.itemsContainer.innerHTML = html;

        imageLoader.lazyChildren(options.itemsContainer);
    }

    return {
        buildChapterCards: buildChapterCards
    };

});