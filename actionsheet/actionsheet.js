define(['apphost', 'dialogHelper', 'layoutManager', 'globalize', 'browser', 'dom', 'emby-button', 'css!./actionsheet', 'material-icons', 'listViewStyle', 'emby-scroller'], function (appHost, dialogHelper, layoutManager, globalize, browser, dom) {
    'use strict';

    function getOffsets(elems) {

        var doc = document;
        var results = [];

        if (!doc) {
            return results;
        }

        var box;
        var elem;

        for (var i = 0, length = elems.length; i < length; i++) {

            elem = elems[i];
            // Support: BlackBerry 5, iOS 3 (original iPhone)
            // If we don't have gBCR, just use 0,0 rather than error
            if (elem.getBoundingClientRect) {
                box = elem.getBoundingClientRect();
            } else {
                box = { top: 0, left: 0 };
            }

            results[i] = {
                top: box.top,
                left: box.left,
                width: box.width,
                height: box.height
            };
        }

        return results;
    }

    function getPosition(options, dlg) {

        var windowSize = dom.getWindowSize();
        var windowHeight = windowSize.innerHeight;
        var windowWidth = windowSize.innerWidth;

        var pos = getOffsets([options.positionTo])[0];

        if (options.positionY !== 'top') {
            pos.top += (pos.height || 0) / 2;
        }

        pos.left += (pos.width || 0) / 2;

        var height = dlg.offsetHeight || 300;
        var width = dlg.offsetWidth || 160;

        // Account for popup size 
        pos.top -= height / 2;
        pos.left -= width / 2;

        // Avoid showing too close to the bottom
        var overflowX = pos.left + width - windowWidth;
        var overflowY = pos.top + height - windowHeight;

        if (overflowX > 0) {
            pos.left -= (overflowX + 20);
        }
        if (overflowY > 0) {
            pos.top -= (overflowY + 20);
        }

        pos.top += (options.offsetTop || 0);
        pos.left += (options.offsetLeft || 0);

        // Do some boundary checking
        pos.top = Math.max(pos.top, 10);
        pos.left = Math.max(pos.left, 10);

        return pos;
    }

    var hasPhysicalBackButton = appHost.supports('physicalbackbutton');

    function show(options) {

        // items
        // positionTo
        // showCancel
        // title
        var dialogOptions = {
            removeOnClose: true,
            enableHistory: options.enableHistory,
            autoFocus: true,
            autoCenter: false
        };

        var backButton = false;

        if (layoutManager.tv) {
            dialogOptions.size = 'fullscreen';
            backButton = true;
            dialogOptions.autoFocus = true;
        } else {

            dialogOptions.modal = false;
        }

        var type = options.type;
        if (layoutManager.tv) {
            type = null;
        }

        var dlg = dialogHelper.createDialog(dialogOptions);

        dlg.classList.add('actionSheet');

        if (type) {
            dlg.classList.add('actionSheet-' + type);
        }

        if (options.dialogClass) {
            dlg.classList.add(options.dialogClass);
        }

        var html = '';

        var i, length, option;
        var renderIcon = false;
        var icons = [];
        var itemIcon;
        for (i = 0, length = options.items.length; i < length; i++) {

            option = options.items[i];

            itemIcon = option.icon || (option.selected ? '&#xe5ca;' : null);

            if (itemIcon) {
                renderIcon = true;
            }
            icons.push(itemIcon || '');
        }

        if (layoutManager.tv) {
            html += '<button is="paper-icon-button-light" class="btnCloseActionSheet btnCloseActionSheet-tv hide-mouse-idle-tv" tabindex="-1"><i class="md-icon">&#xE5C4;</i></button>';
        }

        // If any items have an icon, give them all an icon just to make sure they're all lined up evenly
        var center = options.title && (!renderIcon /*|| itemsWithIcons.length != options.items.length*/);

        if (center || layoutManager.tv) {
            dlg.classList.add('actionsheet-centered');
        }

        if (options.title) {

            var headerClass = 'actionSheetTitle';
            if (type === 'select') {
                headerClass += ' actionSheetTitle-select';
            }

            html += '<h2 class="' + headerClass + '">';
            html += options.title;
            html += '</h2>';
        }
        if (options.text) {
            html += '<p class="actionSheetText">';
            html += options.text;
            html += '</p>';
        }

        var scrollerClassName = 'actionSheetScroller';
        if (layoutManager.tv) {
            scrollerClassName += ' actionSheetScroller-tv focuscontainer-x focuscontainer-y';
        }

        if (type) {
            scrollerClassName += ' actionSheetScroller-' + type;
        }

        if (options.title || options.text) {
            scrollerClassName += ' actionSheetScroller-withheader';
        }

        html += '<div is="emby-scroller" data-horizontal="false" data-centerfocus="card" class="' + scrollerClassName + '">';
        html += '<div class="scrollSlider flex flex-direction-column">';

        var menuItemClass = 'listItem listItem-button actionSheetMenuItem';

        if (options.border || options.shaded) {
            menuItemClass += ' listItem-border';
        }

        if (options.menuItemClass) {
            menuItemClass += ' ' + options.menuItemClass;
        }

        if (layoutManager.tv) {
            menuItemClass += ' listItem-focusscale';
        }

        if (type) {
            menuItemClass += ' actionSheetMenuItem-' + type;
        }

        if (layoutManager.tv) {
            menuItemClass += ' actionSheetMenuItem-tv';
        }

        var asideTextClass = 'actionSheetItemAsideText';

        if (type) {
            asideTextClass += ' actionSheetItemAsideText-' + type;
        }

        var listItemBodyClass = 'actionsheetListItemBody';

        if (type) {
            listItemBodyClass += ' actionsheetListItemBody-' + type;
        }

        var itemIconClass = 'actionsheetMenuItemIcon listItemIcon listItemIcon-transparent md-icon secondaryText';

        if (type) {
            itemIconClass += ' actionsheetMenuItemIcon-' + type;
        }

        for (i = 0, length = options.items.length; i < length; i++) {

            option = options.items[i];

            if (option.divider) {

                html += '<div class="actionsheetDivider"></div>';
                continue;
            }

            var autoFocus = option.selected ? ' autoFocus' : '';

            var currentMenuItemClass = menuItemClass;

            if (option.selected) {
                currentMenuItemClass += ' actionSheetMenuItem-selected';
            }

            // Check for null in case int 0 was passed in
            var optionId = option.id == null || option.id === '' ? option.value : option.id;
            html += '<button' + autoFocus + ' is="emby-button" type="button" class="' + currentMenuItemClass + '" data-id="' + optionId + '">';

            itemIcon = icons[i];

            if (itemIcon) {

                html += '<i class="' + itemIconClass + '">' + itemIcon + '</i>';
            }
            else if (renderIcon && !center) {
                html += '<i class="' + itemIconClass + '" style="visibility:hidden;">&#xe5ca;</i>';
            }

            html += '<div class="listItemBody ' + listItemBodyClass + '">';

            html += '<div class="listItemBodyText actionSheetItemText">';
            html += (option.name || option.textContent || option.innerText);
            html += '</div>';

            if (option.secondaryText) {
                html += '<div class="listItemBodyText listItemBodyText-secondary">';
                html += option.secondaryText;
                html += '</div>';
            }

            html += '</div>';

            if (option.asideText) {
                html += '<div class="listItemAside ' + asideTextClass + '">';
                html += option.asideText;
                html += '</div>';
            }

            if (option.asideIcon) {
                html += '<div class="listItemAside ' + asideTextClass + '"><i class="md-icon">';
                html += option.asideIcon;
                html += '</i></div>';
            }

            html += '</button>';
        }

        html += '</div>';
        html += '</div>';

        if (options.bottomText) {
            html += '<div class="actionSheetBottomText fieldDescription">';
            html += options.bottomText;
            html += '</div>';
        }

        if (!layoutManager.tv) {

            if (type === 'select' || !hasPhysicalBackButton) {
                if (type === 'select') {
                    html += '<div class="actionSheet-bottom actionSheet-select-bottom">';
                } else {
                    html += '<div class="actionSheet-bottom">';
                }

                var cancelButtonClass = 'btnCloseActionSheet btnCloseActionSheet-default';

                if (type === 'select') {
                    cancelButtonClass += ' btnCloseActionSheet-select';
                }

                html += '<button is="emby-button" type="button" class="' + cancelButtonClass + ' hide-mouse-idle-tv raised block">' + globalize.translate('Cancel') + '</button>';

                html += '</div>';
            }
        }

        dlg.innerHTML = html;

        var btnCloseActionSheet = dlg.querySelector('.btnCloseActionSheet');
        if (btnCloseActionSheet) {
            dlg.querySelector('.btnCloseActionSheet').addEventListener('click', function () {
                dialogHelper.close(dlg);
            });
        }

        // Seeing an issue in some non-chrome browsers where this is requiring a double click
        //var eventName = browser.firefox ? 'mousedown' : 'click';
        var selectedId;

        var timeout;
        if (options.timeout) {
            timeout = setTimeout(function () {
                dialogHelper.close(dlg);
            }, options.timeout);
        }

        return new Promise(function (resolve, reject) {

            var isResolved;

            dlg.addEventListener('click', function (e) {

                var actionSheetMenuItem = dom.parentWithClass(e.target, 'actionSheetMenuItem');

                if (actionSheetMenuItem) {
                    selectedId = actionSheetMenuItem.getAttribute('data-id');

                    if (options.resolveOnClick) {

                        if (options.resolveOnClick.indexOf) {

                            if (options.resolveOnClick.indexOf(selectedId) !== -1) {

                                resolve(selectedId);
                                isResolved = true;
                            }

                        } else {
                            resolve(selectedId);
                            isResolved = true;
                        }
                    }

                    dialogHelper.close(dlg);
                }

            });

            dlg.addEventListener('close', function () {

                if (timeout) {
                    clearTimeout(timeout);
                    timeout = null;
                }

                if (!isResolved) {
                    if (selectedId != null) {
                        if (options.callback) {
                            options.callback(selectedId);
                        }

                        resolve(selectedId);
                    } else {
                        reject();
                    }
                }
            });

            dialogHelper.open(dlg);

            var pos = options.positionTo && dialogOptions.size !== 'fullscreen' ? getPosition(options, dlg) : null;

            if (pos) {
                dlg.style.position = 'fixed';
                dlg.style.left = pos.left + 'px';
                dlg.style.top = pos.top + 'px';
            }
        });
    }

    return {
        show: show
    };
});