define([], function () {

    return {
        isEnabled: function () {
            return true;
        },

        download: function (items) {

            require(['multi-download'], function (multiDownload) {
                multiDownload(items.map(function (item) {
                    return item.url;
                }));
            });
        }
    };
});