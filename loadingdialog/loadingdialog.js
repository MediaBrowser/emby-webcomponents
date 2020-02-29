define(['loading', 'events', 'dialogHelper', 'dom', 'layoutManager', 'globalize', 'require', 'material-icons', 'emby-button', 'paper-icon-button-light', 'emby-input', 'formDialogStyle', 'flexStyles', 'emby-scroller'], function (loading, events, dialogHelper, dom, layoutManager, globalize, require) {
    'use strict';

    function showDialog(instance, options, template) {

        var dialogOptions = {
            removeOnClose: true,
            scrollY: false
        };

        var enableTvLayout = layoutManager.tv;

        if (enableTvLayout) {
            dialogOptions.size = 'fullscreen';
        }

        var dlg = dialogHelper.createDialog(dialogOptions);

        var configuredButtons = [];

        dlg.classList.add('formDialog');

        dlg.innerHTML = globalize.translateHtml(template, 'sharedcomponents');

        dlg.classList.add('align-items-center');
        dlg.classList.add('justify-items-center');

        var formDialogContent = dlg.querySelector('.formDialogContent');
        formDialogContent.style['flex-grow'] = 'initial';
        formDialogContent.style['max-width'] = '50%';
        formDialogContent.style['max-height'] = '60%';

        if (enableTvLayout) {
            dlg.querySelector('.formDialogHeader').style.marginTop = '15%';
        } else {
            dlg.classList.add('dialog-fullscreen-lowres');
        }

        //dlg.querySelector('.btnCancel').addEventListener('click', function (e) {
        //    dialogHelper.close(dlg);
        //});

        dlg.querySelector('.formDialogHeaderTitle').innerHTML = options.title;

        dlg.querySelector('.dialogContentInner').innerHTML = options.text;

        instance.dlg = dlg;

        return dialogHelper.open(dlg).then(function () {

            loading.hide();
        });
    }

    function LoadingDialog(options) {

        this.options = options;
    }

    LoadingDialog.prototype.show = function () {

        var instance = this;
        loading.show();

        return require(['text!./../dialog/dialog.template.html']).then(function (responses) {
            return showDialog(instance, instance.options, responses[0]);
        });
    };

    LoadingDialog.prototype.setTitle = function (title) {

    };

    LoadingDialog.prototype.setText = function (text) {

    };

    LoadingDialog.prototype.hide = function () {

        if (this.dlg) {
            dialogHelper.close(this.dlg);
            this.dlg = null;
        }
    };

    LoadingDialog.prototype.destroy = function () {

        this.dlg = null;
        this.options = null;
    };

    return LoadingDialog;
});