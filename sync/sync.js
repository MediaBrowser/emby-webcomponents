﻿define(['apphost', 'globalize', 'connectionManager', 'layoutManager', 'focusManager', 'appSettings', 'registrationServices', 'dialogHelper', 'paper-icon-button-light', 'formDialogStyle', 'emby-scroller'], function (appHost, globalize, connectionManager, layoutManager, focusManager, appSettings, registrationServices, dialogHelper) {
    'use strict';

    var currentDialogOptions;

    function submitJob(dlg, apiClient, userId, syncOptions, form) {

        if (!userId) {
            throw new Error('userId cannot be null');
        }

        if (!syncOptions) {
            throw new Error('syncOptions cannot be null');
        }

        if (!form) {
            throw new Error('form cannot be null');
        }

        var selectSyncTarget = form.querySelector('#selectSyncTarget');
        var target = selectSyncTarget ? selectSyncTarget.value : null;

        if (!target) {

            require(['toast'], function (toast) {
                toast(globalize.translate('PleaseSelectDeviceToSyncTo'));
            });
            return false;
        }

        var options = {

            userId: userId,
            TargetId: target,

            ParentId: syncOptions.ParentId,
            Category: syncOptions.Category
        };

        setJobValues(options, form);

        if (syncOptions.items && syncOptions.items.length) {
            options.ItemIds = (syncOptions.items || []).map(function (i) {
                return i.Id || i;
            }).join(',');
        }

        apiClient.ajax({

            type: "POST",
            url: apiClient.getUrl("Sync/Jobs"),
            data: JSON.stringify(options),
            contentType: "application/json",
            dataType: 'json'

        }).then(function () {

            dialogHelper.close(dlg);
            require(['toast'], function (toast) {

                showSubmissionToast(target, apiClient);

                if (syncOptions.mode === 'download') {
                    syncNow();
                }
            });
        });

        return true;
    }


    function showSubmissionToast(targetId, apiClient) {

        require(['toast'], function (toast) {

            var msg = globalize.translate('DownloadingDots');

            toast(msg);
        });
    }

    function syncNow() {
        require(['localsync'], function (localSync) {
            localSync.sync();
        });
    }

    function submitQuickSyncJob(apiClient, userId, targetId, syncOptions) {

        if (!userId) {
            throw new Error('userId cannot be null');
        }

        if (!syncOptions) {
            throw new Error('syncOptions cannot be null');
        }

        if (!targetId) {
            throw new Error('targetId cannot be null');
        }

        var options = {

            userId: userId,
            TargetId: targetId,

            ParentId: syncOptions.ParentId,
            Category: syncOptions.Category,
            Quality: syncOptions.Quality,
            Bitrate: syncOptions.Bitrate
        };

        if (syncOptions.items && syncOptions.items.length) {
            options.ItemIds = (syncOptions.items || []).map(function (i) {
                return i.Id || i;
            }).join(',');
        }

        return apiClient.ajax({

            type: "POST",
            url: apiClient.getUrl("Sync/Jobs"),
            data: JSON.stringify(options),
            contentType: "application/json",
            dataType: 'json'

        }).then(function () {

            require(['toast'], function (toast) {

                showSubmissionToast(targetId, apiClient);

                if (syncOptions.mode === 'download') {
                    syncNow();
                }
            });
        });
    }

    function setJobValues(job, form) {

        var txtBitrate = form.querySelector('#txtBitrate');
        var bitrate = txtBitrate ? txtBitrate.value : null;

        if (bitrate) {
            bitrate = parseFloat(bitrate) * 1000000;
        }
        job.Bitrate = bitrate;

        var selectQuality = form.querySelector('#selectQuality');
        if (selectQuality) {
            job.Quality = selectQuality.value;

            appSettings.set('sync-lastquality', job.Quality || '');
        }

        var selectProfile = form.querySelector('#selectProfile');
        if (selectProfile) {
            job.Profile = selectProfile.value;
        }

        var txtItemLimit = form.querySelector('#txtItemLimit');
        if (txtItemLimit) {
            job.ItemLimit = txtItemLimit.value || null;
        }

        var chkSyncNewContent = form.querySelector('#chkSyncNewContent');
        if (chkSyncNewContent) {
            job.SyncNewContent = chkSyncNewContent.checked;
        }

        var chkUnwatchedOnly = form.querySelector('#chkUnwatchedOnly');
        if (chkUnwatchedOnly) {
            job.UnwatchedOnly = chkUnwatchedOnly.checked;
        }
    }

    function renderForm(options) {

        return new Promise(function (resolve, reject) {

            require(['emby-checkbox', 'emby-input', 'emby-select'], function () {

                renderFormInternal(options, connectionManager.deviceId(), resolve);
            });
        });
    }

    function renderFormInternal(options, defaultTargetId, resolve) {

        var elem = options.elem;
        var dialogOptions = options.dialogOptions;

        var targets = dialogOptions.Targets;

        var html = '';

        var mode = options.mode;
        var targetContainerClass = mode === 'download' ? ' hide' : '';

        var syncTargetLabel = mode === 'convert' ? globalize.translate('LabelConvertTo') : globalize.translate('LabelDownloadTo');

        if (options.readOnlySyncTarget) {
            html += '<div class="inputContainer' + targetContainerClass + '">';
            html += '<input is="emby-input" type="text" id="selectSyncTarget" readonly label="' + syncTargetLabel + '"/>';
            html += '</div>';
        } else {
            html += '<div class="selectContainer' + targetContainerClass + '">';
            html += '<select is="emby-select" id="selectSyncTarget" required="required" label="' + syncTargetLabel + '">';

            html += targets.map(function (t) {

                var isSelected = defaultTargetId === t.Id;
                var selectedHtml = isSelected ? ' selected="selected"' : '';
                return '<option' + selectedHtml + ' value="' + t.Id + '">' + t.Name + '</option>';

            }).join('');
            html += '</select>';
            if (!targets.length) {
                html += '<div class="fieldDescription">' + globalize.translate('LabelSyncNoTargetsHelp') + '</div>';
            }

            if (appHost.supports('externallinks')) {
                html += '<div class="fieldDescription"><a is="emby-linkbutton" class="button-link lnkLearnMore" href="https://github.com/MediaBrowser/Wiki/wiki/Sync" target="_blank">' + globalize.translate('LearnMore') + '</a></div>';
            }
            html += '</div>';
        }

        var settingsDisabled = false;

        if (options.readOnlySyncTarget && dialogOptions.Options.indexOf('UnwatchedOnly') === -1 && dialogOptions.Options.indexOf('SyncNewContent') === -1 && dialogOptions.Options.indexOf('ItemLimit') === -1) {

            // for non-dynamic sync-jobs and non-new it doesn't make any sense to allow modifying any settings
            settingsDisabled = true;
        }

        html += '<div class="fldProfile selectContainer hide">';
        html += '<select is="emby-select" id="selectProfile" ' + (settingsDisabled ? 'disabled' : '') + '  label="' + globalize.translate('LabelProfile') + '">';
        html += '</select>';
        html += '<div class="fieldDescription profileDescription"></div>';
        html += '</div>';

        html += '<div class="fldQuality selectContainer hide">';
        html += '<select is="emby-select" id="selectQuality" required="required" ' + (settingsDisabled ? 'disabled' : '') + '  label="' + globalize.translate('LabelQuality') + '">';
        html += '</select>';
        html += '<div class="fieldDescription qualityDescription"></div>';
        html += '</div>';

        html += '<div class="fldBitrate inputContainer hide">';
        html += '<input is="emby-input" type="number" step=".1" min=".1" ' + (settingsDisabled ? 'readonly' : '') + ' id="txtBitrate" label="' + globalize.translate('LabelBitrateMbps') + '"/>';
        html += '</div>';

        if (dialogOptions.Options.indexOf('UnwatchedOnly') !== -1) {
            html += '<div class="checkboxContainer checkboxContainer-withDescription">';
            html += '<label>';
            html += '<input is="emby-checkbox" type="checkbox" id="chkUnwatchedOnly"/>';

            if (mode === 'convert') {
                html += '<span>' + globalize.translate('ConvertUnwatchedVideosOnly') + '</span>';
            } else {
                html += '<span>' + globalize.translate('SyncUnwatchedVideosOnly') + '</span>';
            }

            html += '</label>';

            if (mode === 'convert') {
                html += '<div class="fieldDescription checkboxFieldDescription">' + globalize.translate('ConvertUnwatchedVideosOnlyHelp') + '</div>';
            } else {
                html += '<div class="fieldDescription checkboxFieldDescription">' + globalize.translate('SyncUnwatchedVideosOnlyHelp') + '</div>';
            }

            html += '</div>';
        }

        if (dialogOptions.Options.indexOf('SyncNewContent') !== -1) {
            html += '<div class="checkboxContainer checkboxContainer-withDescription">';
            html += '<label>';
            html += '<input is="emby-checkbox" type="checkbox" id="chkSyncNewContent"/>';

            if (mode === 'convert') {
                html += '<span>' + globalize.translate('AutomaticallyConvertNewContent') + '</span>';
            } else {
                html += '<span>' + globalize.translate('AutomaticallySyncNewContent') + '</span>';
            }

            html += '</label>';

            if (mode === 'convert') {
                html += '<div class="fieldDescription checkboxFieldDescription">' + globalize.translate('AutomaticallyConvertNewContentHelp') + '</div>';
            } else {
                html += '<div class="fieldDescription checkboxFieldDescription">' + globalize.translate('AutomaticallySyncNewContentHelp') + '</div>';
            }
            html += '</div>';
        }

        if (dialogOptions.Options.indexOf('ItemLimit') !== -1) {
            html += '<div class="inputContainer">';
            html += '<input is="emby-input" type="number" step="1" min="1" id="txtItemLimit" label="' + globalize.translate('LabelItemLimit') + '"/>';

            if (mode === 'convert') {
                html += '<div class="fieldDescription">' + globalize.translate('ConvertItemLimitHelp') + '</div>';
            } else {
                html += '<div class="fieldDescription">' + globalize.translate('DownloadItemLimitHelp') + '</div>';
            }

            html += '</div>';
        }

        //html += '</div>';
        //html += '</div>';

        elem.innerHTML = html;

        var selectSyncTarget = elem.querySelector('#selectSyncTarget');
        if (selectSyncTarget) {
            selectSyncTarget.addEventListener('change', function () {
                loadQualityOptions(elem, this.value, options.dialogOptionsFn).then(resolve);
            });
            selectSyncTarget.dispatchEvent(new CustomEvent('change', {
                bubbles: true
            }));
        }

        var selectProfile = elem.querySelector('#selectProfile');
        if (selectProfile) {
            selectProfile.addEventListener('change', function () {
                onProfileChange(elem, this.value);
            });

            if (dialogOptions.ProfileOptions.length) {
                selectProfile.dispatchEvent(new CustomEvent('change', {
                    bubbles: true
                }));
            }
        }

        var selectQuality = elem.querySelector('#selectQuality');
        if (selectQuality) {
            selectQuality.addEventListener('change', function () {
                onQualityChange(elem, this.value);
            });
            selectQuality.dispatchEvent(new CustomEvent('change', {
                bubbles: true
            }));
        }

        // This isn't ideal, but allow time for the change handlers above to run
        setTimeout(function () {
            focusManager.autoFocus(elem);
        }, 100);
    }

    function showWifiMessage() {

        require(['dialog', 'appRouter'], function (dialog, appRouter) {

            var options = {

                title: globalize.translate('HeaderWaitingForWifi'),
                text: globalize.translate('WifiRequiredToDownload')
            };

            var items = [];

            items.push({
                name: options.confirmText || globalize.translate('ButtonOk'),
                id: 'ok',
                type: 'submit'
            });

            items.push({
                name: options.cancelText || globalize.translate('HeaderDownloadSettings'),
                id: 'downloadsettings',
                type: 'cancel'
            });

            options.buttons = items;

            dialog(options).then(function (result) {

                if (result === 'ok') {
                    return Promise.resolve();
                }
                if (result === 'downloadsettings') {
                    appRouter.show(appRouter.getRouteUrl('downloadsettings'));
                    return Promise.resolve();
                }

                return Promise.reject();
            });
        });
    }

    function validateNetwork() {

        var network = navigator.connection ? navigator.connection.type : null;

        switch (network) {

            case 'cellular':
            case 'bluetooth':
                showWifiMessage();
                return false;
            default:
                return true;
        }
    }

    function showSyncMenu(options) {

        if (options.mode === 'download' && appSettings.syncOnlyOnWifi() && !validateNetwork()) {
            return Promise.reject();
        }

        return registrationServices.validateFeature('sync').then(function () {
            return showSyncMenuInternal(options);
        });
    }

    function enableAutoSync(options) {

        if (options.mode !== 'download') {
            return false;
        }

        var firstItem = (options.items || [])[0] || {};

        if (firstItem.Type === 'Audio') {
            return true;
        }
        if (firstItem.Type === 'MusicAlbum') {
            return true;
        }
        if (firstItem.Type === 'MusicArtist') {
            return true;
        }
        if (firstItem.Type === 'MusicGenre') {
            return true;
        }
        if (firstItem.Type === 'Playlist' && firstItem.MediaType === 'Audio') {
            return true;
        }

        return false;
    }

    function showSyncMenuInternal(options) {

        var apiClient = connectionManager.getApiClient(options.serverId);
        var userId = apiClient.getCurrentUserId();

        if (enableAutoSync(options)) {

            return submitQuickSyncJob(apiClient, userId, apiClient.deviceId(), {
                items: options.items,
                Quality: 'custom',
                Bitrate: appSettings.maxStaticMusicBitrate()
            });
        }

        var dialogOptionsFn = getTargetDialogOptionsFn(apiClient, {
            UserId: userId,
            ItemIds: (options.items || []).map(function (i) {
                return i.Id || i;
            }).join(','),

            ParentId: options.ParentId,
            Category: options.Category,
            IncludeProviders: options.mode === 'convert' ? 'ConvertSyncProvider' : null,
            ExcludeProviders: options.mode === 'convert' ? null : 'ConvertSyncProvider'
        });

        return dialogOptionsFn().then(function (dialogOptions) {

            currentDialogOptions = dialogOptions;

            var dlgElementOptions = {
                removeOnClose: true,
                scrollY: false,
                autoFocus: false
            };

            if (layoutManager.tv) {
                dlgElementOptions.size = 'fullscreen';
            } else {
                dlgElementOptions.size = 'small';
            }

            var dlg = dialogHelper.createDialog(dlgElementOptions);

            dlg.classList.add('formDialog');

            var html = '';
            html += '<div class="formDialogHeader">';
            html += '<button is="paper-icon-button-light" class="btnCancel autoSize" tabindex="-1"><i class="md-icon">&#xE5C4;</i></button>';
            html += '<h3 class="formDialogHeaderTitle">';

            var syncButtonLabel = options.mode === 'download' ?
                globalize.translate('Download') :
                (options.mode === 'convert' ? globalize.translate('Convert') : globalize.translate('Download'));

            html += syncButtonLabel;
            html += '</h3>';

            if (appHost.supports('externallinks')) {
                html += '<a is="emby-linkbutton" href="https://github.com/MediaBrowser/Wiki/wiki/Sync" target="_blank" class="button-link lnkHelp" style="margin-top:0;display:inline-block;vertical-align:middle;margin-left:auto;"><i class="md-icon">info</i><span>' + globalize.translate('Help') + '</span></a>';
            }

            html += '</div>';

            html += '<div is="emby-scroller" data-horizontal="false" data-centerfocus="card" class="formDialogContent">';
            html += '<div class="scrollSlider">';
            html += '<form class="dialogContentInner dialog-content-centered formSubmitSyncRequest" style="padding-top:2em;">';

            html += '<div class="formFields"></div>';

            html += '<div class="formDialogFooter">';

            html += '<button is="emby-button" type="submit" class="raised button-submit block formDialogFooterItem"><span>' + syncButtonLabel + '</span></button>';
            html += '</div>';

            html += '</form>';

            html += '</div>';
            html += '</div>';

            dlg.innerHTML = html;

            var submitted = false;

            dlg.querySelector('form').addEventListener('submit', function (e) {

                submitted = submitJob(dlg, apiClient, userId, options, this);

                e.preventDefault();
                return false;
            });

            dlg.querySelector('.btnCancel').addEventListener('click', function () {
                dialogHelper.close(dlg);
            });

            var promise = dialogHelper.open(dlg);

            renderForm({
                elem: dlg.querySelector('.formFields'),
                dialogOptions: dialogOptions,
                dialogOptionsFn: dialogOptionsFn,
                mode: options.mode
            });

            return promise.then(function () {

                if (submitted) {
                    return Promise.resolve();
                }
                return Promise.reject();
            });
        });
    }

    function getTargetDialogOptionsFn(apiClient, query) {

        return function (targetId) {

            query.TargetId = targetId;

            if (!targetId) {
                query.ExcludeTargetIds = apiClient.deviceId();
            }

            return apiClient.getJSON(apiClient.getUrl('Sync/Options', query));
        };
    }

    function setQualityFieldVisible(form, visible) {

        var fldQuality = form.querySelector('.fldQuality');
        var selectQuality = form.querySelector('#selectQuality');

        if (visible) {
            if (fldQuality) {
                fldQuality.classList.remove('hide');
            }
            if (selectQuality) {
                //selectQuality.setAttribute('required', 'required');

                // This is a hack due to what appears to be a edge bug but it shoudln't matter as the list always has selectable items
                selectQuality.removeAttribute('required');
            }
        } else {
            if (fldQuality) {
                fldQuality.classList.add('hide');
            }
            if (selectQuality) {
                selectQuality.removeAttribute('required');
            }
        }
    }

    function onProfileChange(form, profileId) {

        var options = currentDialogOptions || {};

        var profileOptions = options.ProfileOptions || [];

        if (!profileOptions.length) {
            return;
        }

        var option = profileOptions.filter(function (o) {
            return o.Id === profileId;
        })[0];

        var qualityOptions = options.QualityOptions || [];

        if (option) {
            form.querySelector('.profileDescription').innerHTML = option.Description || '';
            setQualityFieldVisible(form, qualityOptions.length > 0 && option.EnableQualityOptions && options.Options.indexOf('Quality') !== -1);
        } else {
            form.querySelector('.profileDescription').innerHTML = '';
            setQualityFieldVisible(form, qualityOptions.length > 0 && options.Options.indexOf('Quality') !== -1);
        }
    }

    function onQualityChange(form, qualityId) {

        var options = currentDialogOptions || {};
        var option = (options.QualityOptions || []).filter(function (o) {
            return o.Id === qualityId;
        })[0];

        var qualityDescription = form.querySelector('.qualityDescription');

        if (option) {
            qualityDescription.innerHTML = option.Description || '';
        } else {
            qualityDescription.innerHTML = '';
        }

        var fldBitrate = form.querySelector('.fldBitrate');
        var txtBitrate = form.querySelector('#txtBitrate');

        if (qualityId === 'custom') {

            if (fldBitrate) {
                fldBitrate.classList.remove('hide');
            }
            if (txtBitrate) {
                txtBitrate.setAttribute('required', 'required');
            }
        } else {
            if (fldBitrate) {
                fldBitrate.classList.add('hide');
            }
            if (txtBitrate) {
                txtBitrate.removeAttribute('required');
            }
        }
    }

    function renderTargetDialogOptions(form, options) {

        currentDialogOptions = options;

        var fldProfile = form.querySelector('.fldProfile');
        var selectProfile = form.querySelector('#selectProfile');

        if (options.ProfileOptions.length && options.Options.indexOf('Profile') !== -1) {
            if (fldProfile) {
                fldProfile.classList.remove('hide');
            }
            if (selectProfile) {
                selectProfile.setAttribute('required', 'required');
            }
        } else {
            if (fldProfile) {
                fldProfile.classList.add('hide');
            }
            if (selectProfile) {
                selectProfile.removeAttribute('required');
            }
        }

        setQualityFieldVisible(form, options.QualityOptions.length > 0);

        if (selectProfile) {
            selectProfile.innerHTML = options.ProfileOptions.map(function (o) {

                var selectedAttribute = o.IsDefault ? ' selected="selected"' : '';
                return '<option value="' + o.Id + '"' + selectedAttribute + '>' + o.Name + '</option>';

            }).join('');

            selectProfile.dispatchEvent(new CustomEvent('change', {
                bubbles: true
            }));
        }

        var selectQuality = form.querySelector('#selectQuality');
        if (selectQuality) {
            selectQuality.innerHTML = options.QualityOptions.map(function (o) {

                var selectedAttribute = o.IsDefault ? ' selected="selected"' : '';
                return '<option value="' + o.Id + '"' + selectedAttribute + '>' + o.Name + '</option>';

            }).join('');

            var lastQuality = appSettings.get('sync-lastquality');
            if (lastQuality && options.QualityOptions.filter(function (i) {

                return i.Id === lastQuality;

            }).length) {
                selectQuality.value = lastQuality;
            }

            selectQuality.dispatchEvent(new CustomEvent('change', {
                bubbles: true
            }));
        }
    }

    function loadQualityOptions(form, targetId, dialogOptionsFn) {

        return dialogOptionsFn(targetId).then(function (options) {

            return renderTargetDialogOptions(form, options);
        });
    }

    return {

        showMenu: showSyncMenu,
        renderForm: renderForm,
        setJobValues: setJobValues
    };
});