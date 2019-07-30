﻿define(['dialogHelper', 'globalize', 'layoutManager', 'mediaInfo', 'apphost', 'connectionManager', 'require', 'loading', 'imageLoader', 'datetime', 'scrollStyles', 'emby-button', 'emby-checkbox', 'emby-input', 'emby-select', 'paper-icon-button-light', 'css!./../formdialog', 'css!./recordingcreator', 'material-icons', 'flexStyles', 'emby-scroller'], function (dialogHelper, globalize, layoutManager, mediaInfo, appHost, connectionManager, require, loading, imageLoader, datetime) {
    'use strict';

    var currentDialog;
    var recordingUpdated = false;
    var recordingDeleted = false;
    var currentItemId;
    var currentServerId;

    function deleteTimer(apiClient, timerId) {

        return new Promise(function (resolve, reject) {

            require(['recordingHelper'], function (recordingHelper) {

                recordingHelper.cancelSeriesTimerWithConfirmation(timerId, apiClient.serverId()).then(resolve, reject);
            });
        });
    }

    function renderTimer(context, item, apiClient) {

        var program = item.ProgramInfo || {};

        context.querySelector('#txtPrePaddingMinutes').value = item.PrePaddingSeconds / 60;
        context.querySelector('#txtPostPaddingMinutes').value = item.PostPaddingSeconds / 60;

        context.querySelector('.selectChannels').value = item.RecordAnyChannel ? 'all' : 'one';
        context.querySelector('.selectAirTime').value = item.RecordAnyTime ? 'any' : 'original';

        context.querySelector('.selectShowType').value = item.RecordNewOnly ? 'new' : 'all';
        context.querySelector('.chkSkipEpisodesInLibrary').checked = item.SkipEpisodesInLibrary;
        context.querySelector('.selectKeepUpTo').value = item.KeepUpTo || 0;

        if (item.ChannelName || item.ChannelNumber) {
            context.querySelector('.optionChannelOnly').innerHTML = globalize.translate('ChannelNameOnly', item.ChannelName || item.ChannelNumber);
        } else {
            context.querySelector('.optionChannelOnly').innerHTML = globalize.translate('OneChannel');
        }

        context.querySelector('.optionAroundTime').innerHTML = globalize.translate('AroundTime', datetime.getDisplayTime(datetime.parseISO8601Date(item.StartDate)));

        loading.hide();
    }

    function closeDialog(isDeleted) {

        recordingUpdated = true;
        recordingDeleted = isDeleted;

        dialogHelper.close(currentDialog);
    }

    function onSubmit(e) {

        var form = this;

        var apiClient = connectionManager.getApiClient(currentServerId);

        apiClient.getLiveTvSeriesTimer(currentItemId).then(function (item) {

            item.PrePaddingSeconds = form.querySelector('#txtPrePaddingMinutes').value * 60;
            item.PostPaddingSeconds = form.querySelector('#txtPostPaddingMinutes').value * 60;
            item.RecordAnyChannel = form.querySelector('.selectChannels').value === 'all';
            item.RecordAnyTime = form.querySelector('.selectAirTime').value === 'any';
            item.RecordNewOnly = form.querySelector('.selectShowType').value === 'new';
            item.SkipEpisodesInLibrary = form.querySelector('.chkSkipEpisodesInLibrary').checked;
            item.KeepUpTo = form.querySelector('.selectKeepUpTo').value;

            apiClient.updateLiveTvSeriesTimer(item);
        });

        e.preventDefault();

        // Disable default form submission
        return false;
    }

    function init(context) {

        fillKeepUpTo(context);

        context.querySelector('.btnCancel').addEventListener('click', function () {

            closeDialog(false);
        });

        context.querySelector('.btnCancelRecording').addEventListener('click', function () {

            var apiClient = connectionManager.getApiClient(currentServerId);
            deleteTimer(apiClient, currentItemId).then(function () {
                closeDialog(true);
            });
        });

        context.querySelector('form').addEventListener('submit', onSubmit);
    }

    function reload(context, id) {

        var apiClient = connectionManager.getApiClient(currentServerId);

        loading.show();
        if (typeof id === 'string') {
            currentItemId = id;

            apiClient.getLiveTvSeriesTimer(id).then(function (result) {

                renderTimer(context, result, apiClient);
                loading.hide();
            });
        } else if (id) {

            currentItemId = id.Id;

            renderTimer(context, id, apiClient);
            loading.hide();
        }
    }

    function fillKeepUpTo(context) {

        var html = '';

        for (var i = 0; i <= 50; i++) {

            var text;

            if (i === 0) {
                text = globalize.translate('AsManyAsPossible');
            } else if (i === 1) {
                text = globalize.translate('ValueOneEpisode');
            } else {
                text = globalize.translate('ValueEpisodeCount', i);
            }

            html += '<option value="' + i + '">' + text + '</option>';
        }

        context.querySelector('.selectKeepUpTo').innerHTML = html;
    }
    
    function onFieldChange(e) {
        this.querySelector('.btnSubmit').click();
    }

    function embed(itemId, serverId, options) {

        recordingUpdated = false;
        recordingDeleted = false;
        currentServerId = serverId;
        loading.show();
        options = options || {};

        require(['text!./seriesrecordingeditor.template.html'], function (template) {

            var dialogOptions = {
                removeOnClose: true,
                scrollY: false
            };

            if (layoutManager.tv) {
                dialogOptions.size = 'fullscreen';
            } else {
                dialogOptions.size = 'small';
            }

            var dlg = options.context;

            dlg.classList.add('hide');
            dlg.innerHTML = globalize.translateDocument(template, 'sharedcomponents');

            dlg.querySelector('.formDialogHeader').classList.add('hide');
            dlg.querySelector('.formDialogFooter').classList.add('hide');
            dlg.querySelector('.formDialogContent').className = '';
            dlg.querySelector('.dialogContentInner').className = '';
            dlg.classList.remove('hide');

            dlg.removeEventListener('change', onFieldChange);
            dlg.addEventListener('change', onFieldChange);

            currentDialog = dlg;

            init(dlg);

            reload(dlg, itemId);
        });
    }

    function showEditor(itemId, serverId, options) {

        return new Promise(function (resolve, reject) {

            recordingUpdated = false;
            recordingDeleted = false;
            currentServerId = serverId;
            loading.show();
            options = options || {};

            require(['text!./seriesrecordingeditor.template.html'], function (template) {

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
                dlg.classList.add('recordingDialog');

                if (!layoutManager.tv) {
                    dlg.style['min-width'] = '20%';
                }

                var html = '';

                html += globalize.translateDocument(template, 'sharedcomponents');

                dlg.innerHTML = html;

                if (options.enableCancel === false) {
                    dlg.querySelector('.formDialogFooter').classList.add('hide');
                }

                currentDialog = dlg;

                dlg.addEventListener('closing', function () {

                    if (!recordingDeleted) {
                        this.querySelector('.btnSubmit').click();
                    }
                });

                dlg.addEventListener('close', function () {

                    if (recordingUpdated) {
                        resolve({
                            updated: true,
                            deleted: recordingDeleted
                        });
                    } else {
                        reject();
                    }
                });

                init(dlg);

                reload(dlg, itemId);

                dialogHelper.open(dlg);
            });
        });
    }

    return {
        show: showEditor,
        embed: embed
    };
});