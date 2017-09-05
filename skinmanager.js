define(['userSettings', 'events', 'pluginManager', 'backdrop', 'globalize', 'require', 'appSettings'], function (userSettings, events, pluginManager, backdrop, globalize, require, appSettings) {
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

    function loadUserSkin(options) {

        var skin = userSettings.get('skin', false) || 'defaultskin';

        loadSkin(skin).then(function (skin) {

            options = options || {};
            if (options.start) {
                Emby.Page.invokeShortcut(options.start);
            } else {
                Emby.Page.goHome();
            }
        });
    }

    events.on(userSettings, 'change', function (e, name) {
        if (name === 'skin' || name === 'language') {
            loadUserSkin();
        }
    });

    var themeStyleElement;
    var currentThemeId;
    function unloadTheme() {
        var elem = themeStyleElement;
        if (elem) {

            elem.parentNode.removeChild(elem);
            themeStyleElement = null;
            currentThemeId = null;
        }
    }

    function getThemes() {

        if (currentSkin.getThemes) {
            return currentSkin.getThemes();
        }

        return [];
    }

    var skinManager = {
        getCurrentSkin: getCurrentSkin,
        loadSkin: loadSkin,
        loadUserSkin: loadUserSkin,
        getThemes: getThemes
    };

    function onRegistrationSuccess() {
        appSettings.set('appthemesregistered', 'true');
    }

    function onRegistrationFailure() {
        appSettings.set('appthemesregistered', 'false');
    }

    function isRegistered() {

        getRequirePromise(['registrationServices']).then(function (registrationServices) {
            registrationServices.validateFeature('themes', {

                showDialog: false

            }).then(onRegistrationSuccess, onRegistrationFailure);
        });

        return appSettings.get('appthemesregistered') !== 'false';
    }

    function getThemeStylesheetInfo(id, isDefaultProperty) {

        var themes = skinManager.getThemes();
        var defaultTheme;
        var selectedTheme;

        for (var i = 0, length = themes.length; i < length; i++) {

            var theme = themes[i];
            if (theme[isDefaultProperty]) {
                defaultTheme = theme;
            }
            if (id === theme.id) {
                selectedTheme = theme;
            }
        }

        selectedTheme = selectedTheme || defaultTheme;

        if (selectedTheme.id !== defaultTheme.id && !isRegistered()) {
            selectedTheme = defaultTheme;
        }

        var embyWebComponentsBowerPath = 'bower_components/emby-webcomponents';

        return {
            stylesheetPath: require.toUrl(embyWebComponentsBowerPath + '/themes/' + selectedTheme.id + '/theme.css'),
            themeId: selectedTheme.id
        };
    }

    skinManager.setTheme = function (id, context) {

        return new Promise(function (resolve, reject) {

            if (currentThemeId && currentThemeId === id) {
                resolve();
                return;
            }

            var isDefaultProperty = context === 'serverdashboard' ? 'isDefaultServerDashboard' : 'isDefault';
            var info = getThemeStylesheetInfo(id, isDefaultProperty);

            if (currentThemeId && currentThemeId === info.themeId) {
                resolve();
                return;
            }

            var linkUrl = info.stylesheetPath;

            unloadTheme();

            var link = document.createElement('link');

            link.setAttribute('rel', 'stylesheet');
            link.setAttribute('type', 'text/css');
            link.onload = resolve;

            link.setAttribute('href', linkUrl);
            document.head.appendChild(link);
            themeStyleElement = link;
            currentThemeId = info.themeId;
        });
    };

    return skinManager;
});