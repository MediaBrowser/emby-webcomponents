define(['dialogHelper', 'loading', 'apphost', 'layoutManager', 'connectionManager', 'appRouter', 'globalize', 'emby-checkbox', 'emby-input', 'paper-icon-button-light', 'emby-select', 'material-icons', 'css!./../formdialog', 'emby-button', 'emby-linkbutton', 'flexStyles'], function (dialogHelper, loading, appHost, layoutManager, connectionManager, appRouter, globalize) {
    'use strict';

    function onSubmit(e) {

        e.preventDefault();
        return false;
    }

    function getEditorHtml() {

        var html = '';

        html += '<div class="formDialogContent smoothScrollY" style="padding-top:2em;">';
        html += '<div class="dialogContentInner dialog-content-centered">';
        html += '<form style="margin:auto;">';

        html += '<div class="checkboxContainer">';
        html += '<label>';
        html += '<input is="emby-checkbox" type="checkbox" id="chkShowTitles" />';
        html += '<span>' + globalize.translate('sharedcomponents#ShowTitles') + '</span>';
        html += '</label>';
        html += '</div>';

        html += '</form>';
        html += '</div>';
        html += '</div>';

        return html;
    }

    function initEditor(content, items) {

        content.querySelector('form').addEventListener('submit', onSubmit);
    }

    function centerFocus(elem, horiz, on) {
        require(['scrollHelper'], function (scrollHelper) {
            var fn = on ? 'on' : 'off';
            scrollHelper.centerFocus[fn](elem, horiz);
        });
    }

    function ViewSettings() {

    }

    ViewSettings.prototype.show = function (options) {

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
        html += '<button is="paper-icon-button-light" class="btnCancel autoSize" tabindex="-1"><i class="md-icon">&#xE5C4;</i></button>';
        html += '<h3 class="formDialogHeaderTitle">';
        html += globalize.translate('sharedcomponents#Settings');
        html += '</h3>';

        html += '</div>';

        html += getEditorHtml();

        dlg.innerHTML = html;

        initEditor(dlg);

        dlg.querySelector('.btnCancel').addEventListener('click', function () {

            dialogHelper.close(dlg);
        });

        if (layoutManager.tv) {
            centerFocus(dlg.querySelector('.formDialogContent'), false, true);
        }

        var submited;

        dlg.querySelector('form').addEventListener('change', function () {

            submited = true;
        });

        return dialogHelper.open(dlg).then(function () {

            if (layoutManager.tv) {
                centerFocus(dlg.querySelector('.formDialogContent'), false, false);
            }

            if (submitted) {
                return Promise.resolve();
            }

            return Promise.reject();
        });
    };

    return ViewSettings;
});