define(['emby-tabs', 'emby-button', 'emby-linkbutton'], function () {
    'use strict';

    var tabOwnerView;
    var queryScope = document.querySelector('.skinHeader');
    var footerTabsContainer;
    var headerTabsContainer;

    function enableTabsInFooter() {
        return false;
    }

    function getTabsContainerElem() {
    }

    function ensureElements(enableInFooter) {

        if (enableInFooter) {
            if (!footerTabsContainer) {
                footerTabsContainer = document.createElement('div');
                footerTabsContainer.classList.add('footerTabs');
                footerTabsContainer.classList.add('sectionTabs');
                footerTabsContainer.classList.add('hide');
                //appFooter.add(footerTabsContainer);
            }
        }

        if (!headerTabsContainer) {
            headerTabsContainer = queryScope.querySelector('.headerTabs');
        }
    }

    function setTabs(view, selectedIndex, builder) {

        var enableInFooter = enableTabsInFooter();

        if (!view) {
            if (tabOwnerView) {

                if (!headerTabsContainer) {
                    headerTabsContainer = queryScope.querySelector('.headerTabs');
                }

                ensureElements(enableInFooter);

                document.body.classList.remove('withSectionTabs');

                headerTabsContainer.innerHTML = '';
                headerTabsContainer.classList.add('hide');

                if (footerTabsContainer) {
                    footerTabsContainer.innerHTML = '';
                    footerTabsContainer.classList.add('hide');
                }

                tabOwnerView = null;
            }
            return;
        }

        ensureElements(enableInFooter);

        var tabsContainerElem = enableInFooter ? footerTabsContainer : headerTabsContainer;

        if (!tabOwnerView) {
            tabsContainerElem.classList.remove('hide');
        }

        if (tabOwnerView !== view) {

            var index = 0;

            var indexAttribute = selectedIndex == null ? '' : (' data-index="' + selectedIndex + '"');
            var tabsHtml = '<div is="emby-tabs"' + indexAttribute + ' class="tabs-viewmenubar"><div class="emby-tabs-slider" style="white-space:nowrap;">' + builder().map(function (t) {

                var tabClass = 'emby-tab-button';

                if (t.enabled === false) {
                    tabClass += ' hide';
                }

                var tabHtml;

                if (t.href) {
                    tabHtml = '<a href="' + t.href + '" is="emby-linkbutton" class="' + tabClass + '" data-index="' + index + '"><div class="emby-button-foreground">' + t.name + '</div></a>';
                } else {
                    tabHtml = '<button type="button" is="emby-button" class="' + tabClass + '" data-index="' + index + '"><div class="emby-button-foreground">' + t.name + '</div></button>';
                }

                index++;
                return tabHtml;

            }).join('') + '</div></div>';

            tabsContainerElem.innerHTML = tabsHtml;

            document.body.classList.add('withSectionTabs');
            tabOwnerView = view;
            return true;
        }

        tabsContainerElem.querySelector('[is="emby-tabs"]').selectedIndex(selectedIndex);

        tabOwnerView = view;
        return false;
    }

    function getTabsElement() {
        return document.querySelector('.tabs-viewmenubar');
    }

    return {
        setTabs: setTabs,
        getTabsElement: getTabsElement
    };
});