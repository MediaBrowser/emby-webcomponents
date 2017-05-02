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

    function getSearchHints(apiClient, query) {

        if (!query.searchTerm) {
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

        searchType(instance, apiClient, {
            searchTerm: value,
            IncludePeople: false,
            IncludeMedia: true,
            IncludeGenres: false,
            IncludeStudios: false,
            IncludeArtists: false,
            IncludeItemTypes: "LiveTvProgram"

        }, context, '.programResults', {

            showTitle: true,
            showParentTitle: true,
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
            IncludeItemTypes: "Series"

        }, context, '.seriesResults', {

            showTitle: true,
            overlayText: false,
            centerText: true,
            showYear: true
        });

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

        }, context, '.bookResults');

        searchType(instance, apiClient, {
            searchTerm: value,
            IncludePeople: false,
            IncludeMedia: true,
            IncludeGenres: false,
            IncludeStudios: false,
            IncludeArtists: false,
            IncludeItemTypes: "AudioBook"

        }, context, '.audioBookResults');
    }

    function searchType(instance, apiClient, query, context, section, cardOptions) {

        query.UserId = apiClient.getCurrentUserId();
        query.Limit = 24;
        query.ParentId = instance.options.parentId;

        getSearchHints(apiClient, query).then(function (result) {

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
            shape: 'autooverflow',
            scalable: true,
            overlayText: true,
            allowBottomPadding: false

        }, cardOptions || {}));

        section.querySelector('.emby-scroller').scrollToBeginning(true);
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