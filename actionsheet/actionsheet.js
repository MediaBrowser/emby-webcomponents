define(['paperdialoghelper', 'paper-button', 'css!./actionsheet'], function (paperdialoghelper) {

    function show(options) {

        // items
        // positionTo
        // showCancel
        // title
        var dlg = paperdialoghelper.createDialog({
            removeOnClose: true,
            size: 'fullscreen'
        });

        dlg.classList.add('actionSheet');

        var html = '';

        if (options.title) {
            html += '<h1>';
            html += options.title;
            html += '</h1>';
        }

        // There seems to be a bug with this in safari causing it to immediately roll up to 0 height
        // Set to false for now because it's handled upstream by paperdialoghelper
        html += '<div class="actionSheetScroller">';

        // If any items have an icon, give them all an icon just to make sure they're all lined up evenly
        var renderIcon = options.items.filter(function (o) {
            return o.ironIcon;
        }).length;

        //html += '<div>';
        for (var i = 0, length = options.items.length; i < length; i++) {

            var option = options.items[i];

            var autoFocus = option.selected ? ' autoFocus' : '';
            html += '<paper-button' + autoFocus + ' class="actionSheetMenuItem" data-id="' + option.id + '" style="display:block;">';

            if (option.ironIcon) {
                html += '<iron-icon icon="' + option.ironIcon + '"></iron-icon>';
            }
            else if (renderIcon) {
                // Need this when left-justified but not when centered
                //html += '<iron-icon></iron-icon>';
            }
            html += '<span>' + option.name + '</span>';
            html += '</paper-button>';
        }
        //html += '</div>';

        html += '</div>';

        if (options.showCancel) {
            html += '<div class="buttons">';
            html += '<paper-button dialog-dismiss>' + Globalize.translate('core#ButtonCancel') + '</paper-button>';
            html += '</div>';
        }

        dlg.innerHTML = html;
        document.body.appendChild(dlg);

        // Seeing an issue in some non-chrome browsers where this is requiring a double click
        var eventName = 'click';//$.browser.chrome ? 'click' : 'mousedown';
        var selectedId;
        var submitted = false;

        dlg.addEventListener(eventName, function (e) {

            var actionSheetMenuItem = Emby.Dom.parentWithClass(e.target, 'actionSheetMenuItem');

            if (actionSheetMenuItem) {

                submitted = true;
                selectedId = actionSheetMenuItem.getAttribute('data-id');

                paperdialoghelper.close(dlg);
            }

        });

        return paperdialoghelper.open(dlg).then(function () {

            if (submitted) {

                if (options.callback) {
                    options.callback(selectedId);
                }
                return selectedId;
            } else {
                return Promise.reject();
            }
        });
    }

    return {
        show: show
    };
});