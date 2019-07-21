define(['datetime', 'imageLoader', 'connectionManager', 'layoutManager', 'browser', 'cardBuilder'], function (datetime, imageLoader, connectionManager, layoutManager, browser, cardBuilder) {
    'use strict';

    function setChapterProperties(item, chapter, index, options, apiClient) {

        chapter.ImageUrl = getImgUrl(item, chapter, index, options.width || 400, apiClient);

        chapter.Id = item.Id;
        chapter.Type = item.Type;
        chapter.ServerId = item.ServerId;
        chapter.MediaType = item.MediaType;
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

        var apiClient = connectionManager.getApiClient(item.ServerId);

        var mediaStreams = ((item.MediaSources || [])[0] || {}).MediaStreams || [];
        var videoStream = mediaStreams.filter(function (i) {
            return i.Type === 'Video';
        })[0] || {};

        var aspect = null;

        if (videoStream.Width && videoStream.Height) {

            aspect = videoStream.Width / videoStream.Height;
        }

        for (var i = 0, length = chapters.length; i < length; i++) {

            chapters[i].PrimaryImageAspectRatio = aspect;

            setChapterProperties(item, chapters[i], i, options, apiClient);
        }

        options.itemsContainer.innerHTML = cardBuilder.getCardsHtml(chapters, {

            shape: 'autooverflow',
            centerText: true,
            overlayText: false,
            showTitle: true,
            showChapterTime: true,
            multiSelect: false,
            overlayMoreButton: false,
            playedButton: false,
            ratingButton: false,
            moreButton: false,
            centerPlayButton: true
        });

        imageLoader.lazyChildren(options.itemsContainer);
    }

    return {
        buildChapterCards: buildChapterCards
    };

});