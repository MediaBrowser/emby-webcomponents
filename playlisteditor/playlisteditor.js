define(['shell', 'dialogHelper', 'loading', 'layoutManager', 'connectionManager', 'scrollHelper', 'embyRouter', 'globalize', 'paper-checkbox', 'paper-input', 'paper-icon-button-light', 'emby-select', 'html!./../icons/nav.html', 'css!./../formdialog'], function (shell, dialogHelper, loading, layoutManager, connectionManager, scrollHelper, embyRouter, globalize) {

    var lastPlaylistId = '';
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

    function onSubmit() {

        loading.show();

        var panel = parentWithClass(this, 'dialog');

        var playlistId = $('#selectPlaylistToAddTo', panel).val();

        if (playlistId) {
            lastPlaylistId = playlistId;
            addToPlaylist(panel, playlistId);
        } else {
            createPlaylist(panel);
        }

        return false;
    }

    function createPlaylist(dlg) {

        var url = ApiClient.getUrl("Playlists", {

            Name: $('#txtNewPlaylistName', dlg).val(),
            Ids: $('.fldSelectedItemIds', dlg).val() || '',
            userId: ApiClient.getCurrentUserId()

        });

        ApiClient.ajax({
            type: "POST",
            url: url,
            dataType: "json"

        }).then(function (result) {

            loading.hide();

            var id = result.Id;

            dialogHelper.close(dlg);
            redirectToPlaylist(ApiClient, id);
        });
    }

    function redirectToPlaylist(apiClient, id) {

        apiClient.getItem(apiClient.getCurrentUserId(), id).then(function (item) {

            embyRouter.showItem(item);
        });
    }

    function addToPlaylist(dlg, id) {

        var url = ApiClient.getUrl("Playlists/" + id + "/Items", {

            Ids: $('.fldSelectedItemIds', dlg).val() || '',
            userId: ApiClient.getCurrentUserId()
        });

        ApiClient.ajax({
            type: "POST",
            url: url

        }).then(function () {

            loading.hide();

            dialogHelper.close(dlg);

            require(['toast'], function (toast) {
                toast(globalize.translate('sharedcomponents#MessageItemsAdded'));
            });
        });
    }

    function triggerChange(select) {
        select.dispatchEvent(new CustomEvent('change', {}));
    }

    function populatePlaylists(panel) {

        var select = $('#selectPlaylistToAddTo', panel);

        if (!select.length) {

            $('#txtNewPlaylistName', panel).val('').focus();
            return;
        }

        loading.hide();

        $('.newPlaylistInfo', panel).hide();

        var options = {

            Recursive: true,
            IncludeItemTypes: "Playlist",
            SortBy: 'SortName'
        };

        ApiClient.getItems(ApiClient.getCurrentUserId(), options).then(function (result) {

            var html = '';

            html += '<option value="">' + globalize.translate('OptionNewPlaylist') + '</option>';

            html += result.Items.map(function (i) {

                return '<option value="' + i.Id + '">' + i.Name + '</option>';
            });

            select.html(html).val(lastPlaylistId || '').trigger('change');

            loading.hide();
        });
    }

    function getEditorHtml() {

        var html = '';

        html += '<form style="margin:auto;">';

        html += '<div class="fldSelectPlaylist">';
        html += '<label for="selectPlaylistToAddTo" class="selectLabel">' + globalize.translate('LabelSelectPlaylist') + '</label>';
        html += '<select id="selectPlaylistToAddTo" data-mini="true"></select>';
        html += '</div>';

        html += '<div class="newPlaylistInfo">';

        html += '<div>';
        html += '<paper-input type="text" id="txtNewPlaylistName" required="required" label="' + globalize.translate('LabelName') + '"></paper-input>';
        html += '</div>';

        html += '<br />';

        // newPlaylistInfo
        html += '</div>';

        html += '<br />';
        html += '<div>';
        html += '<button type="submit" class="clearButton" data-role="none"><paper-button raised class="submit block">' + globalize.translate('ButtonOk') + '</paper-button></button>';
        html += '</div>';

        html += '<input type="hidden" class="fldSelectedItemIds" />';

        html += '</form>';

        return html;
    }

    function initEditor(content, items) {

        $('#selectPlaylistToAddTo', content).on('change', function () {

            if (this.value) {
                $('.newPlaylistInfo', content).hide();
                $('input', content).removeAttr('required');
            } else {
                $('.newPlaylistInfo', content).show();
                $('input', content).attr('required', 'required');
            }

        }).trigger('change');

        populatePlaylists(content);

        content.querySelector('.btnSubmit').addEventListener('click', function () {
            // Do a fake form submit this the button isn't a real submit button
            var fakeSubmit = document.createElement('input');
            fakeSubmit.setAttribute('type', 'submit');
            fakeSubmit.style.display = 'none';
            var form = content.querySelector('form');
            form.appendChild(fakeSubmit);
            fakeSubmit.click();

            // Seeing issues in smart tv browsers where the form does not get submitted if the button is removed prior to the submission actually happening
            setTimeout(function () {
                form.removeChild(fakeSubmit);
            }, 500);
        });

        content.querySelector('form').addEventListener('submit', onSubmit);

        $('.fldSelectedItemIds', content).val(items.join(','));

        if (items.length) {
            $('.fldSelectPlaylist', content).show();
            populatePlaylists(content);
        } else {
            $('.fldSelectPlaylist', content).hide();
            $('#selectPlaylistToAddTo', content).html('').val('').trigger('change');
        }
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
            html += '<button is="paper-icon-button-light" class="btnCancel" tabindex="-1"><iron-icon icon="nav:arrow-back"></iron-icon></button>';
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