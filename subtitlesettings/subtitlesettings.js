define(['require', 'globalize', 'appSettings', 'apphost', 'focusManager', 'loading', 'connectionManager', 'subtitleAppearanceHelper', 'dom', 'events', 'listViewStyle', 'emby-select', 'emby-input', 'emby-checkbox', 'flexStyles'], function (require, globalize, appSettings, appHost, focusManager, loading, connectionManager, subtitleAppearanceHelper, dom, events) {
    "use strict";

    function populateLanguages(select, languages) {

        var html = "";

        html += "<option value=''>" + globalize.translate('AnyLanguage') + "</option>";

        for (var i = 0, length = languages.length; i < length; i++) {

            var culture = languages[i];

            html += "<option value='" + culture.ThreeLetterISOLanguageName + "'>" + culture.DisplayName + "</option>";
        }

        select.innerHTML = html;
    }

    function numberToPercentString(value) {

        try {

            return new Intl.NumberFormat(globalize.getCurrentLocales(), { style: 'percent' }).format(value / 100);
        }
        catch (err) {

            console.log('Error in NumberFormat: ' + err);

            return value + '%';
        }
    }

    function populateVerticalPosition(select) {

        var options = [
            { name: numberToPercentString(90), value: 90 },
            { name: numberToPercentString(80), value: 80 },
            { name: numberToPercentString(70), value: 70 },
            { name: numberToPercentString(60), value: 60 },
            { name: numberToPercentString(50), value: 50 },
            { name: numberToPercentString(40), value: 40 },
            { name: numberToPercentString(30), value: 30 },
            { name: numberToPercentString(20), value: 20 },
            { name: numberToPercentString(10), value: 10 },
            { name: globalize.translate('Bottom'), value: 0 }
        ];

        options.reverse();

        select.innerHTML = options.map(function (o) {

            return '<option value="' + o.value + '">' + o.name + '</option>';

        }).join('');
    }

    function getSubtitleAppearanceObject(context) {

        var appearanceSettings = {};

        appearanceSettings.verticalPosition = context.querySelector('#selectVerticalPosition').value;
        appearanceSettings.textSize = context.querySelector('#selectTextSize').value;
        appearanceSettings.dropShadow = context.querySelector('#selectDropShadow').value;
        appearanceSettings.textBackground = context.querySelector('#inputTextBackground').value;
        appearanceSettings.textColor = context.querySelector('#inputTextColor').value;

        return appearanceSettings;
    }

    function loadForm(context, user, userSettings, appearanceSettings, apiClient) {

        apiClient.getCultures().then(function (allCultures) {

            if (appHost.supports('subtitleburnsettings') && user.Policy.EnableVideoPlaybackTranscoding) {
                context.querySelector('.fldBurnIn').classList.remove('hide');
            }

            var selectSubtitleLanguage = context.querySelector('#selectSubtitleLanguage');
            populateLanguages(selectSubtitleLanguage, allCultures);
            selectSubtitleLanguage.value = user.Configuration.SubtitleLanguagePreference || "";

            var selectVerticalPosition = context.querySelector('#selectVerticalPosition');
            populateVerticalPosition(selectVerticalPosition);
            selectVerticalPosition.value = appearanceSettings.verticalPosition || '10';

            context.querySelector('#selectSubtitlePlaybackMode').value = user.Configuration.SubtitleMode || "";
            context.querySelector('#selectSubtitlePlaybackMode').dispatchEvent(new CustomEvent('change', {}));

            context.querySelector('#selectTextSize').value = appearanceSettings.textSize || '';
            context.querySelector('#selectDropShadow').value = appearanceSettings.dropShadow || '';
            context.querySelector('#inputTextBackground').value = appearanceSettings.textBackground || 'transparent';
            context.querySelector('#inputTextColor').value = appearanceSettings.textColor || '#ffffff';

            context.querySelector('#selectSubtitleBurnIn').value = appSettings.get('subtitleburnin') || '';

            onAppearanceFieldChange({
                target: context.querySelector('#selectTextSize')
            });

            onAppearanceFieldChange({
                target: context.querySelector('#selectVerticalPosition')
            });

            loading.hide();
        });
    }

    function saveUser(context, user, userSettingsInstance, appearanceKey, apiClient) {

        var appearanceSettings = userSettingsInstance.getSubtitleAppearanceSettings(appearanceKey);
        appearanceSettings = Object.assign(appearanceSettings, getSubtitleAppearanceObject(context));

        userSettingsInstance.setSubtitleAppearanceSettings(appearanceSettings, appearanceKey);

        user.Configuration.SubtitleLanguagePreference = context.querySelector('#selectSubtitleLanguage').value;
        user.Configuration.SubtitleMode = context.querySelector('#selectSubtitlePlaybackMode').value;

        return apiClient.updateUserConfiguration(user.Id, user.Configuration);
    }

    function save(instance, context, userId, userSettings, apiClient, enableSaveConfirmation) {

        loading.show();

        appSettings.set('subtitleburnin', context.querySelector('#selectSubtitleBurnIn').value);

        apiClient.getUser(userId).then(function (user) {

            saveUser(context, user, userSettings, instance.appearanceKey, apiClient).then(function () {

                loading.hide();
                if (enableSaveConfirmation) {
                    require(['toast'], function (toast) {
                        toast(globalize.translate('SettingsSaved'));
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

    function onSubtitleModeChange(e) {

        var view = dom.parentWithClass(e.target, 'subtitlesettings');

        var subtitlesHelp = view.querySelectorAll('.subtitlesHelp');
        for (var i = 0, length = subtitlesHelp.length; i < length; i++) {
            subtitlesHelp[i].classList.add('hide');
        }
        view.querySelector('.subtitles' + this.value + 'Help').classList.remove('hide');
    }

    function onAppearanceFieldChange(e) {

        var view = dom.parentWithClass(e.target, 'subtitlesettings');

        var appearanceSettings = getSubtitleAppearanceObject(view);

        var elements = {
            window: view.querySelector('.subtitleappearance-preview-window'),
            text: view.querySelector('.subtitleappearance-preview-text')
        };

        subtitleAppearanceHelper.applyStyles(elements, appearanceSettings);
    }

    function embed(options, self) {

        require(['text!./subtitlesettings.template.html'], function (template) {

            options.element.classList.add('subtitlesettings');
            options.element.innerHTML = globalize.translateDocument(template, 'sharedcomponents');

            options.element.querySelector('form').addEventListener('submit', onSubmit.bind(self));

            options.element.querySelector('#selectSubtitlePlaybackMode').addEventListener('change', onSubtitleModeChange);
            options.element.querySelector('#selectTextSize').addEventListener('change', onAppearanceFieldChange);
            options.element.querySelector('#selectVerticalPosition').addEventListener('change', onAppearanceFieldChange);
            options.element.querySelector('#selectDropShadow').addEventListener('change', onAppearanceFieldChange);
            options.element.querySelector('#inputTextColor').addEventListener('change', onAppearanceFieldChange);
            options.element.querySelector('#inputTextBackground').addEventListener('change', onAppearanceFieldChange);

            if (options.enableSaveButton) {
                options.element.querySelector('.btnSave').classList.remove('hide');
            }

            if (appHost.supports('subtitleappearancesettings')) {
                options.element.querySelector('.subtitleAppearanceSection').classList.remove('hide');
            }

            self.loadData();

            if (options.autoFocus) {
                focusManager.autoFocus(options.element);
            }
        });
    }

    function SubtitleSettings(options) {

        this.options = options;

        embed(options, this);
    }

    SubtitleSettings.prototype.loadData = function () {

        var self = this;
        var context = self.options.element;

        loading.show();

        var userId = self.options.userId;
        var apiClient = connectionManager.getApiClient(self.options.serverId);
        var userSettings = self.options.userSettings;

        apiClient.getUser(userId).then(function (user) {

            userSettings.setUserInfo(userId, apiClient).then(function () {

                self.dataLoaded = true;

                var appearanceSettings = userSettings.getSubtitleAppearanceSettings(self.options.appearanceKey);

                loadForm(context, user, userSettings, appearanceSettings, apiClient);
            });
        });
    };

    SubtitleSettings.prototype.submit = function () {
        onSubmit.call(this);
    };

    SubtitleSettings.prototype.destroy = function () {

        this.options = null;
    };

    return SubtitleSettings;
});