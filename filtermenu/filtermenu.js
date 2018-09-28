define(['require', 'dom', 'focusManager', 'dialogHelper', 'loading', 'apphost', 'inputManager', 'layoutManager', 'connectionManager', 'appRouter', 'globalize', 'userSettings', 'emby-checkbox', 'emby-input', 'emby-select', 'paper-icon-button-light', 'emby-select', 'material-icons', 'css!./../formdialog', 'emby-button', 'emby-linkbutton', 'flexStyles'], function (require, dom, focusManager, dialogHelper, loading, appHost, inputManager, layoutManager, connectionManager, appRouter, globalize, userSettings) {
    'use strict';

    function onSubmit(e) {

        e.preventDefault();
        return false;
    }

    function renderList(container, items, options, property, delimeter) {

        var anySelected = false;
        var value = options.settings[property];

        var html = items.map(function (i) {

            var selected = (delimeter + (value || '') + delimeter).indexOf(delimeter + i.Id + delimeter) !== -1;

            var selectedHtml = selected && !anySelected ? ' selected' : '';
            if (selected) {
                anySelected = true;
            }
            return '<option value="' + i.Id + '"' + selectedHtml + '>' + i.Name + '</option>';

        }).join('');

        var prefix = anySelected ?
            '<option value="">' + globalize.translate('All') + '</option>' :
            '<option value="" selected>' + globalize.translate('All') + '</option>';

        container.querySelector('select').innerHTML = prefix + html;

        if (items.length) {
            container.classList.remove('hide');
        } else {
            container.classList.add('hide');
        }
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
            ParentId: options.parentId,
            IncludeItemTypes: options.itemTypes.join(',')
        });

        apiClient.getGenres(apiClient.getCurrentUserId(), query).then(function (result) {

            renderList(context.querySelector('.genreFilters'), result.Items, options, 'GenreIds', ',');
        });
    }

    function handleQueryError() {

        // For older servers
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
            ParentId: options.parentId,
            IncludeItemTypes: options.itemTypes.join(',')
        });

        apiClient.getTags(apiClient.getCurrentUserId(), query).then(function (result) {

            renderList(context.querySelector('.studioFilters'), result.Items, options, 'StudiosIds', ',');

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
            ParentId: options.parentId,
            IncludeItemTypes: options.itemTypes.join(',')
        });

        apiClient.getStudios(apiClient.getCurrentUserId(), query).then(function (result) {

            renderList(context.querySelector('.tagFilters'), result.Items, options, 'Tags', ',');
        });
    }

    function initEditor(context, settings) {

        context.querySelector('form').addEventListener('submit', onSubmit);

        var elems = context.querySelectorAll('.simpleFilter');
        var i, length;

        for (i = 0, length = elems.length; i < length; i++) {

            if (elems[i].tagName === 'INPUT') {
                elems[i].checked = settings[elems[i].getAttribute('data-settingname')] || false;
            } else {
                elems[i].querySelector('input').checked = settings[elems[i].getAttribute('data-settingname')] || false;
            }
        }

        var seriesStatuses = settings.SeriesStatus ? settings.SeriesStatus.split(',') : [];
        elems = context.querySelectorAll('.chkSeriesStatus');

        for (i = 0, length = elems.length; i < length; i++) {

            elems[i].checked = seriesStatuses.indexOf(elems[i].getAttribute('data-filter')) !== -1;
        }

        if (context.querySelector('.basicFilterSection .viewSetting:not(.hide)')) {
            context.querySelector('.basicFilterSection').classList.remove('hide');
        } else {
            context.querySelector('.basicFilterSection').classList.add('hide');
        }

        if (context.querySelector('.featureSection .viewSetting:not(.hide)')) {
            context.querySelector('.featureSection').classList.remove('hide');
        } else {
            context.querySelector('.featureSection').classList.add('hide');
        }
    }

    function saveValues(context, settings, settingsKey) {

        var elems = context.querySelectorAll('.simpleFilter');
        var i, length;
        for (i = 0, length = elems.length; i < length; i++) {

            if (elems[i].tagName === 'INPUT') {
                setBasicFilter(context, settingsKey + '-filter-' + elems[i].getAttribute('data-settingname'), elems[i]);
            } else {
                setBasicFilter(context, settingsKey + '-filter-' + elems[i].getAttribute('data-settingname'), elems[i].querySelector('input'));
            }
        }

        // Series status
        var seriesStatuses = [];
        elems = context.querySelectorAll('.chkSeriesStatus');

        for (i = 0, length = elems.length; i < length; i++) {

            if (elems[i].checked) {
                seriesStatuses.push(elems[i].getAttribute('data-filter'));
            }
        }
        userSettings.setFilter(settingsKey + '-filter-SeriesStatus', seriesStatuses.join(','));

        // Genres
        var genres = [];
        var elem = context.querySelector('.selectGenre');
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
        userSettings.setFilter(settingsKey + '-filter-Tags', tags.join('|'));

        var officalRatings = [];
        elem = context.querySelector('.selectOfficialRating');
        if (elem.value) {
            officalRatings.push(elem.value);
        }
        userSettings.setFilter(settingsKey + '-filter-OfficialRatings', officalRatings.join('|'));
    }

    function setBasicFilter(context, key, elem) {

        var value = elem.checked;
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
                loadGenres(dlg, options);
                loadStudios(dlg, options);
                loadTags(dlg, options);
                loadOfficialRatings(dlg, options);

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
                        saveValues(dlg, options.settings, options.settingsKey);
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