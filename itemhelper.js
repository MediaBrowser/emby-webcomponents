define(['apphost', 'globalize'], function (appHost, globalize) {
    'use strict';

    function getDisplayName(item, options) {

        if (!item) {
            throw new Error("null item passed into getDisplayName");
        }

        options = options || {};

        if (item.Type === 'Timer') {
            item = item.ProgramInfo || item;
        }

        var name = ((item.Type === 'Program' || item.Type === 'Recording') && (item.IsSeries || item.EpisodeTitle) ? item.EpisodeTitle : item.Name) || '';

        if (item.Type === "TvChannel") {

            if (item.ChannelNumber) {
                return item.ChannelNumber + ' ' + name;
            }
            return name;
        }
        if (/*options.isInlineSpecial &&*/ item.Type === "Episode" && item.ParentIndexNumber === 0) {

            name = globalize.translate('sharedcomponents#ValueSpecialEpisodeName', name);

        } else if ((item.Type === "Episode" || item.Type === 'Program') && item.IndexNumber != null && item.ParentIndexNumber != null && options.includeIndexNumber !== false) {

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

        var invalidTypes = ['Genre', 'MusicGenre', 'Studio', 'GameGenre', 'UserView', 'CollectionFolder', 'Audio', 'Program', 'Timer', 'SeriesTimer'];

        if (item.Type === 'Recording') {
            if (item.Status !== 'Completed') {
                return false;
            }
        }

        if (item.CollectionType) {
            return false;
        }

        if (invalidTypes.indexOf(item.Type) !== -1) {
            return false;
        }

        if (isLocalItem(item)) {
            return false;
        }

        if (item.MediaType === 'Photo') {
            return false;
        }

        if (item.IsFolder || item.Type === "MusicArtist") {
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

        if (item.Type === 'Program') {
            return false;
        }
        if (item.Type === 'TvChannel') {
            return false;
        }
        if (item.Type === 'Timer') {
            return false;
        }
        if (item.Type === 'SeriesTimer') {
            return false;
        }
        if (item.Type === 'PlaylistsFolder') {
            return false;
        }
        if (item.MediaType === 'Photo') {
            return false;
        }
        if (item.MediaType === 'Game') {
            return false;
        }

        if (item.Type === 'Recording') {
            if (item.Status !== 'Completed') {
                return false;
            }
        }

        if (isLocalItem(item)) {
            return false;
        }
        if (item.CollectionType === 'livetv') {
            return false;
        }

        if (item.IsFolder || item.Type === "Genre" || item.Type === "MusicGenre" || item.Type === "MusicArtist") {
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

        if (item.Type === 'Recording') {
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

            if (user.Policy.EnableSubtitleDownloading || user.Policy.EnableSubtitleManagement) {
                return canEditInternal(user, item);
            }

            if (user.Policy.EnableSubtitleDownloading == null && user.Policy.EnableSubtitleManagement == null) {
                return canEditInternal(user, item) && user.Policy.IsAdministrator;
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

            if (itemType === 'Genre' || itemType === 'MusicGenre' || itemType === 'GameGenre' || itemType === 'Studio') {
                return false;
            }

            if (item.Type === 'Recording') {
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

            if (item.Type === 'Program') {
                return false;
            }
            if (item.Type === 'TvChannel') {
                return false;
            }
            if (item.Type === 'Timer') {
                return false;
            }
            if (item.Type === 'SeriesTimer') {
                return false;
            }
            if (item.Type === 'Recording') {
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
            return !item.IsFolder && item.MediaType && item.Type !== 'Program' && item.Type !== 'TvChannel' && item.Type !== 'Trailer';
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
                itemType === "BoxSet" ||
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
                itemType === 'Studio' ||
                itemType === 'PlaylistsFolder') {
                return false;
            }

            // Could be a stub object like PersonInfo
            if (!item.UserData) {
                return false;
            }

            return true;
        },

        canConvert: function (item, user) {

            if (!user.Policy.EnableMediaConversion) {
                return false;
            }

            if (isLocalItem(item)) {
                return false;
            }

            var mediaType = item.MediaType;
            if (mediaType === 'Book' || mediaType === 'Photo' || mediaType === 'Game' || mediaType === 'Audio') {
                return false;
            }

            var collectionType = item.CollectionType;
            if (collectionType === 'livetv') {
                return false;
            }

            var type = item.Type;
            if (type === 'Channel' || type === 'Person' || type === 'Year' || type === 'Program' || type === 'Timer' || type === 'SeriesTimer' || type === 'GameGenre' || type === 'PlaylistsFolder') {
                return false;
            }

            if (item.LocationType === 'Virtual' && !item.IsFolder) {
                return false;
            }

            return true;
        },

        canRefreshMetadata: function (item, user) {

            if (user.Policy.IsAdministrator) {

                var collectionType = item.CollectionType;
                if (collectionType === 'livetv') {
                    return false;
                }

                if (item.Type !== 'Timer' && item.Type !== 'SeriesTimer' && item.Type !== 'Program' && item.Type !== 'TvChannel' && item.Type !== 'PlaylistsFolder' && !(item.Type === 'Recording' && item.Status !== 'Completed')) {

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