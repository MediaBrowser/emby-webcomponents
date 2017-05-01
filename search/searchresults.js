define(['layoutManager', 'globalize', 'require', 'events', 'connectionManager', 'cardBuilder'], function (layoutManager, globalize, require, events, connectionManager, cardBuilder) {
    'use strict';

    function search(apiClient, context, value) {

        if (!value) {
            var emptyResult = {
                SearchHints: []
            };
            populateResults(emptyResult, '.peopleResults');
            populateResults(emptyResult, '.programResults');
            populateResults(emptyResult, '.seriesResults');
            populateResults(emptyResult, '.episodeResults');
            populateResults(emptyResult, '.movieResults');
            populateResults(emptyResult, '.artistResults');
            populateResults(emptyResult, '.albumResults');
            populateResults(emptyResult, '.songResults');
            populateResults(emptyResult, '.bookResults');
            populateResults(emptyResult, '.audioBookResults');
            return;
        }

        searchType(apiClient, value, {
            searchTerm: value,
            IncludePeople: false,
            IncludeMedia: true,
            IncludeGenres: false,
            IncludeStudios: false,
            IncludeArtists: false,
            IncludeItemTypes: "Movie"

        }, context, '.movieResults');

        searchType(apiClient, value, {
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

        searchType(apiClient, value, {
            searchTerm: value,
            IncludePeople: false,
            IncludeMedia: true,
            IncludeGenres: false,
            IncludeStudios: false,
            IncludeArtists: false,
            IncludeItemTypes: "Series"

        }, context, '.seriesResults');

        searchType(apiClient, value, {
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

        searchType(apiClient, value, {
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

        searchType(apiClient, value, {
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

        searchType(apiClient, value, {
            searchTerm: value,
            IncludePeople: false,
            IncludeMedia: true,
            IncludeGenres: false,
            IncludeStudios: false,
            IncludeArtists: false,
            IncludeItemTypes: "MusicAlbum"

        }, context, '.albumResults');

        searchType(apiClient, value, {
            searchTerm: value,
            IncludePeople: false,
            IncludeMedia: true,
            IncludeGenres: false,
            IncludeStudios: false,
            IncludeArtists: false,
            IncludeItemTypes: "Audio"

        }, context, '.songResults', {
            action: 'play'
        });

        searchType(apiClient, value, {
            searchTerm: value,
            IncludePeople: false,
            IncludeMedia: true,
            IncludeGenres: false,
            IncludeStudios: false,
            IncludeArtists: false,
            IncludeItemTypes: "Book"

        }, context, '.bookResults');

        searchType(apiClient, value, {
            searchTerm: value,
            IncludePeople: false,
            IncludeMedia: true,
            IncludeGenres: false,
            IncludeStudios: false,
            IncludeArtists: false,
            IncludeItemTypes: "AudioBook"

        }, context, '.audioBookResults');
    }

    function searchType(apiClient, value, query, context, section, cardOptions) {

        query.UserId = apiClient.getCurrentUserId();
        query.Limit = 24;

        apiClient.getSearchHints(query).then(function (result) {

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
            widths: {
                portrait: 340,
                thumb: 500,
                square: 340
            }

        }, cardOptions || {}));

        section.querySelector('.emby-scroller').scrollToBeginning(true);
    }

    function embed(elem, instance, options) {

        require(['text!./searchresults.template.html'], function (template) {

            var html = globalize.translateDocument(template, 'sharedcomponents');

            elem.innerHTML = html;

            elem.classList.add('searchResults');
        });
    }

    function SearchResults(options) {

        this.options = options;
        embed(options.element, this, options);
    }

    SearchResults.prototype.search = function (value) {

        var apiClient = connectionManager.getApiClient(this.options.serverId);

        search(apiClient, this.options.element, value);
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