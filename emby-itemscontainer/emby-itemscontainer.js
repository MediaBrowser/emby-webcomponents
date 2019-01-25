﻿define(['itemShortcuts', 'inputManager', 'connectionManager', 'playbackManager', 'imageLoader', 'layoutManager', 'browser', 'dom', 'loading', 'focusManager', 'serverNotifications', 'events'], function (itemShortcuts, inputManager, connectionManager, playbackManager, imageLoader, layoutManager, browser, dom, loading, focusManager, serverNotifications, events) {
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

            inputManager.trigger('menu', {
                sourceElement: card
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

    ItemsContainerProtoType.showMultiSelect = function (childElement) {

        var card = dom.parentWithAttribute(childElement, 'data-id');

        this.multiSelect.showSelections(card);
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

        loading.show();

        apiClient.ajax({

            url: apiClient.getUrl('Playlists/' + playlistId + '/Items/' + itemId + '/Move/' + newIndex),

            type: 'POST'

        }).then(function () {

            loading.hide();

        }, function () {

            loading.hide();

            itemsContainer.refreshItems();
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

            // Fix for https://github.com/SortableJS/Sortable/issues/1319
            if (browser.iOS) {
                self.sortable.el.addEventListener('touchstart', function(e) {

                    let element = e.target;
                    if (element && element.matches(".listViewDragHandle")) {
                        e.preventDefault();
                    }
                });
            }
        });
    };

    function onUserDataChanged(e, apiClient, userData) {

        var itemsContainer = this;

        require(['cardBuilder'], function (cardBuilder) {
            cardBuilder.onUserDataChanged(userData, itemsContainer);
        });

        var eventsToMonitor = getEventsToMonitor(itemsContainer);

        // TODO: Check user data change reason?
        if (eventsToMonitor.indexOf('markfavorite') !== -1) {

            itemsContainer.notifyRefreshNeeded();
        }
        else if (eventsToMonitor.indexOf('markplayed') !== -1) {

            itemsContainer.notifyRefreshNeeded();
        }
    }

    function getEventsToMonitor(itemsContainer) {

        var monitor = itemsContainer.getAttribute('data-monitor');
        if (monitor) {
            return monitor.split(',');
        }

        return [];
    }

    function onTimerCreated(e, apiClient, data) {

        var itemsContainer = this;

        if (getEventsToMonitor(itemsContainer).indexOf('timers') !== -1) {

            itemsContainer.notifyRefreshNeeded();
            return;
        }

        var programId = data.ProgramId;
        // This could be null, not supported by all tv providers
        var newTimerId = data.Id;

        require(['cardBuilder'], function (cardBuilder) {
            cardBuilder.onTimerCreated(programId, newTimerId, itemsContainer);
        });
    }

    function onSeriesTimerCreated(e, apiClient, data) {

        var itemsContainer = this;
        if (getEventsToMonitor(itemsContainer).indexOf('seriestimers') !== -1) {

            itemsContainer.notifyRefreshNeeded();
            return;
        }
    }

    function onTimerCancelled(e, apiClient, data) {
        var itemsContainer = this;

        if (getEventsToMonitor(itemsContainer).indexOf('timers') !== -1) {

            itemsContainer.notifyRefreshNeeded();
            return;
        }

        var id = data.Id;

        require(['cardBuilder'], function (cardBuilder) {
            cardBuilder.onTimerCancelled(id, itemsContainer);
        });
    }

    function onSeriesTimerCancelled(e, apiClient, data) {

        var itemsContainer = this;
        if (getEventsToMonitor(itemsContainer).indexOf('seriestimers') !== -1) {

            itemsContainer.notifyRefreshNeeded();
            return;
        }

        var id = data.Id;

        require(['cardBuilder'], function (cardBuilder) {
            cardBuilder.onSeriesTimerCancelled(id, itemsContainer);
        });
    }

    function onLibraryChanged(e, apiClient, data) {

        var itemsContainer = this;
        var eventsToMonitor = getEventsToMonitor(itemsContainer);
        if (eventsToMonitor.indexOf('seriestimers') !== -1 || eventsToMonitor.indexOf('timers') !== -1) {

            // yes this is an assumption
            return;
        }

        var itemsAdded = data.ItemsAdded || [];
        var itemsRemoved = data.ItemsRemoved || [];
        if (!itemsAdded.length && !itemsRemoved.length) {
            return;
        }

        var parentId = itemsContainer.getAttribute('data-parentid');
        if (parentId) {
            var foldersAddedTo = data.FoldersAddedTo || [];
            var foldersRemovedFrom = data.FoldersRemovedFrom || [];
            var collectionFolders = data.CollectionFolders || [];

            if (foldersAddedTo.indexOf(parentId) === -1 && foldersRemovedFrom.indexOf(parentId) === -1 && collectionFolders.indexOf(parentId) === -1) {
                return;
            }
        }

        itemsContainer.notifyRefreshNeeded();
    }

    function onPlaybackStopped(e, stopInfo) {

        var itemsContainer = this;

        var state = stopInfo.state;

        var eventsToMonitor = getEventsToMonitor(itemsContainer);
        if (state.NowPlayingItem && state.NowPlayingItem.MediaType === 'Video') {

            if (eventsToMonitor.indexOf('videoplayback') !== -1) {

                itemsContainer.notifyRefreshNeeded(true);
                return;
            }
        }

        else if (state.NowPlayingItem && state.NowPlayingItem.MediaType === 'Audio') {

            if (eventsToMonitor.indexOf('audioplayback') !== -1) {

                itemsContainer.notifyRefreshNeeded(true);
                return;
            }
        }
    }

    function addNotificationEvent(instance, name, handler, owner) {

        var localHandler = handler.bind(instance);
        owner = owner || serverNotifications;
        events.on(owner, name, localHandler);
        instance['event_' + name] = localHandler;
    }

    function removeNotificationEvent(instance, name, owner) {

        var handler = instance['event_' + name];
        if (handler) {
            owner = owner || serverNotifications;
            events.off(owner, name, handler);
            instance['event_' + name] = null;
        }
    }

    ItemsContainerProtoType.createdCallback = function () {

        this.classList.add('itemsContainer');
    };

    function getTouches(e) {

        return e.changedTouches || e.targetTouches || e.touches;
    }

    function clearTouchStartTimeout(elem) {
        if (elem.touchStartTimeout) {
            clearTimeout(elem.touchStartTimeout);
            elem.touchStartTimeout = null;
            elem.touchStartTimeoutTime = null;
        }
    }

    var touchTarget;

    function clearTouchTarget(container) {

        var target = touchTarget;

        if (!target) {
            return;
        }

        touchTarget = null;

        target.classList.remove('card-touchzoomactive');

        dom.removeEventListener(container, 'touchmove', onTouchMove, {
            passive: true
        });

        if (!browser.iOS) {
            dom.removeEventListener(container, 'touchend', onTouchEnd, {
                passive: true
            });
            dom.removeEventListener(container, 'touchcancel', onTouchEnd, {
                passive: true
            });
        }
    }

    function onTouchStart(e) {

        var touch = getTouches(e)[0];
        clearTouchTarget(this);
        this.touchStartX = 0;
        this.touchStartY = 0;

        if (touch) {
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;
            var element = touch.target;

            if (element) {
                var card = dom.parentWithClass(element, 'card');

                if (card) {

                    clearTouchStartTimeout(this);

                    card.classList.add('card-touchzoomactive');

                    dom.addEventListener(this, 'touchmove', onTouchMove, {
                        passive: true
                    });

                    if (!browser.iOS) {
                        dom.addEventListener(this, 'touchend', onTouchEnd, {
                            passive: true
                        });
                        dom.addEventListener(this, 'touchcancel', onTouchEnd, {
                            passive: true
                        });
                    }

                    touchTarget = card;
                    this.touchStartTimeout = setTimeout(onTouchStartTimerFired, 550);
                    this.touchStartTimeoutTime = new Date().getTime();
                }
            }
        }
    }

    function onTouchMove(e) {

        if (touchTarget) {
            var touch = getTouches(e)[0];
            var deltaX;
            var deltaY;

            if (touch) {
                var touchEndX = touch.clientX || 0;
                var touchEndY = touch.clientY || 0;
                deltaX = Math.abs(touchEndX - (this.touchStartX || 0));
                deltaY = Math.abs(touchEndY - (this.touchStartY || 0));
            } else {
                deltaX = 100;
                deltaY = 100;
            }
            if (deltaX >= 5 || deltaY >= 5) {
                clearTouchStartTimeout(this);
                clearTouchTarget(this);
            }
        }
    }

    function onTouchEnd(e) {

        if (browser.iOS) {
            var touch = getTouches(e)[0];

            if (touch) {

                var time = this.touchStartTimeoutTime;

                if (time) {

                    time = new Date().getTime() - time;

                    if (time >= 500) {
                        e.preventDefault();
                    }
                }
            }
        }

        clearTouchStartTimeout(this);
        clearTouchTarget(this);
    }

    function onTouchStartTimerFired() {

        var card = touchTarget;

        if (card) {

            var emptyFn = function () { };

            var focusArea = card.querySelector('.cardContent-mobilefocus');
            if (focusArea) {

                try {
                    focusArea.focus();
                }
                catch (err) {
                    console.log('error focusing card mobilefocus');
                }
            }

            // iOS doesn't support the context menu event so we have to trigger it manually here
            if (browser.iOS) {
                onContextMenu.call(card, { target: card, preventDefault: emptyFn, stopPropagation: emptyFn });
            }
        }
    }

    function bindContextMenuEvents(element) {

        // mobile safari doesn't allow contextmenu override

        element.addEventListener('contextmenu', onContextMenu);

        if (browser.touch) {
            dom.addEventListener(element, 'touchstart', onTouchStart, {
                passive: true
            });

            if (browser.iOS) {
                dom.addEventListener(element, 'touchend', onTouchEnd, {
                    //passive: true
                });
                dom.addEventListener(element, 'touchcancel', onTouchEnd, {
                    //passive: true
                });
            }
        }
    }

    ItemsContainerProtoType.attachedCallback = function () {

        this.addEventListener('click', onClick);

        if (this.getAttribute('data-contextmenu') !== 'false') {
            bindContextMenuEvents(this);
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
        addNotificationEvent(this, 'LibraryChanged', onLibraryChanged);
        addNotificationEvent(this, 'playbackstop', onPlaybackStopped, playbackManager);

        if (this.getAttribute('data-dragreorder') === 'true') {
            this.enableDragReordering(true);
        }
    };

    ItemsContainerProtoType.detachedCallback = function () {

        clearRefreshInterval(this);

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
        removeNotificationEvent(this, 'LibraryChanged');
        removeNotificationEvent(this, 'playbackstop', playbackManager);

        this.fetchData = null;
        this.getItemsHtml = null;
        this.parentContainer = null;
    };

    ItemsContainerProtoType.pause = function () {

        clearRefreshInterval(this, true);

        this.paused = true;
    };

    ItemsContainerProtoType.resume = function (options) {

        this.paused = false;

        var refreshIntervalEndTime = this.refreshIntervalEndTime;
        if (refreshIntervalEndTime) {

            var remainingMs = refreshIntervalEndTime - new Date().getTime();
            if (remainingMs > 0 && !this.needsRefresh) {

                resetRefreshInterval(this, remainingMs);

            } else {
                this.needsRefresh = true;
                this.refreshIntervalEndTime = null;
            }
        }

        if (this.needsRefresh || (options && options.refresh)) {
            return this.refreshItems();
        }

        return Promise.resolve();
    };

    ItemsContainerProtoType.refreshItems = function () {

        if (!this.fetchData) {
            return Promise.resolve();
        }

        if (this.paused) {
            this.needsRefresh = true;
            return Promise.resolve();
        }

        this.needsRefresh = false;

        return this.fetchData().then(onDataFetched.bind(this));
    };

    ItemsContainerProtoType.notifyRefreshNeeded = function (isInForeground) {

        if (this.paused) {
            this.needsRefresh = true;
            return;
        }

        var timeout = this.refreshTimeout;
        if (timeout) {
            clearTimeout(timeout);
        }

        if (isInForeground === true) {
            this.refreshItems();
        } else {
            this.refreshTimeout = setTimeout(this.refreshItems.bind(this), 10000);
        }
    };

    function clearRefreshInterval(itemsContainer, isPausing) {

        if (itemsContainer.refreshInterval) {

            clearInterval(itemsContainer.refreshInterval);
            itemsContainer.refreshInterval = null;

            if (!isPausing) {
                itemsContainer.refreshIntervalEndTime = null;
            }
        }
    }

    function resetRefreshInterval(itemsContainer, intervalMs) {

        clearRefreshInterval(itemsContainer);

        if (!intervalMs) {
            intervalMs = parseInt(itemsContainer.getAttribute('data-refreshinterval') || '0');
        }

        if (intervalMs) {
            itemsContainer.refreshInterval = setInterval(itemsContainer.notifyRefreshNeeded.bind(itemsContainer), intervalMs);
            itemsContainer.refreshIntervalEndTime = new Date().getTime() + intervalMs;
        }
    }

    function onDataFetched(result) {

        var items = result.Items || result;

        var parentContainer = this.parentContainer;
        if (parentContainer) {
            if (items.length) {
                parentContainer.classList.remove('hide');
            } else {
                parentContainer.classList.add('hide');
            }
        }

        // Scroll back up so they can see the results from the beginning
        // TODO: Find scroller
        //window.scrollTo(0, 0);

        var activeElement = document.activeElement;
        var focusId;
        var hasActiveElement;

        if (this.contains(activeElement)) {
            hasActiveElement = true;
            focusId = activeElement.getAttribute('data-id');
        }

        this.innerHTML = this.getItemsHtml(items);

        imageLoader.lazyChildren(this);

        if (hasActiveElement) {
            setFocus(this, focusId);
        }

        resetRefreshInterval(this);

        if (this.afterRefresh) {
            this.afterRefresh(result);
        }
    }

    function setFocus(itemsContainer, focusId) {
        if (focusId) {
            var newElement = itemsContainer.querySelector('[data-id="' + focusId + '"]');
            if (newElement) {

                try {
                    focusManager.focus(newElement);
                    return;
                }
                catch (err) {
                }
            }
        }

        focusManager.autoFocus(itemsContainer);
    }

    document.registerElement('emby-itemscontainer', {
        prototype: ItemsContainerProtoType,
        extends: 'div'
    });
});