define([], function () {

    return {
        isEnabled: true,

        download: function (items) {

            require(['multi-download'], function (multiDownload) {
                multiDownload(items.map(function (item) {
                    return item.url;
                }));
            });
        }
    };
});