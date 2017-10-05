define(['require', 'layoutManager', 'appSettings', 'pluginManager', 'apphost', 'focusManager', 'globalize', 'loading', 'connectionManager', 'skinManager', 'dom', 'events', 'emby-select', 'emby-checkbox', 'emby-linkbutton'], function (require, layoutManager, appSettings, pluginManager, appHost, focusManager, globalize, loading, connectionManager, skinManager, dom, events) {
    "use strict";

    function fillThemes(select, isDashboard) {

        select.innerHTML = skinManager.getThemes().map(function (t) {

            var value = t.id;

            if (t.isDefault && !isDashboard) {
                value = '';
            }
            else if (t.isDefaultServerDashboard && isDashboard) {
                value = '';
            }

            return '<option value="' + value + '">' + t.name + '</option>';

        }).join('');
    }

    function loadScreensavers(context) {

        var selectScreensaver = context.querySelector('.selectScreensaver');
        var options = pluginManager.ofType('screensaver').map(function (plugin) {
            return {
                name: plugin.name,
                value: plugin.id
            };
        });

        options.unshift({
            name: Globalize.translate('core#None'),
            value: 'none'
        });

        selectScreensaver.innerHTML = options.map(function (o) {
            return '<option value="' + o.value + '">' + o.name + '</option>';
        }).join('');
        selectScreensaver.value = screensaverManager.getCurrentId(true);
    }

    function loadSoundEffects(context) {

        var selectSoundEffects = context.querySelector('.selectSoundEffects');
        var options = pluginManager.ofType('soundeffects').map(function (plugin) {
            return {
                name: plugin.name,
                value: plugin.id
            };
        });

        options.unshift({
            name: Globalize.translate('core#None'),
            value: 'none'
        });

        selectSoundEffects.innerHTML = options.map(function (o) {
            return '<option value="' + o.value + '">' + o.name + '</option>';
        }).join('');
        selectSoundEffects.value = soundEffectsManager.getCurrentId();
    }

    function loadForm(context, user, userSettings, apiClient) {

        var loggedInUserId = apiClient.getCurrentUserId();
        var userId = user.Id;

        if (user.Policy.IsAdministrator) {
            context.querySelector('.selectDashboardThemeContainer').classList.remove('hide');
        } else {
            context.querySelector('.selectDashboardThemeContainer').classList.add('hide');
        }

        if (appHost.supports('displaylanguage')) {
            context.querySelector('.languageSection').classList.remove('hide');
        } else {
            context.querySelector('.languageSection').classList.add('hide');
        }

        if (appHost.supports('displaymode')) {
            context.querySelector('.fldDisplayMode').classList.remove('hide');
        } else {
            context.querySelector('.fldDisplayMode').classList.add('hide');
        }

        if (appHost.supports('runatstartup')) {
            context.querySelector('.fldAutorun').classList.remove('hide');
        } else {
            context.querySelector('.fldAutorun').classList.add('hide');
        }

        if (appHost.supports('soundeffects')) {
            context.querySelector('.fldSoundEffects').classList.remove('hide');
        } else {
            context.querySelector('.fldSoundEffects').classList.add('hide');
        }

        if (appHost.supports('screensaver')) {
            context.querySelector('.selectScreensaverContainer').classList.remove('hide');
        } else {
            context.querySelector('.selectScreensaverContainer').classList.add('hide');
        }

        context.querySelector('.chkRunAtStartup').checked = appSettings.runAtStartup();

        var selectTheme = context.querySelector('#selectTheme');
        var selectDashboardTheme = context.querySelector('#selectDashboardTheme');

        fillThemes(selectTheme);
        fillThemes(selectDashboardTheme, true);
        loadScreensavers(context);
        loadSoundEffects(context);

        context.querySelector('.chkDisplayMissingEpisodes').checked = user.Configuration.DisplayMissingEpisodes || false;

        context.querySelector('#chkThemeSong').checked = userSettings.enableThemeSongs();
        context.querySelector('#chkThemeVideo').checked = userSettings.enableThemeVideos();
        context.querySelector('#chkBackdrops').checked = userSettings.enableBackdrops();

        context.querySelector('#selectLanguage').value = userSettings.language() || '';

        selectDashboardTheme.value = userSettings.dashboardTheme() || '';
        selectTheme.value = userSettings.theme() || '';

        context.querySelector('.selectLayout').value = layoutManager.getSavedLayout() || '';

        loading.hide();
    }

    function refreshGlobalUserSettings(userSettingsInstance) {
        require(['userSettings'], function (userSettings) {
            userSettings.importFrom(userSettingsInstance);
        });
    }

    function saveUser(context, user, userSettingsInstance, apiClient) {

        appSettings.runAtStartup(context.querySelector('.chkRunAtStartup').checked);

        user.Configuration.DisplayMissingEpisodes = context.querySelector('.chkDisplayMissingEpisodes').checked;

        if (appHost.supports('displaylanguage')) {
            userSettingsInstance.language(context.querySelector('#selectLanguage').value);
        }

        userSettingsInstance.enableThemeSongs(context.querySelector('#chkThemeSong').checked);
        userSettingsInstance.enableThemeVideos(context.querySelector('#chkThemeVideo').checked);
        userSettingsInstance.dashboardTheme(context.querySelector('#selectDashboardTheme').value);
        userSettingsInstance.theme(context.querySelector('#selectTheme').value);
        userSettingsInstance.set('soundeffects', context.querySelector('.selectSoundEffects').value);
        userSettingsInstance.set('screensaver', context.querySelector('.selectScreensaver').value);

        userSettingsInstance.enableBackdrops(context.querySelector('#chkBackdrops').checked);

        if (user.Id === Dashboard.getCurrentUserId()) {

            skinManager.setTheme(userSettingsInstance.theme());
            refreshGlobalUserSettings(userSettingsInstance);
        }

        layoutManager.setLayout(context.querySelector('.selectLayout').value);

        return apiClient.updateUserConfiguration(user.Id, user.Configuration);
    }

    function save(instance, context, userId, userSettings, apiClient, enableSaveConfirmation) {

        loading.show();

        apiClient.getUser(userId).then(function (user) {

            saveUser(context, user, userSettings, apiClient).then(function () {

                loading.hide();
                if (enableSaveConfirmation) {
                    require(['toast'], function (toast) {
                        toast(globalize.translate('sharedcomponents#SettingsSaved'));
                    });
                }

                events.trigger(instance, 'saved');

            }, function () {
                loading.hide();
            });
        });
    }

    function onSubmit(e) {

        var self = this;
        var apiClient = connectionManager.getApiClient(self.options.serverId);
        var userId = self.options.userId;
        var userSettings = self.options.userSettings;

        userSettings.setUserInfo(userId, apiClient).then(function () {

            var enableSaveConfirmation = self.options.enableSaveConfirmation;
            save(self, self.options.element, userId, userSettings, apiClient, enableSaveConfirmation);
        });

        // Disable default form submission
        if (e) {
            e.preventDefault();
        }
        return false;
    }

    function embed(options, self) {

        require(['text!./displaysettings.template.html'], function (template) {

            options.element.innerHTML = globalize.translateDocument(template, 'sharedcomponents');

            options.element.querySelector('form').addEventListener('submit', onSubmit.bind(self));

            if (options.enableSaveButton) {
                options.element.querySelector('.btnSave').classList.remove('hide');
            }

            self.loadData();

            if (options.autoFocus) {
                focusManager.autoFocus(options.element);
            }
        });
    }

    function DisplaySettings(options) {

        this.options = options;

        embed(options, this);
    }

    DisplaySettings.prototype.loadData = function () {

        var self = this;
        var context = self.options.element;

        loading.show();

        var userId = self.options.userId;
        var apiClient = connectionManager.getApiClient(self.options.serverId);
        var userSettings = self.options.userSettings;

        apiClient.getUser(userId).then(function (user) {

            userSettings.setUserInfo(userId, apiClient).then(function () {

                self.dataLoaded = true;

                loadForm(context, user, userSettings, apiClient);
            });
        });
    };

    DisplaySettings.prototype.submit = function () {
        onSubmit.call(this);
    };

    DisplaySettings.prototype.destroy = function () {

        this.options = null;
    };

    return DisplaySettings;
});