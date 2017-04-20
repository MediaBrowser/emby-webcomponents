define(['require', 'globalize', 'loading', 'connectionManager', 'homeSections', 'dom', 'events', 'listViewStyle', 'emby-select', 'emby-checkbox', 'css!./homescreensettings'], function (require, globalize, loading, connectionManager, homeSections, dom, events) {
    "use strict";

    var numConfigurableSections = 7;

    function renderLatestItems(context, user, result) {

        var folderHtml = '';

        folderHtml += '<div class="checkboxList">';
        var excludeViewTypes = ['playlists', 'livetv', 'boxsets', 'channels'];
        var excludeItemTypes = ['Channel'];

        folderHtml += result.Items.map(function (i) {

            if (excludeViewTypes.indexOf(i.CollectionType || []) !== -1) {
                return '';
            }

            // not implemented yet
            if (excludeItemTypes.indexOf(i.Type) !== -1) {
                return '';
            }

            var currentHtml = '';

            var id = 'chkIncludeInLatest' + i.Id;

            var isChecked = user.Configuration.LatestItemsExcludes.indexOf(i.Id) === -1;
            var checkedHtml = isChecked ? ' checked="checked"' : '';

            currentHtml += '<label>';
            currentHtml += '<input type="checkbox" is="emby-checkbox" class="chkIncludeInLatest" data-folderid="' + i.Id + '" id="' + id + '"' + checkedHtml + '/>';
            currentHtml += '<span>' + i.Name + '</span>';
            currentHtml += '</label>';

            return currentHtml;

        }).join('');

        folderHtml += '</div>';

        context.querySelector('.latestItemsList').innerHTML = folderHtml;
    }

    function renderViews(page, user, result) {

        var folderHtml = '';

        folderHtml += '<div class="checkboxList">';
        folderHtml += result.map(function (i) {

            var currentHtml = '';

            var id = 'chkGroupFolder' + i.Id;

            var isChecked = user.Configuration.GroupedFolders.indexOf(i.Id) !== -1;

            var checkedHtml = isChecked ? ' checked="checked"' : '';

            currentHtml += '<label>';
            currentHtml += '<input type="checkbox" is="emby-checkbox" class="chkGroupFolder" data-folderid="' + i.Id + '" id="' + id + '"' + checkedHtml + '/>';
            currentHtml += '<span>' + i.Name + '</span>';
            currentHtml += '</label>';

            return currentHtml;

        }).join('');

        folderHtml += '</div>';

        page.querySelector('.folderGroupList').innerHTML = folderHtml;
    }

    function getLandingScreenOptions(type) {

        var list = [];

        list.push({
            name: globalize.translate('sharedcomponents#Suggestions'),
            value: 'suggestions',
            isDefault: true
        });

        if (type === 'movies') {

            list.push({
                name: globalize.translate('sharedcomponents#Movies'),
                value: 'movies'
            });
            list.push({
                name: globalize.translate('sharedcomponents#Favorites'),
                value: 'favorites'
            });
            list.push({
                name: globalize.translate('sharedcomponents#Collections'),
                value: 'collections'
            });
        }
        else if (type === 'tvshows') {

            list.push({
                name: globalize.translate('sharedcomponents#Latest'),
                value: 'latest'
            });
            list.push({
                name: globalize.translate('sharedcomponents#Shows'),
                value: 'shows'
            });
            list.push({
                name: globalize.translate('sharedcomponents#Favorites'),
                value: 'favorites'
            });
        }

        list.push({
            name: globalize.translate('sharedcomponents#Genres'),
            value: 'genres'
        });

        return list;
    }

    function getLandingScreenOptionsHtml(type, userValue) {

        return getLandingScreenOptions(type).map(function (o) {

            var selected = userValue === o.value || (o.isDefault && !userValue);
            var selectedHtml = selected ? ' selected' : '';
            var optionValue = o.isDefault ? '' : o.value;

            return '<option value="' + optionValue + '"' + selectedHtml + '>' + o.name + '</option>';
        }).join('');
    }

    function renderLandingScreens(context, user, userSettings, result) {

        var html = '';

        for (var i = 0, length = result.Items.length; i < length; i++) {
            var folder = result.Items[i];

            if (!(folder.CollectionType === 'movies' || folder.CollectionType === 'tvshows')) {
                continue;
            }

            html += '<div class="selectContainer">';
            html += '<select is="emby-select" class="selectLanding" data-folderid="' + folder.Id + '" label="' + folder.Name + '">';

            var userValue = userSettings.get('landing-' + folder.Id);

            html += getLandingScreenOptionsHtml(folder.CollectionType, userValue);

            html += '</select>';
            html += '</div>';
        }

        context.querySelector('.landingScreens').innerHTML = html;

        if (html) {
            context.querySelector('.landingScreensSection').classList.remove('hide');
        } else {
            context.querySelector('.landingScreensSection').classList.add('hide');
        }
    }

    function renderViewOrder(context, user, result) {

        var html = '';

        var index = 0;

        html += result.Items.map(function (view) {

            var currentHtml = '';

            currentHtml += '<div class="listItem viewItem" data-viewid="' + view.Id + '">';

            currentHtml += '<i class="md-icon listItemIcon">&#xE2C8;</i>';

            currentHtml += '<div class="listItemBody">';

            currentHtml += '<div>';
            currentHtml += view.Name;
            currentHtml += '</div>';

            currentHtml += '</div>';

            currentHtml += '<button type="button" is="paper-icon-button-light" class="btnViewItemUp btnViewItemMove autoSize" title="' + globalize.translate('sharedcomponents#Up') + '"><i class="md-icon">&#xE316;</i></button>';
            currentHtml += '<button type="button" is="paper-icon-button-light" class="btnViewItemDown btnViewItemMove autoSize" title="' + globalize.translate('sharedcomponents#Down') + '"><i class="md-icon">&#xE313;</i></button>';

            currentHtml += '</div>';

            index++;
            return currentHtml;

        }).join('');

        context.querySelector('.viewOrderList').innerHTML = html;
    }

    function updateHomeSectionValues(context, userSettings) {

        for (var i = 1; i <= 7; i++) {

            var select = context.querySelector('#selectHomeSection' + i);
            var defaultValue = homeSections.getDefaultSection(i - 1);

            var option = select.querySelector('option[value=' + defaultValue + ']') || select.querySelector('option[value=""]');

            var userValue = userSettings.get('homesection' + (i - 1));

            option.value = '';

            if (userValue === defaultValue || !userValue) {
                select.value = '';
            } else {
                select.value = userValue;
            }
        }
    }

    function loadForm(context, user, userSettings, apiClient) {

        context.querySelector('.chkHidePlayedFromLatest').checked = user.Configuration.HidePlayedInLatest || false;

        updateHomeSectionValues(context, userSettings);

        var promise1 = apiClient.getUserViews({}, user.Id);
        var promise2 = ApiClient.getJSON(ApiClient.getUrl("Users/" + user.Id + "/GroupingOptions"));

        Promise.all([promise1, promise2]).then(function (responses) {

            renderViews(context, user, responses[1]);
            renderLatestItems(context, user, responses[0]);
            renderViewOrder(context, user, responses[0]);
            renderLandingScreens(context, user, userSettings, responses[0]);

            loading.hide();
        });
    }

    function getSibling(elem, type, className) {

        var sibling = elem[type];

        while (sibling != null) {
            if (sibling.classList.contains(className)) {
                break;
            }
        }

        if (sibling != null) {
            if (!sibling.classList.contains(className)) {
                sibling = null;
            }
        }

        return sibling;
    }

    function onSectionOrderListClick(e) {

        var target = dom.parentWithClass(e.target, 'btnViewItemMove');

        if (target) {
            var viewItem = dom.parentWithClass(target, 'viewItem');

            if (viewItem) {
                var ul = dom.parentWithClass(viewItem, 'paperList');

                if (target.classList.contains('btnViewItemDown')) {

                    var next = viewItem.nextSibling;

                    if (next) {
                        viewItem.parentNode.removeChild(viewItem);
                        next.parentNode.insertBefore(viewItem, next.nextSibling);
                    }

                } else {

                    var prev = viewItem.previousSibling;

                    if (prev) {
                        viewItem.parentNode.removeChild(viewItem);
                        prev.parentNode.insertBefore(viewItem, prev);
                    }
                }
            }
        }
    }

    function getCheckboxItems(selector, context, isChecked) {

        var inputs = context.querySelectorAll(selector);
        var list = [];

        for (var i = 0, length = inputs.length; i < length; i++) {

            if (inputs[i].checked === isChecked) {
                list.push(inputs[i]);
            }

        }

        return list;
    }

    function refreshGlobalUserSettings(userSettingsInstance) {
        require(['userSettings'], function (userSettings) {
            userSettings.importFrom(userSettingsInstance);
        });
    }

    function saveUser(context, user, userSettingsInstance, apiClient) {

        user.Configuration.HidePlayedInLatest = context.querySelector('.chkHidePlayedFromLatest').checked;

        user.Configuration.LatestItemsExcludes = getCheckboxItems(".chkIncludeInLatest", context, false).map(function (i) {

            return i.getAttribute('data-folderid');
        });

        user.Configuration.GroupedFolders = getCheckboxItems(".chkGroupFolder", context, true).map(function (i) {

            return i.getAttribute('data-folderid');
        });

        var viewItems = context.querySelectorAll('.viewItem');
        var orderedViews = [];
        var i, length;
        for ( i = 0, length = viewItems.length; i < length; i++) {
            orderedViews.push(viewItems[i].getAttribute('data-viewid'));
        }

        user.Configuration.OrderedViews = orderedViews;

        userSettingsInstance.set('homesection0', context.querySelector('#selectHomeSection1').value);
        userSettingsInstance.set('homesection1', context.querySelector('#selectHomeSection2').value);
        userSettingsInstance.set('homesection2', context.querySelector('#selectHomeSection3').value);
        userSettingsInstance.set('homesection3', context.querySelector('#selectHomeSection4').value);
        userSettingsInstance.set('homesection4', context.querySelector('#selectHomeSection5').value);
        userSettingsInstance.set('homesection5', context.querySelector('#selectHomeSection6').value);
        userSettingsInstance.set('homesection6', context.querySelector('#selectHomeSection7').value);

        var selectLandings = context.querySelectorAll('.selectLanding');
        for (i = 0, length = selectLandings.length; i < length; i++) {
            var selectLanding = selectLandings[i];
            userSettingsInstance.set('landing-' + selectLanding.getAttribute('data-folderid'), selectLanding.value);
        }

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

        require(['text!./homescreensettings.template.html'], function (template) {

            for (var i = 1; i <= numConfigurableSections; i++) {
                template = template.replace('{section' + i + 'label}', globalize.translate('sharedcomponents#LabelHomeScreenSectionValue', i));
            }

            options.element.innerHTML = globalize.translateDocument(template, 'sharedcomponents');

            options.element.querySelector('.viewOrderList').addEventListener('click', onSectionOrderListClick);
            options.element.querySelector('form').addEventListener('submit', onSubmit.bind(self));

            if (options.enableSaveButton) {
                options.element.querySelector('.btnSave').classList.remove('hide');
            }

            self.loadData();
        });
    }

    function HomeScreenSettings(options) {

        this.options = options;

        embed(options, this);
    }

    HomeScreenSettings.prototype.loadData = function () {

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

    HomeScreenSettings.prototype.submit = function () {
        onSubmit.call(this);
    };

    HomeScreenSettings.prototype.destroy = function () {

        this.options = null;
    };

    return HomeScreenSettings;
});