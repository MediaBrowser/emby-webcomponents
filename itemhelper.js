define(['apphost', 'globalize'], function (appHost, globalize) {
    'use strict';

    function getDisplayName(item, options) {

        if (!item) {
            throw new Error("null item passed into getDisplayName");
        }

        options = options || {};

        var itemType = item.Type;

        if (itemType === 'Timer') {
            item = item.ProgramInfo || item;
        }

        var name = ((itemType === 'Program' || itemType === 'Recording') && (item.IsSeries || item.EpisodeTitle) ? item.EpisodeTitle : item.Name) || '';

        if (itemType === "TvChannel") {

            if (item.ChannelNumber) {
                return item.ChannelNumber + ' ' + name;
            }
            return name;
        }
        if (/*options.isInlineSpecial &&*/ itemType === "Episode" && item.ParentIndexNumber === 0) {

            name = globalize.translate('ValueSpecialEpisodeName', name);

        } else if ((itemType === "Episode" || itemType === 'Program') && item.IndexNumber != null && item.ParentIndexNumber != null && options.includeIndexNumber !== false) {

            var displayIndexNumber = item.IndexNumber;

            var number = displayIndexNumber;
            var nameSeparator = " - ";

            if (options.includeParentInfo !== false) {
                number = "S" + item.ParentIndexNumber + ":E" + number;
            } else {
                nameSeparator = ". ";
            }

            if (item.IndexNumberEnd) {

                displayIndexNumber = item.IndexNumberEnd;
                number += "-" + displayIndexNumber;
            }

            if (number) {
                name = name ? (number + nameSeparator + name) : number;
            }
        }

        return name;
    }

    function supportsAddingToCollection(item) {

        var invalidTypes = ['Genre', 'MusicGenre', 'Studio', 'GameGenre', 'UserView', 'CollectionFolder', 'Audio', 'Program', 'Timer', 'SeriesTimer', 'BoxSet'];

        var itemType = item.Type;

        if (itemType === 'Recording') {
            if (item.Status !== 'Completed') {
                return false;
            }
        }

        if (item.CollectionType) {
            return false;
        }

        if (invalidTypes.indexOf(itemType) !== -1) {
            return false;
        }

        if (isLocalItem(item)) {
            return false;
        }

        if (item.MediaType === 'Photo') {
            return false;
        }

        if (item.IsFolder || itemType === "MusicArtist") {
            return true;
        }

        // Check ParentId to filter out owned items (for now)
        // https://emby.media/community/index.php?/topic/63827-add-movie-extras-to-playlists
        if (!item.ParentId) {
            return false;
        }

        return true;
    }

    function supportsAddingToPlaylist(item) {

        var itemType = item.Type;
        if (itemType === 'Program') {
            return false;
        }
        if (itemType === 'TvChannel') {
            return false;
        }
        if (itemType === 'Timer') {
            return false;
        }
        if (itemType === 'SeriesTimer') {
            return false;
        }

        if (itemType === 'Recording') {
            if (item.Status !== 'Completed') {
                return false;
            }
        }

        var mediaType = item.MediaType;
        if (mediaType === 'Photo') {
            return false;
        }
        if (mediaType === 'Game') {
            return false;
        }

        var collectionType = item.CollectionType;
        if (collectionType === 'livetv' || collectionType === 'playlists') {
            return false;
        }

        if (isLocalItem(item)) {
            return false;
        }

        if (item.IsFolder || itemType === "Genre" || itemType === "MusicGenre" || itemType === "MusicArtist") {
            return true;
        }

        // Check ParentId to filter out owned items (for now)
        // https://emby.media/community/index.php?/topic/63827-add-movie-extras-to-playlists
        if (!item.ParentId) {
            return false;
        }

        return item.MediaType;
    }

    function canEditInternal(user, item) {

        // AddServer
        if (!item.Id) {
            return false;
        }

        var itemType = item.Type;

        if (itemType === "UserRootFolder" || itemType === "CollectionFolder" || itemType === "UserView" || itemType === "PlaylistsFolder") {
            return false;
        }

        if (itemType === 'Program') {
            return false;
        }

        if (itemType === 'Genre' || itemType === 'MusicGenre' || itemType === 'GameGenre' || itemType === 'Studio') {
            return false;
        }

        if (itemType === 'Timer') {
            return false;
        }

        if (itemType === 'SeriesTimer') {
            return false;
        }

        if (itemType === 'Plugin') {
            return false;
        }

        if (itemType === 'Server') {
            return false;
        }

        if (itemType === 'Recording') {
            if (item.Status !== 'Completed') {
                return false;
            }
        }

        if (isLocalItem(item)) {
            return false;
        }

        return true;
    }

    function isLocalItem(item) {

        if (item) {

            var id = item.Id;

            if (typeof id === 'string' && id.indexOf('local') === 0) {
                return true;
            }
        }

        return false;
    }

    return {
        getDisplayName: getDisplayName,
        supportsAddingToCollection: supportsAddingToCollection,
        supportsAddingToPlaylist: supportsAddingToPlaylist,
        isLocalItem: isLocalItem,

        canIdentify: function (user, item) {

            var itemType = item.Type;

            if (itemType === "Movie" ||
                itemType === "Trailer" ||
                itemType === "Series" ||
                itemType === "Game" ||
                itemType === "BoxSet" ||
                itemType === "Person" ||
                itemType === "Book" ||
                itemType === "MusicAlbum" ||
                itemType === "MusicArtist" ||
                itemType === "MusicVideo") {

                if (user.Policy.IsAdministrator) {

                    if (!isLocalItem(item)) {
                        return true;
                    }
                }
            }

            return false;
        },

        canEdit: function (user, item) {

            return canEditInternal(user, item) && user.Policy.IsAdministrator;
        },

        canEditSubtitles: function (user, item) {

            var itemType = item.Type;

            if (item.MediaType === 'Video' && itemType !== 'TvChannel' && itemType !== 'Program' && item.LocationType !== 'Virtual' && !(itemType === 'Recording' && item.Status !== 'Completed')) {
                if (user.Policy.EnableSubtitleDownloading || user.Policy.EnableSubtitleManagement) {
                    return canEditInternal(user, item);
                }

                if (user.Policy.EnableSubtitleDownloading == null && user.Policy.EnableSubtitleManagement == null) {
                    return canEditInternal(user, item) && user.Policy.IsAdministrator;
                }
            }

            return false;

        },

        canEditImages: function (user, item) {

            var itemType = item.Type;

            if (item.MediaType === 'Photo') {
                return false;
            }

            if (itemType === 'CollectionFolder' || itemType === 'UserView' || itemType === 'PlaylistsFolder' ||
                itemType === 'Genre' || itemType === 'MusicGenre' || itemType === 'GameGenre' || itemType === 'Studio') {

                if (!isLocalItem(item)) {
                    if (user.Policy.IsAdministrator) {

                        return true;
                    }

                    return false;
                }
            }

            if (itemType === 'Genre' ||
                itemType === 'MusicGenre' ||
                itemType === 'GameGenre' ||
                itemType === 'Studio' ||
                itemType === 'Device' ||
                itemType === 'User' ||
                itemType === 'Plugin') {
                return false;
            }

            if (itemType === 'Recording') {
                if (item.Status !== 'Completed') {
                    return false;
                }
            }

            return canEditInternal(user, item) && user.Policy.IsAdministrator;
        },

        canSync: function (user, item) {

            if (user && !user.Policy.EnableContentDownloading) {
                return false;
            }

            if (isLocalItem(item)) {
                return false;
            }

            return item.SupportsSync;
        },

        canShare: function (item, user) {

            var itemType = item.Type;

            if (itemType === 'Program') {
                return false;
            }
            if (itemType === 'TvChannel') {
                return false;
            }
            if (itemType === 'Timer') {
                return false;
            }
            if (itemType === 'SeriesTimer') {
                return false;
            }
            if (itemType === 'Recording') {
                if (item.Status !== 'Completed') {
                    return false;
                }
            }
            if (isLocalItem(item)) {
                return false;
            }
            return user.Policy.EnablePublicSharing && appHost.supports('sharing');
        },

        enableDateAddedDisplay: function (item) {

            var itemType = item.Type;

            return !item.IsFolder && item.MediaType && itemType !== 'Program' && itemType !== 'TvChannel' && itemType !== 'Trailer';
        },

        canMarkPlayed: function (item) {

            if (item.SupportsResume) {
                return true;
            }

            var itemType = item.Type;
            var mediaType = item.MediaType;

            if (itemType === 'Program') {
                return false;
            }

            if (mediaType === 'Video') {
                if (itemType !== 'TvChannel') {
                    return true;
                }
            }

            if (itemType === "AudioBook" ||
                itemType === "Series" ||
                itemType === "Season" ||
                mediaType === "Game" ||
                mediaType === "Book" ||
                mediaType === "Recording") {
                return true;
            }

            return false;
        },

        canRate: function (item) {

            var itemType = item.Type;

            if (itemType === 'Program' ||
                itemType === 'Timer' ||
                itemType === 'SeriesTimer' ||
                itemType === 'CollectionFolder' ||
                itemType === 'UserView' ||
                itemType === 'Channel' ||
                itemType === 'Season' ||
                itemType === 'Studio') {
                return false;
            }

            // Could be a stub object like PersonInfo
            if (!item.UserData) {
                return false;
            }

            return true;
        },

        canConvert: function (item, user) {

            // AddServer
            if (!item.Id) {
                return false;
            }

            var mediaType = item.MediaType;
            if (mediaType === 'Book' || mediaType === 'Photo' || mediaType === 'Game' || mediaType === 'Audio') {
                return false;
            }

            var collectionType = item.CollectionType;
            if (collectionType === 'livetv' || collectionType === 'playlists' || collectionType === 'boxsets') {
                return false;
            }

            var type = item.Type;
            if (type === 'TvChannel' ||
                type === 'Channel' ||
                type === 'Person' ||
                type === 'Year' ||
                type === 'Program' ||
                type === 'Timer' ||
                type === 'SeriesTimer' ||
                type === 'GameGenre' ||
                type === 'Device' ||
                type === 'Device' ||
                type === 'User' ||
                type === 'Plugin' ||
                type === 'Server') {
                return false;
            }

            if (item.LocationType === 'Virtual' && !item.IsFolder) {
                return false;
            }

            if (!user.Policy.EnableMediaConversion) {
                return false;
            }

            if (isLocalItem(item)) {
                return false;
            }

            return true;
        },

        canRefreshMetadata: function (item, user) {

            // AddServer
            if (!item.Id) {
                return false;
            }

            var itemType = item.Type;
            if (itemType === 'Device' ||
                itemType === 'User' ||
                itemType === 'Plugin' ||
                itemType === 'Server') {
                return false;
            }

            var collectionType = item.CollectionType;
            if (collectionType === 'livetv') {
                return false;
            }

            if (user.Policy.IsAdministrator) {

                if (itemType !== 'Timer' && itemType !== 'SeriesTimer' && itemType !== 'Program' && itemType !== 'TvChannel' && !(itemType === 'Recording' && item.Status !== 'Completed')) {

                    if (!isLocalItem(item)) {
                        return true;
                    }
                }
            }

            return false;
        },

        supportsMediaSourceSelection: function (item) {

            if (item.MediaType !== 'Video') {
                return false;
            }
            if (item.Type === 'TvChannel') {
                return false;
            }
            if (!item.MediaSources || (item.MediaSources.length === 1 && item.MediaSources[0].Type === 'Placeholder')) {
                return false;
            }

            return true;
        },

        supportsSimilarItems: function (item) {

            var itemType = item.Type;

            return itemType === "Movie" ||
                itemType === "Trailer" ||
                itemType === "Series" ||
                itemType === "Program" ||
                itemType === "Recording" ||
                itemType === "Game" ||
                itemType === "MusicAlbum" ||
                itemType === "MusicArtist" ||
                itemType === "Playlist";
        },

        supportsSimilarItemsOnLiveTV: function (item, apiClient) {

            var itemType = item.Type;

            if (!apiClient.isMinServerVersion('3.6.0.18')) {
                return false;
            }

            return itemType === "Movie" ||
                itemType === "Trailer" ||
                itemType === "Series";
        },

        supportsExtras: function (item) {

            if (item.IsFolder) {
                return false;
            }

            if (item.Type === 'TvChannel') {
                return false;
            }

            var mediaType = item.MediaType;

            return mediaType === 'Video';
        }
    };
});