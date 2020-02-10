﻿define(['serverNotifications', 'events', 'loading', 'connectionManager', 'imageLoader', 'dom', 'globalize', 'registrationServices', 'layoutManager', 'listViewStyle'], function (serverNotifications, events, loading, connectionManager, imageLoader, dom, globalize, registrationServices, layoutManager) {
    'use strict';

    function onSyncJobCreated(e, apiClient, data) {
        var listInstance = this;
        fetchData(listInstance);
    }
    function onSyncJobUpdated(e, apiClient, data) {
        var listInstance = this;

        refreshJob(listInstance, data);
    }
    function onSyncJobCancelled(e, apiClient, data) {
        var listInstance = this;
        fetchData(listInstance);
    }

    function refreshList(listInstance, jobs) {
        for (var i = 0, length = jobs.length; i < length; i++) {

            var job = jobs[i];
            refreshJob(listInstance, job);
        }
    }

    function syncNow() {
        require(['localsync'], function (localSync) {
            localSync.sync();
        });
    }

    function cancelJob(listInstance, id) {

        require(['confirm'], function (confirm) {

            var msg = globalize.translate('ConfirmRemoveDownload');

            confirm({

                text: msg,
                primary: 'cancel'

            }).then(function () {

                loading.show();
                var apiClient = getApiClient(listInstance);

                apiClient.ajax({

                    url: apiClient.getUrl('Sync/Jobs/' + id),
                    type: 'DELETE'

                }).then(function () {

                    if (listInstance.options.mode === 'download') {
                        syncNow();
                    }

                    fetchData(listInstance);
                });
            });
        });
    }

    function refreshJob(listInstance, job) {

        var listItem = listInstance.options.element.querySelector('.listItem[data-id=\'' + job.Id + '\']');

        if (!listItem) {
            return;
        }

        listItem.querySelector('.jobStatus').innerHTML = getProgressText(job);
    }

    function getProgressText(job) {

        var status = job.Status;

        if (status === 'Completed') {
            status = 'Synced';
        }

        var html = globalize.translate('SyncJobItemStatus' + status);

        if (job.Status === 'Transferring' || job.Status === 'Converting') {
            html += ' ';

            var progress = job.Progress || 0;
            if (progress > 0 && progress < 100) {
                progress = progress.toFixed(1);
            }
            html += progress + '%';
        }

        return html;
    }

    var supportsNativeLazyLoading = 'loading' in HTMLImageElement.prototype;
    // unfortunately right now Chrome's lazy loading is too eager and loads too much
    supportsNativeLazyLoading = false;

    function getSyncJobHtml(listInstance, job, apiClient, mode) {

        var html = '';

        var tagName = layoutManager.tv ? 'button' : 'div';
        var typeAttribute = tagName === 'button' ? ' type="button"' : '';

        var listItemClass = 'listItem listItem-border';

        if (layoutManager.tv) {
            listItemClass += ' listItem-button listItem-focusscale';

            listItemClass += ' btnJobMenu';
        }

        var canEdit = true; //// (job.ItemCount || 1) > 1 || job.Status === 'Queued';
        html += '<' + tagName + typeAttribute + ' class="' + listItemClass + '" data-canedit="' + canEdit + '" data-id="' + job.Id + '" data-status="' + job.Status + '">';

        var imgUrl;

        if (job.PrimaryImageItemId) {

            imgUrl = apiClient.getImageUrl(job.PrimaryImageItemId, {
                type: "Primary",
                width: 80,
                tag: job.PrimaryImageTag,
                minScale: 1.5
            });
        }

        if (imgUrl) {
            html += '<div class="listItemImageContainer" style="margin-left:.75em;">';

            if (supportsNativeLazyLoading) {
                html += '<img class="listItemImage" loading="lazy" src="' + imgUrl + '" />';
            } else {
                html += '<img class="listItemImage lazy" loading="lazy" src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" data-src="' + imgUrl + '" />';
            }

            html += '</div>';
        }
        else {
            if (mode === 'convert') {
                html += '<i class="md-icon listItemIcon">transform</i>';
            } else {
                html += '<i class="md-icon listItemIcon">cloud_download</i>';
            }
        }

        var textLines = [];

        var name = job.Name;

        if (job.ParentName) {
            name += ' - ' + job.ParentName;
        }

        textLines.push(name);

        if (job.ItemCount === 1) {
            textLines.push(globalize.translate('ValueOneItem'));
        } else {
            textLines.push(globalize.translate('ItemCount', job.ItemCount));
        }

        html += '<div class="listItemBody three-line">';

        for (var i = 0, length = textLines.length; i < length; i++) {

            if (i === 0) {
                html += '<h3 class="listItemBodyText">';
                html += textLines[i];
                html += '</h3>';
            } else {
                html += '<div class="listItemBodyText listItemBodyText-secondary">';
                html += textLines[i];
                html += '</div>';
            }
        }

        html += '<div class="listItemBodyText-secondary listItemBodyText jobStatus">';
        html += getProgressText(job);
        html += '</div>';

        html += '</div>';

        if (!layoutManager.tv) {

            if (canEdit) {
                html += '<button type="button" is="paper-icon-button-light" class="btnJobMenu listItemButton"><i class="md-icon">more_horiz</i></button>';
            } else {
                html += '<button type="button" is="paper-icon-button-light" class="btnCancelJob listItemButton"><i class="md-icon">delete</i></button>';
            }
        }

        html += '</' + tagName + '>';

        return html;
    }

    function renderList(listInstance, jobs, apiClient) {

        if ((Date.now() - listInstance.lastDataLoad) < 60000) {
            refreshList(listInstance, jobs);
            return;
        }

        listInstance.lastDataLoad = Date.now();

        var html = '';
        var lastTargetName = '';

        var mode = listInstance.options.mode;
        var showTargetName = mode !== 'download';

        var hasOpenSection = false;

        for (var i = 0, length = jobs.length; i < length; i++) {

            var job = jobs[i];
            if (showTargetName) {
                var targetName = job.TargetName || 'Unknown';

                if (targetName !== lastTargetName) {

                    if (lastTargetName) {
                        html += '</div>';
                        html += '<br/>';
                        hasOpenSection = false;
                    }

                    lastTargetName = targetName;

                    html += '<div class="verticalSection">';
                    html += '<div class="sectionTitleContainer">';

                    html += '<h2 class="sectionTitle">' + targetName + '</h2>';

                    html += '</div>';
                    html += '<div class="itemsContainer vertical-list paperList">';
                    hasOpenSection = true;
                }
            }

            html += getSyncJobHtml(listInstance, job, apiClient, mode);
        }

        if (hasOpenSection) {
            html += '</div>';
            html += '</div>';
        }

        var elem = listInstance.options.element.querySelector('.syncJobListContent');

        if (!html) {
            if (mode === 'download') {
                html = '<div style="padding:1em .25em;">' + globalize.translate('MessageNoDownloadsFound') + '</div>';
            } else {
                html = '<div style="padding:1em .25em;">' + globalize.translate('MessageNoSyncJobsFound') + '</div>';
            }
        }

        elem.innerHTML = html;

        imageLoader.lazyChildren(elem);
    }

    function fetchData(listInstance) {

        listInstance.lastDataLoad = 0;
        loading.show();

        var options = {};
        var apiClient = getApiClient(listInstance);

        if (listInstance.options.userId) {
            options.UserId = listInstance.options.userId;
        }

        if (listInstance.options.mode === 'download') {
            options.TargetId = apiClient.deviceId();
        }

        else if (listInstance.options.mode === 'convert') {
            options.IncludeProviders = 'ConvertSyncProvider';
        } else {
            options.ExcludeProviders = 'ConvertSyncProvider';
        }

        return apiClient.getJSON(apiClient.getUrl('Sync/Jobs', options)).then(function (response) {

            renderList(listInstance, response.Items, apiClient);
            loading.hide();
        });
    }

    function getApiClient(listInstance) {
        return connectionManager.getApiClient(listInstance.options.serverId);
    }

    function showJobMenu(listInstance, elem) {

        var item = dom.parentWithClass(elem, 'listItem');
        var jobId = item.getAttribute('data-id');
        var status = item.getAttribute('data-status');

        var menuItems = [];

        if (item.getAttribute('data-canedit') === 'true') {
            menuItems.push({
                name: globalize.translate('Edit'),
                id: 'edit'
            });
        }

        var txt = globalize.translate('RemoveDownload');

        menuItems.push({
            name: txt,
            id: 'cancel'
        });

        require(['actionsheet'], function (actionsheet) {

            actionsheet.show({
                items: menuItems,
                positionTo: elem,
                callback: function (id) {

                    switch (id) {

                        case 'delete':
                            cancelJob(listInstance, jobId);
                            break;
                        case 'cancel':
                            cancelJob(listInstance, jobId);
                            break;
                        case 'edit':
                            showJobEditor(listInstance, elem);
                            break;
                        default:
                            break;
                    }
                }
            });

        });
    }

    function onElementClick(e) {

        var listInstance = this;

        var btnJobMenu = dom.parentWithClass(e.target, 'btnJobMenu');
        if (btnJobMenu) {
            showJobMenu(listInstance, btnJobMenu);
            return;
        }

        var btnCancelJob = dom.parentWithClass(e.target, 'btnCancelJob');
        if (btnCancelJob) {
            var listItem = dom.parentWithClass(btnCancelJob, 'listItem');
            if (listItem) {
                var jobId = listItem.getAttribute('data-id');
                cancelJob(listInstance, jobId);
            }
            return;
        }

        showJobEditor(listInstance, e.target);
    }

    function showJobEditor(listInstance, elem) {

        var listItem = dom.parentWithClass(elem, 'listItem');
        if (listItem && listItem.getAttribute('data-canedit') === 'true') {
            var jobId = listItem.getAttribute('data-id');
            // edit job
            require(['syncJobEditor'], function (syncJobEditor) {
                syncJobEditor.show({

                    serverId: listInstance.options.serverId,
                    jobId: jobId,
                    mode: listInstance.options.mode

                }).then(function () {
                    fetchData(listInstance);
                }, function () {
                    // also update on rejection - just to be sure
                    fetchData(listInstance);
                });
            });
        }
    }

    function syncJobList(options) {
        this.options = options;

        var onSyncJobCreatedHandler = onSyncJobCreated.bind(this);
        this.onSyncJobCreatedHandler = onSyncJobCreatedHandler;
        events.on(serverNotifications, 'SyncJobCreated', onSyncJobCreatedHandler);

        var onSyncJobCancelledHandler = onSyncJobCancelled.bind(this);
        this.onSyncJobCancelledHandler = onSyncJobCancelledHandler;
        events.on(serverNotifications, 'SyncJobCancelled', onSyncJobCancelledHandler);

        var onSyncJobUpdatedHandler = onSyncJobUpdated.bind(this);
        this.onSyncJobUpdatedHandler = onSyncJobUpdatedHandler;
        events.on(serverNotifications, 'SyncJobUpdated', onSyncJobUpdatedHandler);

        var onClickHandler = onElementClick.bind(this);
        options.element.addEventListener('click', onClickHandler);
        this.onClickHandler = onClickHandler;

        options.element.innerHTML = '<div class="syncJobListContent"></div>';

        fetchData(this);
    }

    syncJobList.prototype.destroy = function () {

        var onSyncJobCreatedHandler = this.onSyncJobCreatedHandler;
        this.onSyncJobCreatedHandler = null;
        events.off(serverNotifications, 'SyncJobCreated', onSyncJobCreatedHandler);

        var onSyncJobCancelledHandler = this.onSyncJobCancelledHandler;
        this.onSyncJobCancelledHandler = null;
        events.off(serverNotifications, 'SyncJobCancelled', onSyncJobCancelledHandler);

        var onSyncJobUpdatedHandler = this.onSyncJobUpdatedHandler;
        this.onSyncJobUpdatedHandler = null;
        events.off(serverNotifications, 'SyncJobUpdated', onSyncJobUpdatedHandler);

        var onClickHandler = this.onClickHandler;
        this.onClickHandler = null;
        this.options.element.removeEventListener('click', onClickHandler);

        this.options = null;
    };

    return syncJobList;
});