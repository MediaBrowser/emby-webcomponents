define(['userSettings', 'events', 'pluginManager', 'backdrop', 'globalize', 'require'], function (userSettings, events, pluginManager, backdrop, globalize, require) {
    'use strict';

    var currentSkin;

    function getCurrentSkin() {
        return currentSkin;
    }

    function getRequirePromise(deps) {
        return new Promise(function (resolve, reject) {

            require(deps, resolve);
        });
    }

    function loadSkin(id) {

        var newSkin = pluginManager.plugins().filter(function (p) {
            return p.id === id;
        })[0];

        if (!newSkin) {
            newSkin = pluginManager.plugins().filter(function (p) {
                return p.id === 'defaultskin';
            })[0];
        }

        var unloadPromise;

        if (currentSkin) {

            if (currentSkin.id === newSkin.id) {
                // Nothing to do, it's already the active skin
                return Promise.resolve(currentSkin);
            }
            unloadPromise = unloadSkin(currentSkin);
        } else {
            unloadPromise = Promise.resolve();
        }

        return unloadPromise.then(function () {
            var deps = newSkin.getDependencies();

            console.log('Loading skin dependencies');

            return getRequirePromise(deps).then(function () {

                console.log('Skin dependencies loaded');

                var strings = newSkin.getTranslations ? newSkin.getTranslations() : [];

                return globalize.loadStrings({

                    name: newSkin.id,
                    strings: strings

                }).then(function () {

                    globalize.defaultModule(newSkin.id);
                    return loadSkinHeader(newSkin);
                });
            });
        });
    }

    function unloadSkin(skin) {

        unloadTheme();
        backdrop.clear();

        console.log('Unloading skin: ' + skin.name);

        // TODO: unload css

        return skin.unload().then(function () {
            document.dispatchEvent(new CustomEvent("skinunload", {
                detail: {
                    name: skin.name
                }
            }));
        });
    }

    function loadSkinHeader(skin) {

        return getSkinHeader(skin).then(function (headerHtml) {

            document.querySelector('.skinHeader').innerHTML = headerHtml;

            currentSkin = skin;
            skin.load();

            return skin;
        });
    }

    var cacheParam = new Date().getTime();

    function getSkinHeader(skin) {

        return new Promise(function (resolve, reject) {

            if (!skin.getHeaderTemplate) {
                resolve('');
                return;
            }

            var xhr = new XMLHttpRequest();

            var url = skin.getHeaderTemplate();
            url += url.indexOf('?') === -1 ? '?' : '&';
            url += 'v=' + cacheParam;

            xhr.open('GET', url, true);

            xhr.onload = function (e) {
                if (this.status < 400) {
                    resolve(this.response);
                } else {
                    resolve('');
                }
            };

            xhr.send();
        });
    }

    function loadUserSkin() {

        var skin = userSettings.get('skin', false) || 'defaultskin';

        loadSkin(skin).then(function (skin) {

            Emby.Page.goHome();
        });
    }

    events.on(userSettings, 'change', function (e, name) {
        if (name === 'skin' || name === 'language') {
            loadUserSkin();
        }
    });

    function getStylesheetPath(stylesheetPath) {

        var embyWebComponentsBowerPath = 'bower_components/emby-webcomponents';

        switch (stylesheetPath) {

            case 'theme-dark':
                return require.toUrl(embyWebComponentsBowerPath + '/themes/dark/theme.css');
            case 'theme-light':
                return require.toUrl(embyWebComponentsBowerPath + '/themes/light/theme.css');
            default:
                return stylesheetPath;
        }
    }

    var themeStyleElement;
    var currentThemeStylesheet;
    function unloadTheme() {
        var elem = themeStyleElement;
        if (elem) {

            elem.parentNode.removeChild(elem);
            themeStyleElement = null;
            currentThemeStylesheet = null;
        }
    }

    function setTheme(stylesheetPath) {

        return new Promise(function (resolve, reject) {

            var linkUrl = getStylesheetPath(stylesheetPath);

            if (currentThemeStylesheet === linkUrl) {
                resolve();
                return;
            }

            unloadTheme();

            var link = document.createElement('link');

            link.setAttribute('rel', 'stylesheet');
            link.setAttribute('type', 'text/css');
            link.onload = resolve;

            link.setAttribute('href', linkUrl);
            document.head.appendChild(link);
            themeStyleElement = link;
            currentThemeStylesheet = linkUrl;
        });
    }

    return {
        getCurrentSkin: getCurrentSkin,
        loadSkin: loadSkin,
        loadUserSkin: loadUserSkin,
        setTheme: setTheme
    };
});