﻿define(['dialogHelper', 'loading', 'apphost', 'layoutManager', 'connectionManager', 'appRouter', 'globalize', 'userSettings', 'emby-checkbox', 'emby-input', 'paper-icon-button-light', 'emby-select', 'material-icons', 'css!./../formdialog', 'emby-button', 'emby-linkbutton', 'flexStyles', 'emby-scroller'], function (dialogHelper, loading, appHost, layoutManager, connectionManager, appRouter, globalize, userSettings) {
    'use strict';

    var currentServerId;

    function parentWithClass(elem, className) {

        while (!elem.classList || !elem.classList.contains(className)) {
            elem = elem.parentNode;

            if (!elem) {
                return null;
            }
        }

        return elem;
    }

    function onSubmit(e) {
        loading.show();

        var panel = parentWithClass(this, 'dialog');

        var collectionId = panel.querySelector('#selectCollectionToAddTo').value;

        var apiClient = connectionManager.getApiClient(currentServerId);

        if (collectionId) {
            userSettings.set('collectioneditor-lastcollectionid', collectionId);
            addToCollection(apiClient, panel, collectionId);
        } else {
            createCollection(apiClient, panel);
        }

        e.preventDefault();
        return false;
    }

    function createCollection(apiClient, dlg) {

        var url = apiClient.getUrl("Collections", {

            Name: dlg.querySelector('#txtNewCollectionName').value,
            IsLocked: !dlg.querySelector('#chkEnableInternetMetadata').checked,
            Ids: dlg.querySelector('.fldSelectedItemIds').value || ''
        });

        apiClient.ajax({
            type: "POST",
            url: url,
            dataType: "json"

        }).then(function (result) {

            loading.hide();

            var id = result.Id;

            dlg.submitted = true;
            dialogHelper.close(dlg);
            redirectToCollection(apiClient, id);

        });
    }

    function redirectToCollection(apiClient, id) {

        appRouter.showItem(id, apiClient.serverId());
    }

    function addToCollection(apiClient, dlg, id) {

        var url = apiClient.getUrl("Collections/" + id + "/Items", {

            Ids: dlg.querySelector('.fldSelectedItemIds').value || ''
        });

        apiClient.ajax({
            type: "POST",
            url: url

        }).then(function () {

            loading.hide();

            dlg.submitted = true;
            dialogHelper.close(dlg);

            require(['toast'], function (toast) {
                toast(globalize.translate('MessageItemsAdded'));
            });
        });
    }

    function triggerChange(select) {
        select.dispatchEvent(new CustomEvent('change', {}));
    }

    function populateCollections(panel) {

        loading.show();

        var select = panel.querySelector('#selectCollectionToAddTo');

        panel.querySelector('.newCollectionInfo').classList.add('hide');

        var options = {

            Recursive: true,
            IncludeItemTypes: "BoxSet",
            SortBy: "SortName",
            EnableTotalRecordCount: false
        };

        var apiClient = connectionManager.getApiClient(currentServerId);
        apiClient.getItems(apiClient.getCurrentUserId(), options).then(function (result) {

            var html = '';

            html += '<option value="">' + globalize.translate('OptionNew') + '</option>';

            html += result.Items.map(function (i) {

                return '<option value="' + i.Id + '">' + i.Name + '</option>';
            });

            select.innerHTML = html;

            var defaultValue;
            if (!defaultValue) {
                defaultValue = userSettings.get('collectioneditor-lastcollectionid') || '';
            }
            select.value = defaultValue === 'new' ? '' : defaultValue;

            triggerChange(select);

            loading.hide();
        });
    }

    function getEditorHtml() {

        var html = '';

        html += '<div is="emby-scroller" data-horizontal="false" data-centerfocus="card" class="formDialogContent">';
        html += '<div class="scrollSlider">';
        html += '<form class="dialogContentInner dialog-content-centered" style="padding-top:2em;">';

        html += '<div>';
        html += globalize.translate('NewCollectionHelp');
        html += '</div>';

        html += '<div class="fldSelectCollection">';
        html += '<br/>';
        html += '<br/>';
        html += '<div class="selectContainer">';
        html += '<select is="emby-select" label="' + globalize.translate('LabelCollection') + '" id="selectCollectionToAddTo" autofocus></select>';
        html += '</div>';
        html += '</div>';

        html += '<div class="newCollectionInfo">';

        html += '<div class="inputContainer">';
        html += '<input is="emby-input" type="text" id="txtNewCollectionName" required="required" label="' + globalize.translate('LabelName') + '" />';
        html += '<div class="fieldDescription">' + globalize.translate('NewCollectionNameExample') + '</div>';
        html += '</div>';

        html += '<label class="checkboxContainer">';
        html += '<input is="emby-checkbox" type="checkbox" id="chkEnableInternetMetadata" />';
        html += '<span>' + globalize.translate('SearchForCollectionInternetMetadata') + '</span>';
        html += '</label>';

        // newCollectionInfo
        html += '</div>';

        html += '<div class="formDialogFooter">';
        html += '<button is="emby-button" type="submit" class="raised btnSubmit block formDialogFooterItem button-submit">' + globalize.translate('ButtonOk') + '</button>';
        html += '</div>';

        html += '<input type="hidden" class="fldSelectedItemIds" />';

        html += '</form>';
        html += '</div>';
        html += '</div>';

        return html;
    }

    function initEditor(content, items) {

        content.querySelector('#selectCollectionToAddTo').addEventListener('change', function () {
            if (this.value) {
                content.querySelector('.newCollectionInfo').classList.add('hide');
                content.querySelector('#txtNewCollectionName').removeAttribute('required');
            } else {
                content.querySelector('.newCollectionInfo').classList.remove('hide');
                content.querySelector('#txtNewCollectionName').setAttribute('required', 'required');
            }
        });

        content.querySelector('form').addEventListener('submit', onSubmit);

        content.querySelector('.fldSelectedItemIds', content).value = items.join(',');

        if (items.length) {
            content.querySelector('.fldSelectCollection').classList.remove('hide');
            populateCollections(content);
        } else {
            content.querySelector('.fldSelectCollection').classList.add('hide');

            var selectCollectionToAddTo = content.querySelector('#selectCollectionToAddTo');
            selectCollectionToAddTo.innerHTML = '';
            selectCollectionToAddTo.value = '';
            triggerChange(selectCollectionToAddTo);
        }
    }

    function CollectionEditor() {

    }

    CollectionEditor.prototype.show = function (options) {

        var items = options.items || {};
        currentServerId = options.serverId;

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
        var title = items.length ? globalize.translate('HeaderAddToCollection') : globalize.translate('NewCollection');

        html += '<div class="formDialogHeader">';
        html += '<button is="paper-icon-button-light" class="btnCancel autoSize" tabindex="-1"><i class="md-icon">&#xE5C4;</i></button>';
        html += '<h3 class="formDialogHeaderTitle">';
        html += title;
        html += '</h3>';

        if (appHost.supports('externallinks')) {
            html += '<a is="emby-linkbutton" class="button-link btnHelp flex align-items-center" href="https://github.com/MediaBrowser/Wiki/wiki/Collections" target="_blank" style="margin-left:auto;margin-right:.5em;padding:.25em;" title="' + globalize.translate('Help') + '"><i class="md-icon">&#xE88E;</i><span style="margin-left:.25em;">' + globalize.translate('Help') + '</span></a>';
        }

        html += '</div>';

        html += getEditorHtml();

        dlg.innerHTML = html;

        initEditor(dlg, items);

        dlg.querySelector('.btnCancel').addEventListener('click', function () {

            dialogHelper.close(dlg);
        });

        return dialogHelper.open(dlg).then(function () {

            if (dlg.submitted) {
                return Promise.resolve();
            }

            return Promise.reject();
        });
    };

    return CollectionEditor;
});