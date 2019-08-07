define(['connectionManager', 'apphost', 'userSettings', 'browser', 'events', 'pluginManager', 'backdrop', 'globalize', 'require', 'appSettings', 'layoutManager'], function (connectionManager, appHost, userSettings, browser, events, pluginManager, backdrop, globalize, require, appSettings, layoutManager) {
    'use strict';

    var themeStyleElement;
    var currentThemeId;
    var currentThemeSettings;
    function unloadTheme() {
        var elem = themeStyleElement;
        if (elem) {

            elem.parentNode.removeChild(elem);
            themeStyleElement = null;
            currentThemeId = null;
            currentThemeSettings = null;
        }
    }

    function getThemes() {

        var defaultTheme = browser.tizen || browser.orsay || browser.web0s || browser.netcast || browser.operaTv || layoutManager.mobile || self.Dashboard ?
            'dark' :
            'blueradiance';

        return [
            { name: 'Apple TV', id: 'appletv' },
            { name: 'Blue Radiance', id: 'blueradiance', isDefault: defaultTheme === 'blueradiance' },
            { name: 'Dark', id: 'dark', isDefault: defaultTheme === 'dark' },
            { name: 'Dark (green accent)', id: 'dark-green' },
            { name: 'Dark (red accent)', id: 'dark-red' },
            { name: 'Halloween', id: 'halloween' },
            { name: 'Light', id: 'light', isDefaultServerDashboard: true },
            { name: 'Light (blue accent)', id: 'light-blue' },
            { name: 'Light (green accent)', id: 'light-green' },
            { name: 'Light (pink accent)', id: 'light-pink' },
            { name: 'Light (purple accent)', id: 'light-purple' },
            { name: 'Light (red accent)', id: 'light-red' },
            { name: 'Windows Media Center', id: 'wmc' }
        ];
    }

    var skinManager = {
        loadSkin: loadSkin,
        loadUserSkin: loadUserSkin,
        getThemes: getThemes
    };

    function loadSkin() {

        return skinManager.setTheme(userSettings.theme());
    }

    function loadUserSkin(options) {

        return loadSkin().then(function (skin) {

            options = options || {};
            if (options.start) {
                Emby.Page.invokeShortcut(options.start);
            } else {
                Emby.Page.goHome();
            }
        });
    }

    events.on(userSettings, 'change', function (e, name) {
        if (name === 'language') {
            loadUserSkin();
        }
    });

    function onRegistrationSuccess() {
        appSettings.set('appthemesregistered', 'true');
    }

    function onRegistrationFailure() {
        appSettings.set('appthemesregistered', 'false');
    }

    function isRegistered() {

        require(['registrationServices']).then(function (deps) {

            var registrationServices = deps[0];

            registrationServices.validateFeature('themes', {

                showDialog: false

            }).then(onRegistrationSuccess, onRegistrationFailure);
        });

        return appSettings.get('appthemesregistered') !== 'false';
    }

    function getThemeStylesheetInfo(id, requiresRegistration, isDefaultProperty) {

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

        if (selectedTheme.id !== defaultTheme.id && requiresRegistration && !isRegistered()) {
            selectedTheme = defaultTheme;
        }

        var embyWebComponentsBowerPath = 'bower_components/emby-webcomponents';

        return {
            themeSettingsPath: 'text!./themes/' + selectedTheme.id + '/theme.json',
            stylesheetPath: require.toUrl(embyWebComponentsBowerPath + '/themes/' + selectedTheme.id + '/theme.css'),
            themeId: selectedTheme.id
        };
    }

    var themeResources = {};
    function modifyThemeForSeasonal(id) {

        if (!userSettings.enableSeasonalThemes()) {
            return id;
        }

        var date = new Date();
        var month = date.getMonth();
        var day = date.getDate();

        if (month === 9 && day >= 31) {
            return 'halloween';
        }

        return id;
    }

    var lastSound = 0;
    var currentSound;

    function loadThemeResources(id) {

        lastSound = 0;

        if (currentSound) {
            currentSound.stop();
            currentSound = null;
        }

        backdrop.clear();

        if (id === 'halloween') {
            themeResources = {
                themeSong: 'https://github.com/MediaBrowser/Emby.Resources/raw/master/themes/halloween/monsterparadefade.mp3',
                effect: 'https://github.com/MediaBrowser/Emby.Resources/raw/master/themes/halloween/howl.wav',
                backdrop: 'https://github.com/MediaBrowser/Emby.Resources/raw/master/themes/halloween/bg.jpg'
            };
            return;
        }

        themeResources = {
        };
    }

    function onThemeLoaded(themeInfo) {

        document.documentElement.classList.remove('preload');

        require([themeInfo.themeSettingsPath], function (themeSettingsJson) {

            currentThemeSettings = JSON.parse(themeSettingsJson);

            try {

                appHost.setTheme(currentThemeSettings);
            }
            catch (err) {
                console.log('Error setting theme color: ' + err);
            }
        });
    }

    skinManager.setTheme = function (id, context) {

        return new Promise(function (resolve, reject) {

            var requiresRegistration = true;

            var isServerDashboard = context === 'serverdashboard';

            if (!isServerDashboard) {

                var newId = modifyThemeForSeasonal(id);
                if (newId !== id) {
                    requiresRegistration = false;
                }
                id = newId;
            }

            if (id === 'auto' && appHost.getPreferredTheme) {
                id = appHost.getPreferredTheme() || 'dark';
                requiresRegistration = false;
            }

            if (currentThemeId && currentThemeId === id) {
                resolve();
                return;
            }

            var isDefaultProperty = isServerDashboard ? 'isDefaultServerDashboard' : 'isDefault';
            var info = getThemeStylesheetInfo(id, requiresRegistration, isDefaultProperty);

            if (currentThemeId && currentThemeId === info.themeId) {
                resolve();
                return;
            }

            var linkUrl = info.stylesheetPath;

            unloadTheme();

            var link = document.createElement('link');

            link.setAttribute('rel', 'stylesheet');
            link.setAttribute('type', 'text/css');
            link.onload = function () {

                onThemeLoaded(info);
                resolve();
            };

            link.setAttribute('href', linkUrl);
            document.head.appendChild(link);
            themeStyleElement = link;
            currentThemeId = info.themeId;
            loadThemeResources(info.themeId);

            onViewBeforeShow({});
        });
    };

    function onViewBeforeShow(e) {

        if (e.detail && e.detail.type === 'video-osd') {
            return;
        }

        if (themeResources.backdrop) {

            backdrop.setBackdrop(themeResources.backdrop);
        }

        if (!browser.mobile && userSettings.enableThemeSongs()) {
            /*if (lastSound === 0) {

                if (themeResources.themeSong) {
                    playSound(themeResources.themeSong);
                }

            } else*/ if ((new Date().getTime() - lastSound) > 30000) {
                if (themeResources.effect) {
                    playSound(themeResources.effect);
                }
            }
        }
    }

    document.addEventListener('viewshow', onViewBeforeShow);

    function playSound(path, volume) {

        lastSound = new Date().getTime();

        require(['howler'], function (howler) {

            try {
                var sound = new Howl({
                    src: [path],
                    volume: volume || 0.1
                });

                sound.play();
                currentSound = sound;
            }
            catch (err) {
                console.log('Error playing sound: ' + err);
            }
        });
    }

    var currentThemeType;
    document.addEventListener('viewbeforeshow', function (e) {

        // secondaryHeaderFeatures is a lazy attempt to detect the startup wizard
        var viewType = e.detail.dashboardTheme ?
            1 :
            0;

        if (viewType !== currentThemeType) {

            currentThemeType = viewType;

            if (viewType === 1) {

                skinManager.setTheme(userSettings.dashboardTheme(), 'serverdashboard');

            } else {
                skinManager.setTheme(userSettings.theme());
            }
        }
    });

    events.on(connectionManager, 'localusersignedin', function (e) {
        currentThemeType = null;
    });

    return skinManager;
});