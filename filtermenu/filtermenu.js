﻿define(['require', 'dom', 'focusManager', 'dialogHelper', 'loading', 'apphost', 'inputManager', 'layoutManager', 'connectionManager', 'appRouter', 'globalize', 'userSettings', 'emby-checkbox', 'emby-input', 'emby-select', 'paper-icon-button-light', 'emby-select', 'material-icons', 'css!./../formdialog', 'emby-button', 'emby-linkbutton', 'flexStyles'], function (require, dom, focusManager, dialogHelper, loading, appHost, inputManager, layoutManager, connectionManager, appRouter, globalize, userSettings) {
    'use strict';

    function onSubmit(e) {

        e.preventDefault();
        return false;
    }

    function renderList(container, items, options, property, delimeter, enableId) {

        var anySelected = false;
        var value = options.settings[property];

        var html = items.map(function (i) {

            var itemId = enableId !== false ? i.Id || i.Name : i.Name;
            var selected = (delimeter + (value || '') + delimeter).indexOf(delimeter + itemId + delimeter) !== -1;

            var selectedHtml = selected && !anySelected ? ' selected' : '';
            if (selected) {
                anySelected = true;
            }
            return '<option value="' + itemId + '"' + selectedHtml + '>' + i.Name + '</option>';

        }).join('');

        var allText = globalize.translate('Any');

        var prefix = anySelected ?
            '<option value="">' + allText + '</option>' :
            '<option value="" selected>' + allText + '</option>';

        container.querySelector('select').innerHTML = prefix + html;

        if (items.length) {
            container.classList.remove('hide');

            var multiSettingsSection = dom.parentWithClass(container, 'multiSettingsSection');
            if (multiSettingsSection) {
                multiSettingsSection.classList.remove('hide');
            }
        } else {
            container.classList.add('hide');
        }
    }

    function loadPlayState(context, options) {

        var anySelected = false;
        var menuItems = [];

        if (options.visibleSettings.indexOf('IsPlayed') !== -1) {
            menuItems.push({
                name: globalize.translate('Played'),
                value: 'IsPlayed'
            });
        }
        if (options.visibleSettings.indexOf('IsUnplayed') !== -1) {
            menuItems.push({
                name: globalize.translate('Unplayed'),
                value: 'IsUnplayed'
            });
        }
        if (options.visibleSettings.indexOf('IsResumable') !== -1) {
            menuItems.push({
                name: globalize.translate('ContinuePlaying'),
                value: 'IsResumable'
            });
        }

        var html = menuItems.map(function (m) {

            var optionSelected = !anySelected && (options.settings[m.value] || false);
            var selectedHtml = '';
            if (optionSelected) {
                anySelected = true;
                selectedHtml = ' selected';
            }

            return '<option value="' + m.value + '" ' + selectedHtml + '>' + m.name + '</option>';

        }).join('');

        var allText = globalize.translate('Any');

        var prefix = anySelected ?
            '<option value="">' + allText + '</option>' :
            '<option value="" selected>' + allText + '</option>';

        context.querySelector('.selectPlaystate').innerHTML = prefix + html;

        if (menuItems.length) {
            context.querySelector('.playstateFilters').classList.remove('hide');
        } else {
            context.querySelector('.playstateFilters').classList.add('hide');
        }
    }

    function handleQueryError() {

        // For older servers
    }

    function loadGenres(context, options) {

        var apiClient = connectionManager.getApiClient(options.serverId);

        var query = Object.assign(options.filterMenuOptions, {

            SortBy: "SortName",
            SortOrder: "Ascending",
            Recursive: options.Recursive == null ? true : options.Recursive,
            EnableTotalRecordCount: false,
            EnableImages: false,
            EnableUserData: false,
            GenreIds: options.GenreIds,
            PersonIds: options.PersonIds,
            StudioIds: options.StudioIds,
            ParentId: options.parentId,
            IncludeItemTypes: options.itemTypes.join(',')
        });

        apiClient.getGenres(apiClient.getCurrentUserId(), query).then(function (result) {

            renderList(context.querySelector('.genreFilters'), result.Items, options, 'GenreIds', ',');

        }, handleQueryError);
    }

    function loadStudios(context, options) {

        var apiClient = connectionManager.getApiClient(options.serverId);

        var query = Object.assign(options.filterMenuOptions, {

            SortBy: "SortName",
            SortOrder: "Ascending",
            Recursive: options.Recursive == null ? true : options.Recursive,
            EnableTotalRecordCount: false,
            EnableImages: false,
            EnableUserData: false,
            GenreIds: options.GenreIds,
            PersonIds: options.PersonIds,
            StudioIds: options.StudioIds,
            ParentId: options.parentId,
            IncludeItemTypes: options.itemTypes.join(',')
        });

        apiClient.getStudios(apiClient.getCurrentUserId(), query).then(function (result) {

            renderList(context.querySelector('.studioFilters'), result.Items, options, 'StudioIds', ',');

        }, handleQueryError);
    }

    function loadOfficialRatings(context, options) {

        var apiClient = connectionManager.getApiClient(options.serverId);

        var query = Object.assign(options.filterMenuOptions, {

            SortBy: "SortName",
            SortOrder: "Ascending",
            Recursive: options.Recursive == null ? true : options.Recursive,
            EnableTotalRecordCount: false,
            EnableImages: false,
            EnableUserData: false,
            GenreIds: options.GenreIds,
            PersonIds: options.PersonIds,
            StudioIds: options.StudioIds,
            ParentId: options.parentId,
            IncludeItemTypes: options.itemTypes.join(',')
        });

        apiClient.getOfficialRatings(apiClient.getCurrentUserId(), query).then(function (result) {

            renderList(context.querySelector('.officialRatingFilters'), result.Items, options, 'OfficialRatings', '|');

        }, handleQueryError);
    }

    function loadTags(context, options) {

        var apiClient = connectionManager.getApiClient(options.serverId);

        var query = Object.assign(options.filterMenuOptions, {

            SortBy: "SortName",
            SortOrder: "Ascending",
            Recursive: options.Recursive == null ? true : options.Recursive,
            EnableTotalRecordCount: false,
            EnableImages: false,
            EnableUserData: false,
            GenreIds: options.GenreIds,
            PersonIds: options.PersonIds,
            StudioIds: options.StudioIds,
            ParentId: options.parentId,
            IncludeItemTypes: options.itemTypes.join(',')
        });

        apiClient.getTags(apiClient.getCurrentUserId(), query).then(function (result) {

            if (apiClient.isMinServerVersion('4.2.0.16')) {
                renderList(context.querySelector('.tagFilters'), result.Items, options, 'TagIds', '|');
            } else {
                renderList(context.querySelector('.tagFilters'), result.Items, options, 'Tags', '|', false);
            }

        }, handleQueryError);
    }

    function loadYears(context, options) {

        var apiClient = connectionManager.getApiClient(options.serverId);

        if (!apiClient.isMinServerVersion('3.6.0.53')) {
            return Promise.resolve();
        }

        var query = Object.assign(options.filterMenuOptions, {

            SortBy: "SortName",
            SortOrder: "Ascending",
            Recursive: options.Recursive == null ? true : options.Recursive,
            EnableTotalRecordCount: false,
            EnableImages: false,
            EnableUserData: false,
            GenreIds: options.GenreIds,
            PersonIds: options.PersonIds,
            StudioIds: options.StudioIds,
            ParentId: options.parentId,
            IncludeItemTypes: options.itemTypes.join(',')
        });

        apiClient.getYears(apiClient.getCurrentUserId(), query).then(function (result) {

            renderList(context.querySelector('.yearFilters'), result.Items, options, 'Years', ',');

        }, handleQueryError);
    }

    function loadContainers(context, options) {

        var apiClient = connectionManager.getApiClient(options.serverId);

        var query = Object.assign(options.filterMenuOptions, {

            SortBy: "SortName",
            SortOrder: "Ascending",
            Recursive: options.Recursive == null ? true : options.Recursive,
            EnableTotalRecordCount: false,
            EnableImages: false,
            EnableUserData: false,
            GenreIds: options.GenreIds,
            PersonIds: options.PersonIds,
            StudioIds: options.StudioIds,
            ParentId: options.parentId,
            IncludeItemTypes: options.itemTypes.join(',')
        });

        apiClient.getContainers(apiClient.getCurrentUserId(), query).then(function (result) {

            renderList(context.querySelector('.containerFilters'), result.Items, options, 'Containers', ',');

        }, handleQueryError);
    }

    function loadAudioCodecs(context, options) {

        var apiClient = connectionManager.getApiClient(options.serverId);

        var query = Object.assign(options.filterMenuOptions, {

            SortBy: "SortName",
            SortOrder: "Ascending",
            Recursive: options.Recursive == null ? true : options.Recursive,
            EnableTotalRecordCount: false,
            EnableImages: false,
            EnableUserData: false,
            GenreIds: options.GenreIds,
            PersonIds: options.PersonIds,
            StudioIds: options.StudioIds,
            ParentId: options.parentId,
            IncludeItemTypes: options.itemTypes.join(',')
        });

        apiClient.getAudioCodecs(apiClient.getCurrentUserId(), query).then(function (result) {

            renderList(context.querySelector('.audioCodecFilters'), result.Items, options, 'AudioCodecs', ',');

        }, handleQueryError);
    }

    function loadVideoCodecs(context, options) {

        var apiClient = connectionManager.getApiClient(options.serverId);

        var query = Object.assign(options.filterMenuOptions, {

            SortBy: "SortName",
            SortOrder: "Ascending",
            Recursive: options.Recursive == null ? true : options.Recursive,
            EnableTotalRecordCount: false,
            EnableImages: false,
            EnableUserData: false,
            GenreIds: options.GenreIds,
            PersonIds: options.PersonIds,
            StudioIds: options.StudioIds,
            ParentId: options.parentId,
            IncludeItemTypes: options.itemTypes.join(',')
        });

        apiClient.getVideoCodecs(apiClient.getCurrentUserId(), query).then(function (result) {

            renderList(context.querySelector('.videoCodecFilters'), result.Items, options, 'VideoCodecs', ',');

        }, handleQueryError);
    }

    function loadSubtitleCodecs(context, options) {

        var apiClient = connectionManager.getApiClient(options.serverId);

        var query = Object.assign(options.filterMenuOptions, {

            SortBy: "SortName",
            SortOrder: "Ascending",
            Recursive: options.Recursive == null ? true : options.Recursive,
            EnableTotalRecordCount: false,
            EnableImages: false,
            EnableUserData: false,
            GenreIds: options.GenreIds,
            PersonIds: options.PersonIds,
            StudioIds: options.StudioIds,
            ParentId: options.parentId,
            IncludeItemTypes: options.itemTypes.join(',')
        });

        apiClient.getSubtitleCodecs(apiClient.getCurrentUserId(), query).then(function (result) {

            renderList(context.querySelector('.subtitleCodecFilters'), result.Items, options, 'SubtitleCodecs', ',', null);

        }, handleQueryError);
    }

    function initEditor(context, settings) {

        context.querySelector('form').addEventListener('submit', onSubmit);

        var elems = context.querySelectorAll('.simpleFilter');
        var i, length;

        for (i = 0, length = elems.length; i < length; i++) {

            var val = settings[elems[i].getAttribute('data-settingname')];

            if (elems[i].tagName === 'INPUT') {
                elems[i].checked = val || false;
            } else if (elems[i].classList.contains('selectContainer')) {

                if (val == null) {
                    elems[i].querySelector('select').value = '';
                } else {
                    elems[i].querySelector('select').value = val.toString();
                }

            } else {
                elems[i].querySelector('input').checked = val || false;
            }
        }

        context.querySelector('.selectSeriesStatus').value = settings.SeriesStatus || '';

        elems = context.querySelectorAll('.multiSettingsSection');
        for (i = 0, length = elems.length; i < length; i++) {

            if (elems[i].querySelector('.viewSetting:not(.hide)') || elems[i].querySelector('.selectContainer:not(.hide)')) {
                elems[i].classList.remove('hide');
            } else {
                elems[i].classList.add('hide');
            }
        }
    }

    function saveValues(context, settings, settingsKey, apiClient) {

        var elems = context.querySelectorAll('.simpleFilter');
        var i, length;
        for (i = 0, length = elems.length; i < length; i++) {

            if (elems[i].tagName === 'INPUT') {
                setBasicFilter(context, settingsKey + '-filter-' + elems[i].getAttribute('data-settingname'), elems[i]);
            } else if (elems[i].classList.contains('selectContainer')) {
                setBasicFilter(context, settingsKey + '-filter-' + elems[i].getAttribute('data-settingname'), elems[i].querySelector('select'));
            } else {
                setBasicFilter(context, settingsKey + '-filter-' + elems[i].getAttribute('data-settingname'), elems[i].querySelector('input'));
            }
        }

        // Series status
        var seriesStatuses = [];
        var elem = context.querySelector('.selectSeriesStatus');
        if (elem.value) {
            seriesStatuses.push(elem.value);
        }
        userSettings.setFilter(settingsKey + '-filter-SeriesStatus', seriesStatuses.join(','));

        // Genres
        var genres = [];
         elem = context.querySelector('.selectGenre');
        if (elem.value) {
            genres.push(elem.value);
        }
        userSettings.setFilter(settingsKey + '-filter-GenreIds', genres.join(','));

        var studios = [];
        elem = context.querySelector('.selectStudio');
        if (elem.value) {
            studios.push(elem.value);
        }
        userSettings.setFilter(settingsKey + '-filter-StudioIds', studios.join(','));

        var tags = [];
        elem = context.querySelector('.selectTags');
        if (elem.value) {
            tags.push(elem.value);
        }

        if (apiClient.isMinServerVersion('4.2.0.16')) {
            userSettings.setFilter(settingsKey + '-filter-TagIds', tags.join('|'));
            userSettings.setFilter(settingsKey + '-filter-Tags', '');
        } else {
            userSettings.setFilter(settingsKey + '-filter-Tags', tags.join('|'));
            userSettings.setFilter(settingsKey + '-filter-TagIds', '');
        }

        var containers = [];
        elem = context.querySelector('.selectContainers');
        if (elem.value) {
            containers.push(elem.value);
        }
        userSettings.setFilter(settingsKey + '-filter-Containers', containers.join(','));

        var codecs = [];
        elem = context.querySelector('.selectAudioCodecs');
        if (elem.value) {
            codecs.push(elem.value);
        }
        userSettings.setFilter(settingsKey + '-filter-AudioCodecs', codecs.join(','));

        codecs = [];
        elem = context.querySelector('.selectVideoCodecs');
        if (elem.value) {
            codecs.push(elem.value);
        }
        userSettings.setFilter(settingsKey + '-filter-VideoCodecs', codecs.join(','));

        codecs = [];
        elem = context.querySelector('.selectSubtitleCodecs');
        if (elem.value) {
            codecs.push(elem.value);
        }
        userSettings.setFilter(settingsKey + '-filter-SubtitleCodecs', codecs.join(','));

        var years = [];
        elem = context.querySelector('.selectYears');
        if (elem.value) {
            years.push(elem.value);
        }
        userSettings.setFilter(settingsKey + '-filter-Years', years.join(','));

        var OfficialRatings = [];
        elem = context.querySelector('.selectOfficialRating');
        if (elem.value) {
            OfficialRatings.push(elem.value);
        }
        userSettings.setFilter(settingsKey + '-filter-OfficialRatings', OfficialRatings.join('|'));

        setPlaystateFilters(context, settingsKey);
    }

    function setPlaystateFilters(context, settingsKey) {

        var selectPlaystate = context.querySelector('.selectPlaystate');
        var options = selectPlaystate.options;
        var value = selectPlaystate.value;

        for (var i = 0, length = options.length; i < length; i++) {

            var optionValue = options[i].value;
            if (optionValue === value) {
                if (optionValue) {
                    userSettings.setFilter(settingsKey + '-filter-' + optionValue, true);
                }
            } else {
                if (optionValue) {
                    userSettings.setFilter(settingsKey + '-filter-' + optionValue, null);
                }
            }
        }
    }

    function setBasicFilter(context, key, elem) {

        var value = elem.tagName === 'SELECT' ? elem.value : elem.checked;
        value = value ? value : null;
        userSettings.setFilter(key, value);
    }

    function centerFocus(elem, horiz, on) {
        require(['scrollHelper'], function (scrollHelper) {
            var fn = on ? 'on' : 'off';
            scrollHelper.centerFocus[fn](elem, horiz);
        });
    }

    function moveCheckboxFocus(elem, offset) {

        var parent = dom.parentWithClass(elem, 'checkboxList-verticalwrap');
        var elems = focusManager.getFocusableElements(parent);

        var index = -1;
        for (var i = 0, length = elems.length; i < length; i++) {
            if (elems[i] === elem) {
                index = i;
                break;
            }
        }

        index += offset;

        index = Math.min(elems.length - 1, index);
        index = Math.max(0, index);

        var newElem = elems[index];
        if (newElem) {
            focusManager.focus(newElem);
        }
    }

    function onInputCommand(e) {
        switch (e.detail.command) {

            case 'left':
                moveCheckboxFocus(e.target, -1);
                e.preventDefault();
                break;
            case 'right':
                moveCheckboxFocus(e.target, 1);
                e.preventDefault();
                break;
            default:
                break;
        }
    }

    function FilterMenu() {

    }

    function bindCheckboxInput(context, on) {

        var elems = context.querySelectorAll('.checkboxList-verticalwrap');
        for (var i = 0, length = elems.length; i < length; i++) {
            if (on) {
                inputManager.on(elems[i], onInputCommand);
            } else {
                inputManager.off(elems[i], onInputCommand);
            }
        }
    }

    FilterMenu.prototype.show = function (options) {

        return new Promise(function (resolve, reject) {

            require(['text!./filtermenu.template.html'], function (template) {

                var dialogOptions = {
                    removeOnClose: true,
                    scrollY: false
                };

                if (layoutManager.tv) {
                    dialogOptions.size = 'fullscreen';
                } else {
                    dialogOptions.size = 'small';
                }

                var dlg = dialogHelper.createDialog(dialogOptions);

                dlg.classList.add('formDialog');

                var html = '';

                html += '<div class="formDialogHeader">';
                html += '<button is="paper-icon-button-light" class="btnCancel hide-mouse-idle-tv" tabindex="-1"><i class="md-icon">&#xE5C4;</i></button>';
                html += '<h3 class="formDialogHeaderTitle">${Filters}</h3>';

                html += '</div>';

                html += template;

                dlg.innerHTML = globalize.translateDocument(html, 'sharedcomponents');

                var settingElements = dlg.querySelectorAll('.viewSetting');
                for (var i = 0, length = settingElements.length; i < length; i++) {
                    if (options.visibleSettings.indexOf(settingElements[i].getAttribute('data-settingname')) === -1) {
                        settingElements[i].classList.add('hide');
                    } else {
                        settingElements[i].classList.remove('hide');
                    }
                }

                initEditor(dlg, options.settings);

                loadPlayState(dlg, options);

                if (options.visibleSettings.indexOf('Genres') !== -1) {
                    loadGenres(dlg, options);
                }
                if (options.visibleSettings.indexOf('Studios') !== -1) {
                    loadStudios(dlg, options);
                }
                if (options.visibleSettings.indexOf('Tags') !== -1) {
                    loadTags(dlg, options);
                }
                if (options.visibleSettings.indexOf('OfficialRatings') !== -1) {
                    loadOfficialRatings(dlg, options);
                }
                if (options.visibleSettings.indexOf('Containers') !== -1) {
                    loadContainers(dlg, options);
                }
                if (options.visibleSettings.indexOf('Years') !== -1) {
                    loadYears(dlg, options);
                }
                if (options.visibleSettings.indexOf('AudioCodecs') !== -1) {
                    loadAudioCodecs(dlg, options);
                }
                if (options.visibleSettings.indexOf('VideoCodecs') !== -1) {
                    loadVideoCodecs(dlg, options);
                }
                if (options.visibleSettings.indexOf('SubtitleCodecs') !== -1) {
                    loadSubtitleCodecs(dlg, options);
                }

                bindCheckboxInput(dlg, true);

                dlg.querySelector('.btnCancel').addEventListener('click', function () {

                    dialogHelper.close(dlg);
                });

                if (layoutManager.tv) {
                    centerFocus(dlg.querySelector('.formDialogContent'), false, true);
                }

                var submitted;

                dlg.querySelector('form').addEventListener('change', function () {

                    submitted = true;
                    //if (options.onChange) {
                    //    saveValues(dlg, options.settings, options.settingsKey);
                    //    options.onChange();
                    //}

                }, true);

                dialogHelper.open(dlg).then(function () {

                    bindCheckboxInput(dlg, false);

                    if (layoutManager.tv) {
                        centerFocus(dlg.querySelector('.formDialogContent'), false, false);
                    }

                    if (submitted) {

                        //if (!options.onChange) {
                        saveValues(dlg, options.settings, options.settingsKey, connectionManager.getApiClient(options.serverId));
                        resolve();
                        //}
                        return;
                    }

                    reject();
                });
            });
        });
    };

    return FilterMenu;
});