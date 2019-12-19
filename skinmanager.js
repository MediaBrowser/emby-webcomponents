define(['connectionManager', 'apphost', 'userSettings', 'browser', 'events', 'pluginManager', 'backdrop', 'globalize', 'require', 'appSettings', 'layoutManager'], function (connectionManager, appHost, userSettings, browser, events, pluginManager, backdrop, globalize, require, appSettings, layoutManager) {
    'use strict';

    var themeStyleElement;
    var currentThemeId;
    var currentThemeSettings;

    function tryRemove(elem) {

        try {
            elem.parentNode.removeChild(elem);
        }
        catch (err) {
            console.log('Error removing child node: ' + err);
        }
    }

    var supportsCssVariables = window.CSS && CSS.supports && CSS.supports('color', 'var(--fake-var)');

    function unloadTheme() {
        var elem = themeStyleElement;
        if (elem) {

            // This is crashing on netcast
            if (!supportsCssVariables && !browser.netcast) {
                var nextSibling = elem.nextSibling;
                if (nextSibling && nextSibling.getAttribute('data-cssvars-job')) {
                    tryRemove(nextSibling);
                }
            }

            tryRemove(elem);
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
            { name: 'Black', id: 'black', isDefault: defaultTheme === 'black' },
            { name: 'Blue Radiance', id: 'blueradiance', isDefault: defaultTheme === 'blueradiance' },
            { name: 'Dark', id: 'dark', isDefault: defaultTheme === 'dark' },
            { name: 'Dark (red accent)', id: 'dark-red' },
            { name: 'Halloween', id: 'halloween' },
            { name: 'Holidays', id: 'holiday' },
            { name: 'Light', id: 'light' },
            { name: 'Light (blue accent)', id: 'light-blue' },
            { name: 'Light (pink accent)', id: 'light-pink' },
            { name: 'Light (purple accent)', id: 'light-purple' },
            { name: 'Light (red accent)', id: 'light-red' },
            { name: 'Windows Media Center', id: 'wmc' }
        ];
    }

    var skinManager = {
        loadUserSkin: loadUserSkin,
        getThemes: getThemes
    };

    function loadUserSkin(options) {

        return skinManager.setTheme(userSettings.theme()).then(function () {

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

    function getThemeStylesheetInfo(id, requiresRegistration) {

        var themes = skinManager.getThemes();
        var defaultTheme;
        var selectedTheme;

        for (var i = 0, length = themes.length; i < length; i++) {

            var theme = themes[i];
            if (theme.isDefault) {
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

        if (month === 11 && day >= 24 && day <= 25) {
            return 'holiday';
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
                backdrop: 'https://github.com/MediaBrowser/Emby.Resources/raw/master/themes/halloween/bg.jpg'
            };
            return;
        }

        if (id === 'holiday') {
            themeResources = {
                backdrop: 'https://github.com/MediaBrowser/Emby.Resources/raw/master/themes/holiday/bgc3.jpg'
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

    function polyfillCssVars(elementId) {

        require(['cssVars'], function (cssVars) {
            cssVars({
                watch: false,
                include: '#' + elementId,
                onlyLegacy: false,
                preserveVars: false,
                shadowDOM: false
            });
        });
    }

    var linkId = Date.now();

    skinManager.setTheme = function (id, context) {

        return new Promise(function (resolve, reject) {

            var requiresRegistration = true;

            var isSettings = context === 'settings';

            if (!isSettings) {

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

            var info = getThemeStylesheetInfo(id, requiresRegistration);

            if (currentThemeId && currentThemeId === info.themeId) {
                resolve();
                return;
            }

            var linkUrl = info.stylesheetPath;

            unloadTheme();

            var link = document.createElement('link');

            linkId++;
            var elementId = 'link_' + linkId;
            link.id = elementId;

            link.setAttribute('rel', 'stylesheet');
            link.setAttribute('type', 'text/css');
            link.onload = function () {

                onThemeLoaded(info);
                if (!supportsCssVariables && !browser.netcast) {
                    polyfillCssVars(elementId);
                }
                resolve();
            };

            link.setAttribute('href', linkUrl);
            document.head.appendChild(link);
            themeStyleElement = link;
            currentThemeId = info.themeId;
            loadThemeResources(info.themeId);

            loadThemeBackdrop();

            document.removeEventListener('viewshow', onViewBeforeShow);

            if (themeResources.backdrop) {

                document.addEventListener('viewshow', onViewBeforeShow);
            }
        });
    };

    function loadThemeBackdrop() {
        if (themeResources.backdrop) {

            backdrop.setBackdrop(themeResources.backdrop);
        }
    }

    function onViewBeforeShow(e) {

        if (e.detail && e.detail.type === 'video-osd') {
            return;
        }

        loadThemeBackdrop();
    }

    function playSound(path, volume) {

        lastSound = Date.now();

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

    function changeTheme(viewType) {

        if (viewType === 1) {

            var settingsTheme = userSettings.settingsTheme();

            if (settingsTheme) {
                skinManager.setTheme(settingsTheme, 'settings');
                return;
            }
        }

        skinManager.setTheme(userSettings.theme());
    }

    function onThemeSettingChange(e, name) {

        if (name === 'appTheme' || name === 'settingsTheme') {
            changeTheme(currentThemeType);
        }
    }

    var currentThemeType;
    document.addEventListener('viewbeforeshow', function (e) {

        // secondaryHeaderFeatures is a lazy attempt to detect the startup wizard
        var viewType = e.detail.settingsTheme ?
            1 :
            0;

        if (viewType !== currentThemeType) {

            currentThemeType = viewType;

            changeTheme(viewType);
        }
    });

    events.on(userSettings, 'change', onThemeSettingChange);

    events.on(connectionManager, 'localusersignedin', function (e) {
        currentThemeType = null;
    });

    return skinManager;
});