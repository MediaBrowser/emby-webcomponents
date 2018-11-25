define(['layoutManager', 'globalize', 'require', 'events', 'connectionManager', 'cardBuilder', 'appRouter', 'emby-scroller', 'emby-itemscontainer', 'emby-linkbutton'], function (layoutManager, globalize, require, events, connectionManager, cardBuilder, appRouter) {
    'use strict';

    function loadSuggestions(instance, context, apiClient) {

        var options = {

            SortBy: "IsFavoriteOrLiked,Random",
            IncludeItemTypes: "Movie,Series,MusicArtist",
            Limit: 20,
            Recursive: true,
            ImageTypeLimit: 0,
            EnableImages: false,
            ParentId: instance.options.parentId,
            EnableTotalRecordCount: false
        };

        apiClient.getItems(apiClient.getCurrentUserId(), options).then(function (result) {

            if (instance.mode !== 'suggestions') {
                result.Items = [];
            }

            var html = result.Items.map(function (i) {

                var href = appRouter.getRouteUrl(i);

                var itemHtml = '<div><a is="emby-linkbutton" class="button-link" style="display:inline-block;padding:.5em 1em;" href="' + href + '">';
                itemHtml += i.Name;
                itemHtml += '</a></div>';
                return itemHtml;

            }).join('');

            var searchSuggestions = context.querySelector('.searchSuggestions');
            searchSuggestions.querySelector('.searchSuggestionsList').innerHTML = html;

            if (result.Items.length) {
                searchSuggestions.classList.remove('hide');
            }
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
                queryIncludeItemTypes === 'Game' ||
                queryIncludeItemTypes === 'Playlist' ||
                queryIncludeItemTypes === 'PhotoAlbum' ||
                queryIncludeItemTypes === 'TvChannel' ||
                queryIncludeItemTypes === 'Video' ||
                queryIncludeItemTypes === 'Photo') {
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
                queryIncludeItemTypes === 'Game' ||
                queryIncludeItemTypes === 'Playlist' ||
                queryIncludeItemTypes === 'PhotoAlbum' ||
                queryIncludeItemTypes === 'TvChannel' ||
                queryIncludeItemTypes === 'Video' ||
                queryIncludeItemTypes === 'Photo') {
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
                queryIncludeItemTypes === 'TvChannel' ||
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
                queryIncludeItemTypes === 'Game' ||
                queryIncludeItemTypes === 'PhotoAlbum' ||
                queryIncludeItemTypes === 'Movie' ||
                queryIncludeItemTypes === 'Playlist' ||
                queryIncludeItemTypes === 'Video' ||
                queryIncludeItemTypes === 'Photo') {
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

        // Convert the search hint query to a regular item query
        if (apiClient.isMinServerVersion('3.4.1.31')) {

            query.Fields = 'PrimaryImageAspectRatio,CanDelete,BasicSyncInfo,MediaSourceCount';
            query.Recursive = true;
            query.EnableTotalRecordCount = false;
            query.ImageTypeLimit = 1;

            var methodName = 'getItems';

            if (!query.IncludeMedia) {
                if (query.IncludePeople) {
                    methodName = 'getPeople';

                } else if (query.IncludeArtists) {
                    methodName = 'getArtists';
                }
            }

            return apiClient[methodName](apiClient.getCurrentUserId(), query);
        }

        query.UserId = apiClient.getCurrentUserId();

        return apiClient.getSearchHints(query);
    }

    function search(instance, apiClient, context, value) {

        if (value || layoutManager.tv) {
            instance.mode = 'search';
            context.querySelector('.searchSuggestions').classList.add('hide');
        } else {
            instance.mode = 'suggestions';
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

                    shape: 'autooverflow',
                    showParentTitle: true,
                    showTitle: true,
                    centerText: true,
                    overlayText: false,
                    overlayMoreButton: true,
                    showAirTime: true,
                    showAirDateTime: true,
                    lines: 3
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

                    shape: 'autooverflow',
                    showParentTitle: true,
                    showTitle: true,
                    centerText: true,
                    overlayText: false,
                    overlayMoreButton: true,
                    showAirTime: true,
                    showAirDateTime: true,
                    lines: 3
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

                shape: 'autooverflow',
                showParentTitle: true,
                showTitle: true,
                centerText: true,
                overlayText: false,
                overlayMoreButton: true,
                showAirTime: true,
                showAirDateTime: true,
                lines: 3

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

                shape: 'autooverflow',
                showParentTitle: true,
                showTitle: true,
                centerText: true,
                overlayText: false,
                overlayMoreButton: true,
                showAirTime: true,
                showAirDateTime: true

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
            IsNews: true

        }, context, '.newsResults', {

                shape: 'autooverflow',
                showParentTitle: true,
                showTitle: true,
                centerText: true,
                overlayText: false,
                overlayMoreButton: true,
                showAirTime: true,
                showAirDateTime: true,
                lines: 3

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
            IsKids: instance.options.collectionType === 'livetv' ? false : null,
            IsNews: instance.options.collectionType === 'livetv' ? false : null

        }, context, '.programResults', {

                shape: 'autooverflow',
                showParentTitle: true,
                showTitle: true,
                centerText: true,
                overlayText: false,
                showAirTime: true,
                showAirDateTime: true,
                lines: 3

            });

        searchType(instance, apiClient, {
            searchTerm: value,
            IncludePeople: false,
            IncludeMedia: true,
            IncludeGenres: false,
            IncludeStudios: false,
            IncludeArtists: false,
            IncludeItemTypes: "Video"

        }, context, '.videoResults', {

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
            IncludeItemTypes: "TvChannel"

        }, context, '.channelResults', {

                showParentTitle: false,
                showTitle: true,
                overlayText: false,
                showCurrentProgram: true,
                showCurrentProgramTime: true,
                centerText: true,
                lines: 3,
                defaultBackground: true
            });

        searchType(instance, apiClient, {
            searchTerm: value,
            IncludePeople: true,
            IncludeMedia: false,
            IncludeGenres: false,
            IncludeStudios: false,
            IncludeArtists: false

        }, context, '.peopleResults', {

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
                preferArtistTitle: true,
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
            IncludeItemTypes: "Photo"

        }, context, '.photoResults', {

                showParentTitle: false,
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
            IncludeItemTypes: "PhotoAlbum"

        }, context, '.photoAlbumResults', {

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
            IncludeItemTypes: "Game"

        }, context, '.gameResults', {

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
            IncludeItemTypes: "Playlist"

        }, context, '.playlistResults', {

                showTitle: true,
                overlayText: false,
                centerText: true
            });
    }

    function searchType(instance, apiClient, query, context, section, cardOptions) {

        query.Limit = 16;
        query.ParentId = instance.options.parentId;

        getSearchHints(instance, apiClient, query).then(function (result) {

            populateResults(result, context, section, cardOptions);
        });
    }

    function populateResults(result, context, section, cardOptions) {

        section = context.querySelector(section);

        var items = result.Items || result.SearchHints;

        var itemsContainer = section.querySelector('.itemsContainer');

        cardBuilder.buildCards(items, Object.assign({

            itemsContainer: itemsContainer,
            parentContainer: section,
            shape: 'autooverflow',
            scalable: true,
            overlayText: false,
            centerText: true

        }, cardOptions || {}));

        section.querySelector('.emby-scroller').scrollToBeginning(true);
    }

    function replaceAll(originalString, strReplace, strWith) {
        var reg = new RegExp(strReplace, 'ig');
        return originalString.replace(reg, strWith);
    }

    function embed(elem, instance, options) {

        require(['text!./searchresults.template.html'], function (template) {

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