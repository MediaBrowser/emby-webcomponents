define(['dialogHelper', 'dom', 'layoutManager', 'globalize', 'require', 'material-icons', 'emby-button', 'paper-icon-button-light', 'emby-input', 'formDialogStyle', 'flexStyles', 'emby-scroller'], function (dialogHelper, dom, layoutManager, globalize, require) {
    'use strict';

    function replaceAll(originalString, strReplace, strWith) {
        var reg = new RegExp(strReplace, 'ig');
        return originalString.replace(reg, strWith);
    }

    function showDialog(options, template) {

        var dialogOptions = {
            removeOnClose: true,
            scrollY: false
        };

        var enableTvLayout = layoutManager.tv;

        if (enableTvLayout) {
            dialogOptions.size = 'fullscreen';
        }

        var dlg = dialogHelper.createDialog(dialogOptions);

        dlg.classList.add('formDialog');

        dlg.innerHTML = globalize.translateHtml(template, 'sharedcomponents');

        dlg.classList.add('align-items-center');
        dlg.classList.add('justify-content-center');
        var formDialogContent = dlg.querySelector('.formDialogContent');
        formDialogContent.classList.add('no-grow');

        if (enableTvLayout) {
            formDialogContent.style['max-width'] = '50%';
            formDialogContent.style['max-height'] = '60%';
        } else {
            dlg.style.maxWidth = '35em';
            dlg.classList.add('dialog-fullscreen-lowres');
        }

        //dlg.querySelector('.btnCancel').addEventListener('click', function (e) {
        //    dialogHelper.close(dlg);
        //});

        if (options.title) {
            dlg.querySelector('.formDialogHeaderTitle').innerHTML = options.title || '';
        } else {
            dlg.querySelector('.formDialogHeaderTitle').classList.add('hide');
        }

        if (options.html) {

            dlg.querySelector('.text').innerHTML = options.html;

        } else if (options.text) {

            dlg.querySelector('.text').innerText = replaceAll(options.text || '', '<br/>', '\n');

        } else {
            dlg.querySelector('.dialogContentInner').classList.add('hide');
        }

        var i, length;
        var html = '';
        var hasDescriptions = false;

        for (i = 0, length = options.buttons.length; i < length; i++) {

            var item = options.buttons[i];
            var autoFocus = i === 0 ? ' autofocus' : '';

            var buttonClass = 'btnOption raised formDialogFooterItem formDialogFooterItem-autosize';

            if (item.type) {
                buttonClass += ' button-' + item.type;
            }

            if (item.description) {
                hasDescriptions = true;
            }

            if (hasDescriptions) {
                buttonClass += ' formDialogFooterItem-vertical formDialogFooterItem-nomarginbottom';
            }

            html += '<button is="emby-button" type="button" class="' + buttonClass + '" data-id="' + item.id + '"' + autoFocus + '>' + item.name + '</button>';

            if (item.description) {
                html += '<div class="formDialogFooterItem formDialogFooterItem-autosize fieldDescription" style="margin-top:.25em!important;margin-bottom:1.25em!important;">' + item.description + '</div>';
            }
        }

        dlg.querySelector('.formDialogFooter').innerHTML = html;

        if (hasDescriptions) {
            dlg.querySelector('.formDialogFooter').classList.add('formDialogFooter-vertical');
        }

        var dialogResult;
        function onButtonClick() {
            dialogResult = this.getAttribute('data-id');
            dialogHelper.close(dlg);
        }

        var buttons = dlg.querySelectorAll('.btnOption');
        for (i = 0, length = buttons.length; i < length; i++) {
            buttons[i].addEventListener('click', onButtonClick);
        }

        var timeout;
        if (options.timeout) {

            timeout = setTimeout(function () {

                dialogResult = '_timeout';
                dialogHelper.close(dlg);

            }, options.timeout);
        }

        return dialogHelper.open(dlg).then(function () {

            if (timeout) {
                clearTimeout(timeout);
            }

            if (dialogResult) {
                return dialogResult;
            } else {
                return Promise.reject();
            }
        });
    }

    return function (text, title) {

        var options;
        if (typeof text === 'string') {
            options = {
                title: title,
                text: text
            };
        } else {
            options = text;
        }

        return require(['text!./dialog.template.html']).then(function (responses) {
            return showDialog(options, responses[0]);
        });
    };
});