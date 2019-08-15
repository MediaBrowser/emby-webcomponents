﻿define(['dialogHelper', 'layoutManager', 'globalize', 'browser', 'dom', 'emby-button', 'css!./actionsheet', 'material-icons', 'scrollStyles', 'listViewStyle', 'emby-scroller'], function (dialogHelper, layoutManager, globalize, browser, dom) {
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

    function show(options) {

        // items
        // positionTo
        // showCancel
        // title
        var dialogOptions = {
            removeOnClose: true,
            enableHistory: options.enableHistory,
            autoFocus: true
        };

        var backButton = false;

        if (layoutManager.tv) {
            dialogOptions.size = 'fullscreen';
            backButton = true;
            dialogOptions.autoFocus = true;
        } else {

            dialogOptions.modal = false;
            dialogOptions.autoFocus = false;
        }

        var dlg = dialogHelper.createDialog(dialogOptions);

        dlg.classList.add('actionSheet');

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

            itemIcon = option.icon || (option.selected ? 'check' : null);

            if (itemIcon) {
                renderIcon = true;
            }
            icons.push(itemIcon || '');
        }

        if (layoutManager.tv) {
            html += '<button is="paper-icon-button-light" class="btnCloseActionSheet hide-mouse-idle-tv" tabindex="-1"><i class="md-icon">&#xE5C4;</i></button>';
        }

        // If any items have an icon, give them all an icon just to make sure they're all lined up evenly
        var center = options.title && (!renderIcon /*|| itemsWithIcons.length != options.items.length*/);

        if (center || layoutManager.tv) {
            dlg.classList.add('actionsheet-centered');
        }

        if (options.title) {

            html += '<h2 class="actionSheetTitle">';
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

        html += '<div is="emby-scroller" data-horizontal="false" data-centerfocus="card" class="' + scrollerClassName + '">';
        html += '<div class="scrollSlider">';

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
        else {
            menuItemClass += ' actionsheet-xlargeFont';
        }

        for (i = 0, length = options.items.length; i < length; i++) {

            option = options.items[i];

            if (option.divider) {

                html += '<div class="actionsheetDivider"></div>';
                continue;
            }

            var autoFocus = option.selected ? ' autoFocus' : '';

            // Check for null in case int 0 was passed in
            var optionId = option.id == null || option.id === '' ? option.value : option.id;
            html += '<button' + autoFocus + ' is="emby-button" type="button" class="' + menuItemClass + '" data-id="' + optionId + '">';

            itemIcon = icons[i];

            if (itemIcon) {

                html += '<i class="actionsheetMenuItemIcon listItemIcon listItemIcon-transparent md-icon">' + itemIcon + '</i>';
            }
            else if (renderIcon && !center) {
                html += '<i class="actionsheetMenuItemIcon listItemIcon listItemIcon-transparent md-icon" style="visibility:hidden;">check</i>';
            }

            html += '<div class="listItemBody actionsheetListItemBody">';

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
                html += '<div class="listItemAside actionSheetItemAsideText">';
                html += option.asideText;
                html += '</div>';
            }

            if (option.asideIcon) {
                html += '<div class="listItemAside actionSheetItemAsideText"><i class="md-icon">';
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

        if (options.showCancel) {
            html += '<div class="buttons">';
            html += '<button is="emby-button" type="button" class="btnCloseActionSheet">' + globalize.translate('Cancel') + '</button>';
            html += '</div>';
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