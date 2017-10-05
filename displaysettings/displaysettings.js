define(['require', 'appSettings', 'apphost', 'focusManager', 'globalize', 'loading', 'connectionManager', 'skinManager', 'dom', 'events', 'emby-select', 'emby-checkbox', 'emby-linkbutton'], function (require, appSettings, appHost, focusManager, globalize, loading, connectionManager, skinManager, dom, events) {
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

    function loadForm(context, user, userSettings, apiClient) {

        var loggedInUserId = apiClient.getCurrentUserId();
        var userId = user.Id;

        if (user.Policy.IsAdministrator) {
            context.querySelector('.selectDashboardThemeContainer').classList.remove('hide');
        } else {
            context.querySelector('.selectDashboardThemeContainer').classList.add('hide');
        }

        var selectTheme = context.querySelector('#selectTheme');
        var selectDashboardTheme = context.querySelector('#selectDashboardTheme');

        fillThemes(selectTheme);
        fillThemes(selectDashboardTheme, true);

        context.querySelector('.chkDisplayMissingEpisodes').checked = user.Configuration.DisplayMissingEpisodes || false;

        context.querySelector('#chkThemeSong').checked = userSettings.enableThemeSongs();
        context.querySelector('#selectBackdrop').value = appStorage.getItem('enableBackdrops-' + user.Id) || '0';

        context.querySelector('#selectLanguage').value = userSettings.language() || '';

        selectDashboardTheme.value = userSettings.dashboardTheme() || '';
        selectTheme.value = userSettings.theme() || '';

        loading.hide();
    }

    function refreshGlobalUserSettings(userSettingsInstance) {
        require(['userSettings'], function (userSettings) {
            userSettings.importFrom(userSettingsInstance);
        });
    }

    function saveUser(context, user, userSettingsInstance, apiClient) {

        if (user.Id === apiClient.getCurrentUserId()) {
            refreshGlobalUserSettings(userSettingsInstance);
        }

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