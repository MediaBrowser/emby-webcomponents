define(['shell', 'dialogHelper', 'loading', 'layoutManager', 'connectionManager', 'scrollHelper', 'embyRouter', 'globalize', 'emby-input', 'paper-icon-button-light', 'emby-select', 'material-icons', 'css!./../formdialog', 'emby-button'], function (shell, dialogHelper, loading, layoutManager, connectionManager, scrollHelper, embyRouter, globalize) {

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
        var apiClient = connectionManager.getApiClient(currentServerId);

        e.preventDefault();
        return false;
    }

    function getEditorHtml() {

        var html = '';

        html += '<div class="dialogContent smoothScrollY">';
        html += '<div class="dialogContentInner centeredContent">';
        html += '<form style="margin:auto;">';

        html += '<div class="fldSelectPlaylist">';
        html += '<select is="emby-select" id="selectPlaylistToAddTo" label="' + globalize.translate('sharedcomponents#LabelPlaylist') + '" autofocus></select>';
        html += '</div>';

        html += '<div class="newPlaylistInfo">';

        html += '<div class="inputContainer">';
        html += '<input is="emby-input" type="text" id="txtNewPlaylistName" required="required" label="' + globalize.translate('sharedcomponents#LabelName') + '" />';
        html += '</div>';

        html += '<br />';

        // newPlaylistInfo
        html += '</div>';

        html += '<br />';
        html += '<div>';
        html += '<button is="emby-button" type="submit" class="raised btnSubmit block">' + globalize.translate('sharedcomponents#ButtonOk') + '</button>';
        html += '</div>';

        html += '<input type="hidden" class="fldSelectedItemIds" />';

        html += '</form>';
        html += '</div>';
        html += '</div>';

        return html;
    }

    function initEditor(content, items) {

        content.querySelector('form').addEventListener('submit', onSubmit);
    }

    function playlisteditor() {

        var self = this;

        self.show = function (options) {

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
            var title = globalize.translate('sharedcomponents#AddToPlaylist');

            html += '<div class="dialogHeader" style="margin:0 0 2em;">';
            html += '<button is="paper-icon-button-light" class="btnCancel autoSize" tabindex="-1"><i class="md-icon">arrow_back</i></button>';
            html += '<div class="dialogHeaderTitle">';
            html += title;
            html += '</div>';

            html += '</div>';

            html += getEditorHtml();

            dlg.innerHTML = html;
            document.body.appendChild(dlg);

            initEditor(dlg, items);

            dlg.querySelector('.btnCancel').addEventListener('click', function () {

                dialogHelper.close(dlg);
            });

            if (layoutManager.tv) {
                scrollHelper.centerFocus.on(dlg.querySelector('.dialogContent'), false);
            }

            return new Promise(function (resolve, reject) {

                dlg.addEventListener('close', resolve);
                dialogHelper.open(dlg);
            });
        };
    }

    return playlisteditor;
});