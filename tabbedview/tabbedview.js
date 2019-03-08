define(['backdrop', 'mainTabsManager', 'layoutManager', 'inputManager', 'connectionManager', 'emby-tabs'], function (backdrop, mainTabsManager, layoutManager, inputManager, connectionManager) {
    'use strict';

    function onViewDestroy(e) {

        var inputHandler = this.inputHandler;
        if (inputHandler) {
            inputManager.off(this.view, onInputCommand);
            this.inputHandler = null;
        }

        var tabControllers = this.tabControllers;

        if (tabControllers) {
            tabControllers.forEach(function (t) {
                if (t.destroy) {
                    t.destroy();
                }
            });

            this.tabControllers = null;
        }

        this.view = null;
        this.params = null;
        this.currentTabController = null;
        this.initialTabIndex = null;
        this.item = null;
    }

    function onBeforeTabChange() {

    }

    function TabbedView(view, params) {

        this.tabControllers = [];
        this.view = view;
        this.params = params;

        var self = this;

        var currentTabIndex = parseInt(params.tab || this.getDefaultTabIndex(params.parentId));
        this.initialTabIndex = currentTabIndex;

        function loadTab(index, previousIndex) {

            self.getTabController(index).then(function (controller) {

                var refresh = !controller.refreshed;

                controller.onResume({
                    autoFocus: previousIndex == null && layoutManager.tv,
                    refresh: refresh
                });

                controller.refreshed = true;

                currentTabIndex = index;
                self.currentTabController = controller;
            });
        }

        function getTabContainers() {
            return view.querySelectorAll('.tabContent');
        }

        function onTabChange(e) {
            var newIndex = parseInt(e.detail.selectedTabIndex);
            var previousIndex = e.detail.previousIndex;

            var previousTabController = previousIndex == null ? null : self.tabControllers[previousIndex];
            if (previousTabController && previousTabController.onPause) {
                previousTabController.onPause();
            }

            loadTab(newIndex, previousIndex);
        }

        view.addEventListener('viewbeforehide', this.onPause.bind(this));

        view.addEventListener('viewbeforeshow', function (e) {

            mainTabsManager.setTabs(view, currentTabIndex, self.getTabs, getTabContainers, onBeforeTabChange, onTabChange, false);
        });

        view.addEventListener('viewshow', function (e) {

            self.onResume(e.detail);
        });

        view.addEventListener('viewdestroy', onViewDestroy.bind(this));
    }

    function onInputCommand(e) {

        switch (e.detail.command) {

            case 'refresh':
                {
                    var currentTabController = this.currentTabController;

                    if (currentTabController && currentTabController.refresh) {

                        currentTabController.refresh({
                            refresh: true
                        });
                    }

                    break;
                }
            default:
                break;
        }
    }

    function refreshItem(instance) {

        if (instance.item) {
            // currently there's no real need to refresh this just for the title
            onItemRefreshed.call(instance, instance.item);
            return;
        }

        var params = instance.params;
        var apiClient = connectionManager.getApiClient(params.serverId);

        apiClient.getItem(apiClient.getCurrentUserId(), params.parentId).then(onItemRefreshed.bind(instance));
    }

    function onItemRefreshed(item) {
        this.item = item;
        this.setTitle();
    }

    TabbedView.prototype.onResume = function (options) {

        var params = this.params;
        if (params.serverId && params.parentId) {
            refreshItem(this);
        } else {
            this.setTitle();
        }

        backdrop.clear();

        var currentTabController = this.currentTabController;

        if (!currentTabController) {
            mainTabsManager.selectedTabIndex(this.initialTabIndex);
        }
        else if (currentTabController && currentTabController.onResume) {
            currentTabController.onResume({});
        }

        var inputHandler = onInputCommand.bind(this);
        inputManager.on(window, inputHandler);
        this.inputHandler = inputHandler;
    };

    TabbedView.prototype.onPause = function () {

        var inputHandler = this.inputHandler;
        if (inputHandler) {
            inputManager.off(window, onInputCommand);
            this.inputHandler = null;
        }

        var currentTabController = this.currentTabController;

        if (currentTabController && currentTabController.onPause) {
            currentTabController.onPause();
        }
    };

    TabbedView.prototype.setTitle = function () {
        Emby.Page.setTitle(this.getTitle());
    };

    TabbedView.prototype.getTitle = function () {

        var item = this.item;

        return item ? item.Name : '';
    };

    return TabbedView;
});