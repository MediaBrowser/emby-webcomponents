define(['layoutManager', 'globalize', 'require', 'events', 'connectionManager', 'cardBuilder', 'embyRouter', 'emby-scroller', 'emby-itemscontainer'], function (layoutManager, globalize, require, events, connectionManager, cardBuilder, embyRouter) {
    'use strict';

    function loadSuggestions(instance, context, apiClient) {

        var options = {

            SortBy: "IsFavoriteOrLiked,Random",
            IncludeItemTypes: "Movie,Series,MusicArtist",
            Limit: 20,
            Recursive: true,
            ImageTypeLimit: 0,
            EnableImages: false,
            ParentId: instance.options.parentId
        };

        apiClient.getItems(apiClient.getCurrentUserId(), options).then(function (result) {

            var html = result.Items.map(function (i) {

                var href = embyRouter.getRouteUrl(i);

                var itemHtml = '<div><a style="display:inline-block;padding:.55em 1em;" href="' + href + '">';
                itemHtml += i.Name;
                itemHtml += '</a></div>';
                return itemHtml;

            }).join('');

            var searchSuggestions = context.querySelector('.searchSuggestions');
            searchSuggestions.querySelector('.searchSuggestionsList').innerHTML = html;
            searchSuggestions.classList.remove('hide');
        });
    }

    function getSearchHints(instance, apiClient, query) {

        if (!query.searchTerm) {
            return Promise.resolve({
                SearchHints: []
            });
        }

        var allowSearch = true;

        var queryIncludeItemTypes = query.IncludeItemTypes;

        if (instance.options.collectionType === 'tvshows') {
            if (query.IncludeArtists) {
                allowSearch = false;
            }
            else if (queryIncludeItemTypes === 'Movie' ||
                queryIncludeItemTypes === 'LiveTvProgram' ||
                queryIncludeItemTypes === 'MusicAlbum' ||
                queryIncludeItemTypes === 'Audio' ||
                queryIncludeItemTypes === 'Book' ||
                queryIncludeItemTypes === 'AudioBook') {
                allowSearch = false;
            }
        }
        else if (instance.options.collectionType === 'movies') {
            if (query.IncludeArtists) {
                allowSearch = false;
            }
            else if (queryIncludeItemTypes === 'Series' ||
                queryIncludeItemTypes === 'Episode' ||
                queryIncludeItemTypes === 'LiveTvProgram' ||
                queryIncludeItemTypes === 'MusicAlbum' ||
                queryIncludeItemTypes === 'Audio' ||
                queryIncludeItemTypes === 'Book' ||
                queryIncludeItemTypes === 'AudioBook') {
                allowSearch = false;
            }
        }
        else if (instance.options.collectionType === 'music') {
            if (query.People) {
                allowSearch = false;
            }
            else if (queryIncludeItemTypes === 'Series' ||
                queryIncludeItemTypes === 'Episode' ||
                queryIncludeItemTypes === 'LiveTvProgram' ||
                queryIncludeItemTypes === 'Movie') {
                allowSearch = false;
            }
        }
        else if (instance.options.collectionType === 'livetv') {
            if (query.IncludeArtists || query.IncludePeople) {
                allowSearch = false;
            }
            else if (queryIncludeItemTypes === 'Series' ||
                queryIncludeItemTypes === 'Episode' ||
                queryIncludeItemTypes === 'MusicAlbum' ||
                queryIncludeItemTypes === 'Audio' ||
                queryIncludeItemTypes === 'Book' ||
                queryIncludeItemTypes === 'AudioBook' ||
                queryIncludeItemTypes === 'Movie') {
                allowSearch = false;
            }
        }
        if (queryIncludeItemTypes === 'NullType') {
            allowSearch = false;
        }

        if (!allowSearch) {
            return Promise.resolve({
                SearchHints: []
            });
        }

        return apiClient.getSearchHints(query);
    }

    function search(instance, apiClient, context, value) {

        if (value || layoutManager.tv) {
            context.querySelector('.searchSuggestions').classList.add('hide');
        } else {
            loadSuggestions(instance, context, apiClient);
        }

        if (instance.options.collectionType === 'livetv') {

            searchType(instance, apiClient, {
                searchTerm: value,
                IncludePeople: false,
                IncludeMedia: true,
                IncludeGenres: false,
                IncludeStudios: false,
                IncludeArtists: false,
                IncludeItemTypes: "LiveTvProgram",
                IsMovie: true,
                IsKids: false

            }, context, '.movieResults', {

                preferThumb: true,
                inheritThumb: false,
                shape: (enableScrollX() ? 'overflowPortrait' : 'portrait'),
                showParentTitleOrTitle: true,
                showTitle: false,
                centerText: true,
                coverImage: true,
                overlayText: false,
                overlayMoreButton: true,
                showAirTime: true,
                showAirDateTime: true,
                showChannelName: true
            });
        } else {

            searchType(instance, apiClient, {
                searchTerm: value,
                IncludePeople: false,
                IncludeMedia: true,
                IncludeGenres: false,
                IncludeStudios: false,
                IncludeArtists: false,
                IncludeItemTypes: "Movie"

            }, context, '.movieResults', {

                showTitle: true,
                overlayText: false,
                centerText: true,
                showYear: true
            });
        }

        searchType(instance, apiClient, {
            searchTerm: value,
            IncludePeople: false,
            IncludeMedia: true,
            IncludeGenres: false,
            IncludeStudios: false,
            IncludeArtists: false,
            IncludeItemTypes: "Series"

        }, context, '.seriesResults', {

            showTitle: true,
            overlayText: false,
            centerText: true,
            showYear: true
        });

        if (instance.options.collectionType === 'livetv') {

            searchType(instance, apiClient, {
                searchTerm: value,
                IncludePeople: false,
                IncludeMedia: true,
                IncludeGenres: false,
                IncludeStudios: false,
                IncludeArtists: false,
                IncludeItemTypes: "LiveTvProgram",
                IsSeries: true,
                IsSports: false,
                IsKids: false,
                IsNews: false

            }, context, '.episodeResults', {

                preferThumb: true,
                inheritThumb: false,
                shape: (enableScrollX() ? 'overflowBackdrop' : 'backdrop'),
                showParentTitleOrTitle: true,
                showTitle: false,
                centerText: true,
                coverImage: true,
                overlayText: false,
                overlayMoreButton: true,
                showAirTime: true,
                showAirDateTime: true,
                showChannelName: true
            });

        } else {

            searchType(instance, apiClient, {
                searchTerm: value,
                IncludePeople: false,
                IncludeMedia: true,
                IncludeGenres: false,
                IncludeStudios: false,
                IncludeArtists: false,
                IncludeItemTypes: "Episode"

            }, context, '.episodeResults', {

                coverImage: true,
                showTitle: true,
                showParentTitle: true
            });
        }

        searchType(instance, apiClient, {
            searchTerm: value,
            IncludePeople: false,
            IncludeMedia: true,
            IncludeGenres: false,
            IncludeStudios: false,
            IncludeArtists: false,
            // NullType to hide
            IncludeItemTypes: instance.options.collectionType === 'livetv' ? 'LiveTvProgram' : 'NullType',
            IsSports: true

        }, context, '.sportsResults', {

            preferThumb: true,
            inheritThumb: false,
            shape: (enableScrollX() ? 'overflowBackdrop' : 'backdrop'),
            showParentTitleOrTitle: true,
            showTitle: false,
            centerText: true,
            coverImage: true,
            overlayText: false,
            overlayMoreButton: true,
            showAirTime: true,
            showAirDateTime: true,
            showChannelName: true

        });

        searchType(instance, apiClient, {
            searchTerm: value,
            IncludePeople: false,
            IncludeMedia: true,
            IncludeGenres: false,
            IncludeStudios: false,
            IncludeArtists: false,
            // NullType to hide
            IncludeItemTypes: instance.options.collectionType === 'livetv' ? 'LiveTvProgram' : 'NullType',
            IsKids: true

        }, context, '.kidsResults', {

            preferThumb: true,
            inheritThumb: false,
            shape: (enableScrollX() ? 'overflowBackdrop' : 'backdrop'),
            showParentTitleOrTitle: true,
            showTitle: false,
            centerText: true,
            coverImage: true,
            overlayText: false,
            overlayMoreButton: true,
            showAirTime: true,
            showAirDateTime: true,
            showChannelName: true

        });

        searchType(instance, apiClient, {
            searchTerm: value,
            IncludePeople: false,
            IncludeMedia: true,
            IncludeGenres: false,
            IncludeStudios: false,
            IncludeArtists: false,
            IncludeItemTypes: "LiveTvProgram",
            IsMovie: instance.options.collectionType === 'livetv' ? false : null,
            IsSeries: instance.options.collectionType === 'livetv' ? false : null,
            IsSports: instance.options.collectionType === 'livetv' ? false : null,
            IsKids: instance.options.collectionType === 'livetv' ? false : null

        }, context, '.programResults', {

            preferThumb: true,
            inheritThumb: false,
            shape: (enableScrollX() ? 'overflowBackdrop' : 'backdrop'),
            showParentTitleOrTitle: true,
            showTitle: false,
            centerText: true,
            coverImage: true,
            overlayText: false,
            overlayMoreButton: true,
            showAirTime: true,
            showAirDateTime: true,
            showChannelName: true

        });

        searchType(instance, apiClient, {
            searchTerm: value,
            IncludePeople: true,
            IncludeMedia: false,
            IncludeGenres: false,
            IncludeStudios: false,
            IncludeArtists: false

        }, context, '.peopleResults', {

            coverImage: true,
            showTitle: true
        });

        searchType(instance, apiClient, {
            searchTerm: value,
            IncludePeople: false,
            IncludeMedia: false,
            IncludeGenres: false,
            IncludeStudios: false,
            IncludeArtists: true

        }, context, '.artistResults', {
            coverImage: true,
            showTitle: true
        });

        searchType(instance, apiClient, {
            searchTerm: value,
            IncludePeople: false,
            IncludeMedia: true,
            IncludeGenres: false,
            IncludeStudios: false,
            IncludeArtists: false,
            IncludeItemTypes: "MusicAlbum"

        }, context, '.albumResults', {

            showParentTitle: true,
            showTitle: true,
            overlayText: false,
            centerText: true
        });

        searchType(instance, apiClient, {
            searchTerm: value,
            IncludePeople: false,
            IncludeMedia: true,
            IncludeGenres: false,
            IncludeStudios: false,
            IncludeArtists: false,
            IncludeItemTypes: "Audio"

        }, context, '.songResults', {

            showParentTitle: true,
            showTitle: true,
            overlayText: false,
            centerText: true,
            action: 'play'

        });

        searchType(instance, apiClient, {
            searchTerm: value,
            IncludePeople: false,
            IncludeMedia: true,
            IncludeGenres: false,
            IncludeStudios: false,
            IncludeArtists: false,
            IncludeItemTypes: "Book"

        }, context, '.bookResults', {

            showTitle: true,
            overlayText: false,
            centerText: true

        });

        searchType(instance, apiClient, {
            searchTerm: value,
            IncludePeople: false,
            IncludeMedia: true,
            IncludeGenres: false,
            IncludeStudios: false,
            IncludeArtists: false,
            IncludeItemTypes: "AudioBook"

        }, context, '.audioBookResults', {

            showTitle: true,
            overlayText: false,
            centerText: true
        });
    }

    function searchType(instance, apiClient, query, context, section, cardOptions) {

        query.UserId = apiClient.getCurrentUserId();
        query.Limit = enableScrollX() ? 24 : 16;
        query.ParentId = instance.options.parentId;

        getSearchHints(instance, apiClient, query).then(function (result) {

            populateResults(result, context, section, cardOptions);
        });
    }

    function populateResults(result, context, section, cardOptions) {

        section = context.querySelector(section);

        var items = result.SearchHints;

        var itemsContainer = section.querySelector('.itemsContainer');

        cardBuilder.buildCards(items, Object.assign({

            itemsContainer: itemsContainer,
            parentContainer: section,
            shape: enableScrollX() ? 'autooverflow' : 'auto',
            scalable: true,
            overlayText: false,
            centerText: true,
            allowBottomPadding: !enableScrollX()

        }, cardOptions || {}));

        section.querySelector('.emby-scroller').scrollToBeginning(true);
    }

    function enableScrollX() {
        return !layoutManager.desktop;
    }

    function replaceAll(originalString, strReplace, strWith) {
        var reg = new RegExp(strReplace, 'ig');
        return originalString.replace(reg, strWith);
    }

    function embed(elem, instance, options) {

        require(['text!./searchresults.template.html'], function (template) {

            if (!enableScrollX()) {
                template = replaceAll(template, 'data-horizontal="true"', 'data-horizontal="false"');
                template = replaceAll(template, 'itemsContainer scrollSlider', 'itemsContainer scrollSlider vertical-wrap');
            }

            var html = globalize.translateDocument(template, 'sharedcomponents');

            elem.innerHTML = html;

            elem.classList.add('searchResults');
            instance.search('');
        });
    }

    function SearchResults(options) {

        this.options = options;
        embed(options.element, this, options);
    }

    SearchResults.prototype.search = function (value) {

        var apiClient = connectionManager.getApiClient(this.options.serverId);

        search(this, apiClient, this.options.element, value);
    };

    SearchResults.prototype.destroy = function () {

        var options = this.options;
        if (options) {
            options.element.classList.remove('searchFields');
        }
        this.options = null;

    };

    return SearchResults;
});