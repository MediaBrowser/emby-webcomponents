define(['backdrop', 'mainTabsManager', 'layoutManager', 'emby-tabs'], function (backdrop, mainTabsManager, layoutManager) {
    'use strict';

    function onViewDestroy(e) {

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
    }

    function onBeforeTabChange() {

    }

    function TabbedView(view, params) {

        this.tabControllers = [];
        this.view = view;
        this.params = params;

        var self = this;

        var currentTabController;

        var currentTabIndex = parseInt(params.tab || this.getDefaultTabIndex(params.parentId));
        var initialTabIndex = currentTabIndex;

        function validateTabLoad(index) {

            return self.validateTabLoad ? self.validateTabLoad(index) : Promise.resolve();
        }

        function loadTab(index) {

            validateTabLoad(index).then(function () {
                self.getTabController(index).then(function (controller) {

                    var refresh = !controller.refreshed;

                    controller.onResume({
                        autoFocus: initialTabIndex != null && layoutManager.tv,
                        refresh: refresh
                    });

                    controller.refreshed = true;

                    initialTabIndex = null;
                    currentTabIndex = index;
                    currentTabController = controller;
                });
            });
        }

        function getTabContainers() {
            return view.querySelectorAll('.tabContent');
        }

        function onTabChange(e) {
            var newIndex = parseInt(e.detail.selectedTabIndex);
            var previousTabController = e.detail.previousIndex == null ? null : self.tabControllers[e.detail.previousIndex];
            if (previousTabController && previousTabController.onPause) {
                previousTabController.onPause();
            }

            loadTab(newIndex);
        }

        view.addEventListener('viewbeforehide', function (e) {

            if (currentTabController && currentTabController.onPause) {
                currentTabController.onPause();
            }
        });

        view.addEventListener('viewbeforeshow', function (e) {

            mainTabsManager.setTabs(view, currentTabIndex, self.getTabs, getTabContainers, onBeforeTabChange, onTabChange, false);
        });

        view.addEventListener('viewshow', function (e) {

            var isViewRestored = e.detail.isRestored;

            self.setTitle();
            backdrop.clear();

            if (!isViewRestored) {
                mainTabsManager.selectedTabIndex(initialTabIndex);
            }
            else if (currentTabController && currentTabController.onResume) {
                currentTabController.onResume({});
            }
        });

        view.addEventListener('viewdestroy', onViewDestroy.bind(this));
    }

    TabbedView.prototype.setTitle = function () {
        Emby.Page.setTitle('');
    };

    return TabbedView;
});