define(function () {
    'use strict';

    var requireCss = {};

    requireCss.normalize = function (name, normalize) {
        if (name.substr(name.length - 4, 4) === '.css') {
            name = name.substr(0, name.length - 4);
        }

        return normalize(name);
    };

    var importedCss = [];

    function isLoaded(url) {
        return importedCss.indexOf(url) !== -1;
    }

    requireCss.load = function (cssId, req, load, config) {

        // Somehow if the url starts with /css, require will get all screwed up since this extension is also called css
        var srch = '/emby-webcomponents/require/requirecss';
        var index = cssId.indexOf(srch);

        if (index !== -1) {
            cssId = 'css' + cssId.substring(index + srch.length);
        }

        var url = cssId + '.css';

        if (url.indexOf('://') === -1) {
            url = config.baseUrl + url;
        }

        if (!isLoaded(url)) {

            var linkUrl = url;

            if (config.urlArgs) {
                linkUrl += config.urlArgs(cssId, url);
            }

            importedCss.push(url);

            var link = document.createElement('link');

            link.setAttribute('rel', 'stylesheet');
            link.setAttribute('type', 'text/css');
            link.onload = load;

            link.setAttribute('href', linkUrl);
            document.head.appendChild(link);

        } else {
            load();
        }
    };

    return requireCss;
});
