define(['require', 'dialogHelper', 'loading', 'apphost', 'layoutManager', 'connectionManager', 'appRouter', 'globalize', 'userSettings', 'emby-checkbox', 'emby-input', 'paper-icon-button-light', 'emby-select', 'material-icons', 'css!./../formdialog', 'emby-button', 'emby-linkbutton', 'flexStyles'], function (require, dialogHelper, loading, appHost, layoutManager, connectionManager, appRouter, globalize, userSettings) {
    'use strict';

    function onSubmit(e) {

        e.preventDefault();
        return false;
    }

    function initEditor(context, settings) {

        context.querySelector('form').addEventListener('submit', onSubmit);

        var elems = context.querySelectorAll('.viewSetting-checkboxContainer');

        for (var i = 0, length = elems.length; i < length; i++) {

            elems[i].querySelector('input').checked = settings[elems[i].getAttribute('data-settingname')] || false;
        }

        context.querySelector('.selectImageType').value = settings.imageType || 'primary';
    }

    function saveValues(context, settings, settingsKey) {

        var elems = context.querySelectorAll('.viewSetting-checkboxContainer');
        for (var i = 0, length = elems.length; i < length; i++) {
            userSettings.set(settingsKey + '-' + elems[i].getAttribute('data-settingname'), elems[i].querySelector('input').checked);
        }

        userSettings.set(settingsKey + '-imageType', context.querySelector('.selectImageType').value);
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

        return new Promise(function (resolve, reject) {

            require(['text!./viewsettings.template.html'], function (template) {

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
                html += '<h3 class="formDialogHeaderTitle">${Settings}</h3>';

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

                dlg.querySelector('.btnCancel').addEventListener('click', function () {

                    dialogHelper.close(dlg);
                });

                if (layoutManager.tv) {
                    centerFocus(dlg.querySelector('.formDialogContent'), false, true);
                }

                var submitted;

                dlg.querySelector('form').addEventListener('change', function () {

                    submitted = true;

                }, true);

                dialogHelper.open(dlg).then(function () {

                    if (layoutManager.tv) {
                        centerFocus(dlg.querySelector('.formDialogContent'), false, false);
                    }

                    if (submitted) {
                        saveValues(dlg, options.settings, options.settingsKey);
                        resolve();
                        return;
                    }

                    reject();
                });
            });
        });
    };

    return ViewSettings;
});