define(['itemShortcuts', 'connectionManager', 'layoutManager', 'browser', 'dom', 'loading', 'focusManager', 'serverNotifications', 'events', 'registerElement'], function (itemShortcuts, connectionManager, layoutManager, browser, dom, loading, focusManager, serverNotifications, events) {
    'use strict';

    var ItemsContainerProtoType = Object.create(HTMLDivElement.prototype);

    function onClick(e) {

        var itemsContainer = this;
        var target = e.target;

        var multiSelect = itemsContainer.multiSelect;

        if (multiSelect) {
            if (multiSelect.onContainerClick.call(itemsContainer, e) === false) {
                return;
            }
        }

        itemShortcuts.onClick.call(itemsContainer, e);
    }

    function disableEvent(e) {

        e.preventDefault();
        e.stopPropagation();
        return false;
    }

    function onContextMenu(e) {

        var itemsContainer = this;

        var target = e.target;
        var card = dom.parentWithAttribute(target, 'data-id');

        // check for serverId, it won't be present on selectserver
        if (card && card.getAttribute('data-serverid')) {

            //var itemSelectionPanel = card.querySelector('.itemSelectionPanel');

            //if (!itemSelectionPanel) {
            //    showContextMenu(card, {});
            //}

            itemShortcuts.showContextMenu(card, {
                positionTo: target,
                itemsContainer: itemsContainer
            });

            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }

    function getShortcutOptions() {
        return {
            click: false
        };
    }

    ItemsContainerProtoType.enableHoverMenu = function (enabled) {

        var current = this.hoverMenu;

        if (!enabled) {
            if (current) {
                current.destroy();
                this.hoverMenu = null;
            }
            return;
        }

        if (current) {
            return;
        }

        var self = this;
        require(['itemHoverMenu'], function (ItemHoverMenu) {
            self.hoverMenu = new ItemHoverMenu(self);
        });
    };

    ItemsContainerProtoType.enableMultiSelect = function (enabled) {

        var current = this.multiSelect;

        if (!enabled) {
            if (current) {
                current.destroy();
                this.multiSelect = null;
            }
            return;
        }

        if (current) {
            return;
        }

        var self = this;
        require(['multiSelect'], function (MultiSelect) {
            self.multiSelect = new MultiSelect({
                container: self,
                bindOnClick: false
            });
        });
    };

    function onDrop(evt, itemsContainer) {

        var el = evt.item;

        var newIndex = evt.newIndex;
        var itemId = el.getAttribute('data-playlistitemid');
        var playlistId = el.getAttribute('data-playlistid');

        if (!playlistId) {

            var oldIndex = evt.oldIndex;

            el.dispatchEvent(new CustomEvent('itemdrop', {
                detail: {
                    oldIndex: oldIndex,
                    newIndex: newIndex,
                    playlistItemId: itemId
                },
                bubbles: true,
                cancelable: false
            }));
            return;
        }

        var serverId = el.getAttribute('data-serverid');
        var apiClient = connectionManager.getApiClient(serverId);

        newIndex = Math.max(0, newIndex - 1);

        loading.show();

        apiClient.ajax({

            url: apiClient.getUrl('Playlists/' + playlistId + '/Items/' + itemId + '/Move/' + newIndex),

            type: 'POST'

        }).then(function () {

            loading.hide();

        }, function () {

            loading.hide();

            itemsContainer.dispatchEvent(new CustomEvent('needsrefresh', {
                detail: {},
                cancelable: false,
                bubbles: true
            }));
        });
    }

    ItemsContainerProtoType.enableDragReordering = function (enabled) {

        var current = this.sortable;

        if (!enabled) {
            if (current) {
                current.destroy();
                this.sortable = null;
            }
            return;
        }

        if (current) {
            return;
        }

        var self = this;
        require(['sortable'], function (Sortable) {

            self.sortable = new Sortable(self, {

                draggable: ".listItem",
                handle: '.listViewDragHandle',

                // dragging ended
                onEnd: function (/**Event*/evt) {

                    return onDrop(evt, self);
                }
            });
        });
    };

    function onUserDataChanged(e, apiClient, userData) {

        var itemsContainer = this;

        require(['cardBuilder'], function (cardBuilder) {
            cardBuilder.onUserDataChanged(userData, itemsContainer);
        });
    }

    function onTimerCreated(e, apiClient, data) {

        var itemsContainer = this;

        var programId = data.ProgramId;
        // This could be null, not supported by all tv providers
        var newTimerId = data.Id;

        require(['cardBuilder'], function (cardBuilder) {
            cardBuilder.onTimerCreated(programId, newTimerId, itemsContainer);
        });
    }

    function onSeriesTimerCreated(e, apiClient, data) {
        var itemsContainer = this;
    }

    function onTimerCancelled(e, apiClient, data) {
        var itemsContainer = this;
        var id = data.Id;

        require(['cardBuilder'], function (cardBuilder) {
            cardBuilder.onTimerCancelled(id, itemsContainer);
        });
    }

    function onSeriesTimerCancelled(e, apiClient, data) {
        var itemsContainer = this;
        var id = data.Id;

        require(['cardBuilder'], function (cardBuilder) {
            cardBuilder.onSeriesTimerCancelled(id, itemsContainer);
        });
    }

    function addNotificationEvent(instance, name, handler) {

        var localHandler = handler.bind(instance);
        events.on(serverNotifications, name, localHandler);
        instance[name] = localHandler;
    }

    function removeNotificationEvent(instance, name) {

        var handler = instance[name];
        if (handler) {
            events.off(serverNotifications, name, handler);
            instance[name] = null;
        }
    }

    function alphanumeric(value) {
        var letterNumber = /^[0-9a-zA-Z]+$/;
        return value.match(letterNumber);
    }

    function onKeyDown(e) {

        var keyCode = e.keyCode;
        var chrCode = keyCode - 48 * Math.floor(keyCode / 48);
        chrCode = (96 <= keyCode) ? chrCode : keyCode;
        var chr = String.fromCharCode(chrCode);

        chr = alphanumeric(chr);

        if (chr) {
            currentDisplayTextContainer = this;
            onAlphanumericKeyPress(e, chr);
        }
    }

    var inputDisplayElement;
    var currentDisplayText = '';
    var currentDisplayTextContainer;
    function ensureInputDisplayElement() {
        if (!inputDisplayElement) {
            inputDisplayElement = document.createElement('div');
            inputDisplayElement.classList.add('alphanumeric-shortcut');
            inputDisplayElement.classList.add('hide');

            document.body.appendChild(inputDisplayElement);
        }
    }

    var alpanumericShortcutTimeout;
    function clearAlphaNumericShortcutTimeout() {
        if (alpanumericShortcutTimeout) {
            clearTimeout(alpanumericShortcutTimeout);
            alpanumericShortcutTimeout = null;
        }
    }
    function resetAlphaNumericShortcutTimeout() {
        clearAlphaNumericShortcutTimeout();
        alpanumericShortcutTimeout = setTimeout(onAlphanumericShortcutTimeout, 2000);
    }

    function onAlphanumericKeyPress(e, chr) {
        if (currentDisplayText.length >= 3) {
            return;
        }
        ensureInputDisplayElement();
        currentDisplayText += chr;
        inputDisplayElement.innerHTML = currentDisplayText;
        inputDisplayElement.classList.remove('hide');
        resetAlphaNumericShortcutTimeout();
    }

    function onAlphanumericShortcutTimeout() {
        var value = currentDisplayText;
        var container = currentDisplayTextContainer;

        currentDisplayText = '';
        currentDisplayTextContainer = null;
        inputDisplayElement.innerHTML = '';
        inputDisplayElement.classList.add('hide');
        clearAlphaNumericShortcutTimeout();
        selectByShortcutValue(container, value);
    }

    function selectByShortcutValue(container, value) {

        value = value.toUpperCase();

        var focusElem;
        if (value === '#') {

            focusElem = container.querySelector('*[data-prefix]');
        }

        if (!focusElem) {
            focusElem = container.querySelector('*[data-prefix^=\'' + value + '\']');
        }

        if (focusElem) {
            focusManager.focus(focusElem);
        }
    }

    ItemsContainerProtoType.createdCallback = function () {

        this.classList.add('itemsContainer');
    };

    ItemsContainerProtoType.attachedCallback = function () {

        this.addEventListener('click', onClick);

        if (browser.touch) {
            this.addEventListener('contextmenu', disableEvent);
        } else {
            if (this.getAttribute('data-contextmenu') !== 'false') {
                this.addEventListener('contextmenu', onContextMenu);
            }
        }

        if (this.getAttribute('data-alphanumericshortcuts') === 'true') {
            dom.addEventListener(this, 'keydown', onKeyDown, {
                passive: true
            });
        }

        if (layoutManager.desktop && this.getAttribute('data-hovermenu') !== 'false') {
            this.enableHoverMenu(true);
        }

        if (layoutManager.desktop || layoutManager.mobile) {
            if (this.getAttribute('data-multiselect') !== 'false') {
                this.enableMultiSelect(true);
            }
        }

        if (layoutManager.tv) {
            this.classList.add('itemsContainer-tv');
        }

        itemShortcuts.on(this, getShortcutOptions());

        addNotificationEvent(this, 'UserDataChanged', onUserDataChanged);
        addNotificationEvent(this, 'TimerCreated', onTimerCreated);
        addNotificationEvent(this, 'SeriesTimerCreated', onSeriesTimerCreated);
        addNotificationEvent(this, 'TimerCancelled', onTimerCancelled);
        addNotificationEvent(this, 'SeriesTimerCancelled', onSeriesTimerCancelled);

        if (this.getAttribute('data-dragreorder') === 'true') {
            this.enableDragReordering(true);
        }
    };

    ItemsContainerProtoType.detachedCallback = function () {

        dom.removeEventListener(this, 'keydown', onKeyDown, {
            passive: true
        });

        this.enableHoverMenu(false);
        this.enableMultiSelect(false);
        this.enableDragReordering(false);
        this.removeEventListener('click', onClick);
        this.removeEventListener('contextmenu', onContextMenu);
        this.removeEventListener('contextmenu', disableEvent);
        itemShortcuts.off(this, getShortcutOptions());

        removeNotificationEvent(this, 'UserDataChanged');
        removeNotificationEvent(this, 'TimerCreated');
        removeNotificationEvent(this, 'SeriesTimerCreated');
        removeNotificationEvent(this, 'TimerCancelled');
        removeNotificationEvent(this, 'SeriesTimerCancelled');
    };

    document.registerElement('emby-itemscontainer', {
        prototype: ItemsContainerProtoType,
        extends: 'div'
    });
});