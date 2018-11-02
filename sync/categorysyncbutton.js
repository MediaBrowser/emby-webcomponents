define(['itemHelper', 'apphost'], function (itemHelper, appHost) {
    'use strict';

    function onCategorySyncButtonClick(e) {

        var button = this;
        var category = button.getAttribute('data-category');
        var parentId = button.getAttribute('data-parentid');

        require(['syncDialog'], function (syncDialog) {
            syncDialog.showMenu({
                ParentId: parentId,
                Category: category,
                serverId: button.getAttribute('data-serverid'),
                mode: appHost.supports('sync') ? 'download' : 'sync'
            });
        });
    }

    return {
        init: function (btn, user, serverId, parentId) {

            btn.setAttribute('data-parentid', parentId);
            btn.setAttribute('data-serverid', serverId);

            var item = {
                SupportsSync: true
            };

            if (itemHelper.canSync(user, item)) {
                btn.classList.remove('hide');
            } else {
                btn.classList.add('hide');
            }

            btn.addEventListener('click', onCategorySyncButtonClick);
        }
    };
});