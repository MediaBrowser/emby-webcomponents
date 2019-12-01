define(['dom', 'browser', 'events', 'layoutManager', 'emby-tabs', 'emby-button', 'emby-linkbutton'], function (dom, browser, events, layoutManager) {
    'use strict';

    var tabOwnerView;
    var queryScope = document.querySelector('.skinHeader');
    var headerTabsContainer;
    var tabsElem;
    var headerTop;

    function ensureElements() {

        if (!headerTabsContainer) {
            headerTabsContainer = queryScope.querySelector('.headerMiddle');
        }
    }

    function onViewTabsReady() {
        this.selectedIndex(this.readySelectedIndex);
        this.readySelectedIndex = null;
    }

    function defaultGetTabContainersFn() {
        return [];
    }

    function setTabs(view, selectedIndex, getTabsFn, getTabContainersFn, onBeforeTabChange, onTabChange, setSelectedIndex) {

        if (!view) {
            if (tabOwnerView) {

                if (!headerTabsContainer) {
                    headerTabsContainer = queryScope.querySelector('.headerMiddle');
                }

                ensureElements();

                document.documentElement.classList.remove('withSectionTabs');

                if (headerTop) {
                    headerTop.classList.remove('headerTop-withSectionTabs');
                }

                headerTabsContainer.innerHTML = '';
                headerTabsContainer.classList.add('hide');

                tabOwnerView = null;
            }
            return {
                tabsContainer: headerTabsContainer,
                replaced: false
            };
        }

        ensureElements();

        var tabsContainerElem = headerTabsContainer;

        if (!tabOwnerView) {
            tabsContainerElem.classList.remove('hide');
        }

        if (tabOwnerView !== view) {

            var index = 0;

            var indexAttribute = selectedIndex == null ? '' : (' data-index="' + selectedIndex + '"');
            var tabsHtml = '<div is="emby-tabs"' + indexAttribute + ' class="tabs-viewmenubar"><div class="emby-tabs-slider">' + getTabsFn().map(function (t) {

                var tabClass = 'emby-tab-button';

                if (t.enabled === false) {
                    tabClass += ' hide';
                }

                var tabHtml;

                if (t.cssClass) {
                    tabClass += ' ' + t.cssClass;
                }

                if (t.href) {
                    tabHtml = '<a href="' + t.href + '" is="emby-linkbutton" class="' + tabClass + '" data-index="' + index + '">' + t.name + '</a>';
                } else {
                    tabHtml = '<button type="button" is="emby-button" class="' + tabClass + '" data-index="' + index + '">' + t.name + '</button>';
                }

                index++;
                return tabHtml;

            }).join('') + '</div></div>';

            tabsContainerElem.innerHTML = tabsHtml;

            document.documentElement.classList.add('withSectionTabs');

            if (!headerTop) {
                headerTop = document.querySelector('.headerTop');
            }

            headerTop.classList.add('headerTop-withSectionTabs');

            tabOwnerView = view;

            tabsElem = tabsContainerElem.querySelector('[is="emby-tabs"]');

            getTabContainersFn = getTabContainersFn || defaultGetTabContainersFn;

            tabsElem.addEventListener('beforetabchange', function (e) {

                var tabContainers = getTabContainersFn();
                if (e.detail.previousIndex != null) {

                    var previousPanel = tabContainers[e.detail.previousIndex];
                    if (previousPanel) {
                        previousPanel.classList.remove('is-active');
                    }
                }

                var newPanel = tabContainers[e.detail.selectedTabIndex];

                if (newPanel) {
                    newPanel.classList.add('is-active');
                }
            });

            if (onBeforeTabChange) {
                tabsElem.addEventListener('beforetabchange', onBeforeTabChange);
            }
            if (onTabChange) {
                tabsElem.addEventListener('tabchange', onTabChange);
            }

            if (setSelectedIndex !== false) {
                if (tabsElem.selectedIndex) {
                    tabsElem.selectedIndex(selectedIndex);
                } else {

                    tabsElem.readySelectedIndex = selectedIndex;
                    tabsElem.addEventListener('ready', onViewTabsReady);
                }
            }

            return {
                tabsContainer: tabsContainerElem,
                tabs: tabsContainerElem.querySelector('[is="emby-tabs"]'),
                replaced: true
            };
        }

        if (!tabsElem) {
            tabsElem = tabsContainerElem.querySelector('[is="emby-tabs"]');
        }

        tabsElem.selectedIndex(selectedIndex);

        tabOwnerView = view;
        return {
            tabsContainer: tabsContainerElem,
            tabs: tabsElem,
            replaced: false
        };
    }

    function selectedTabIndex(index) {

        var tabsContainerElem = headerTabsContainer;

        if (!tabsElem) {
            tabsElem = tabsContainerElem.querySelector('[is="emby-tabs"]');
        }

        if (index != null) {
            tabsElem.selectedIndex(index);
        } else {
            tabsElem.triggerTabChange();
        }
    }

    function getTabsElement() {
        return document.querySelector('.tabs-viewmenubar');
    }

    return {
        setTabs: setTabs,
        getTabsElement: getTabsElement,
        selectedTabIndex: selectedTabIndex
    };
});