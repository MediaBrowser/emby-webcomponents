define(['connectionManager', 'itemHelper', 'mediaInfo', 'userdataButtons', 'playbackManager', 'globalize', 'dom', 'apphost', 'css!./itemhovermenu', 'emby-button'], function (connectionManager, itemHelper, mediaInfo, userdataButtons, playbackManager, globalize, dom, appHost) {
    'use strict';

    var preventHover = false;
    var showOverlayTimeout;

    function onHoverOut(e) {

        var elem = e.target;

        if (showOverlayTimeout) {
            clearTimeout(showOverlayTimeout);
            showOverlayTimeout = null;
        }

        elem = elem.classList.contains('cardOverlayTarget') ? elem : elem.querySelector('.cardOverlayTarget');

        if (elem) {
            slideDownToHide(elem);
        }
    }

    function onSlideTransitionComplete() {
        this.classList.add('hide');
    }

    function slideDownToHide(elem) {

        if (elem.classList.contains('hide')) {
            return;
        }

        dom.addEventListener(elem, dom.whichTransitionEvent(), onSlideTransitionComplete, {
            once: true
        });

        elem.classList.remove('cardOverlayTarget-open');
    }

    function slideUpToShow(elem) {

        dom.removeEventListener(elem, dom.whichTransitionEvent(), onSlideTransitionComplete, {
            once: true
        });

        elem.classList.remove('hide');

        // force a reflow
        void elem.offsetWidth;

        elem.classList.add('cardOverlayTarget-open');
    }

    function getItemInfoFromCard(card) {

        return {
            Type: card.getAttribute('data-type'),
            Id: card.getAttribute('data-id'),
            TimerId: card.getAttribute('data-timerid'),
            CollectionType: card.getAttribute('data-collectiontype'),
            ChannelId: card.getAttribute('data-channelid'),
            SeriesId: card.getAttribute('data-seriesid'),
            ServerId: card.getAttribute('data-serverid'),
            MediaType: card.getAttribute('data-mediatype'),
            IsFolder: card.getAttribute('data-isfolder') === 'true',
            UserData: {
                PlaybackPositionTicks: parseInt(card.getAttribute('data-positionticks') || '0')
            }
        };
    }

    function getOverlayHtml(card) {

        var html = '';

        html += '<div class="cardOverlayInner">';

        var className = card.className.toLowerCase();

        var isMiniItem = className.indexOf('mini') !== -1;
        var isSmallItem = isMiniItem || className.indexOf('small') !== -1;
        var isPortrait = className.indexOf('portrait') !== -1;

        html += '<div class="cardOverlayButtons">';

        var buttonCount = 0;

        if (playbackManager.canPlay(getItemInfoFromCard(card))) {

            html += '<button is="emby-button" class="itemAction autoSize fab cardOverlayFab mini" data-action="resume"><i class="md-icon cardOverlayFab-md-icon">&#xE037;</i></button>';
            buttonCount++;
        }

        var moreIcon = appHost.moreIcon === 'dots-horiz' ? '&#xE5D3;' : '&#xE5D4;';
        html += '<button is="emby-button" class="itemAction autoSize fab cardOverlayFab mini" data-action="menu" data-playoptions="false"><i class="md-icon cardOverlayFab-md-icon">' + moreIcon + '</i></button>';
        buttonCount++;

        html += '</div>';

        html += '</div>';

        return html;
    }

    function onCardOverlayButtonsClick(e) {

        var button = dom.parentWithClass(e.target, 'btnUserData');
        if (button) {
            e.stopPropagation();
        }
    }

    function onShowTimerExpired(elem) {

        var innerElem = elem.querySelector('.cardOverlayTarget');

        if (!innerElem) {
            innerElem = document.createElement('div');
            innerElem.classList.add('hide');
            innerElem.classList.add('cardOverlayTarget');

            // allow the overlay to be clicked to view the item
            innerElem.classList.add('itemAction');
            innerElem.setAttribute('data-action', 'link');

            var appendTo = elem.querySelector('div.cardContent') || elem.querySelector('.cardScalable') || elem.querySelector('.cardBox');

            //if (appendTo && appendTo.tagName == 'BUTTON') {
            //    appendTo = dom.parentWithClass(elem, 'cardScalable');
            //}

            if (!appendTo) {
                appendTo = elem;
            }

            appendTo.classList.add('withHoverMenu');
            appendTo.appendChild(innerElem);
        }

        var dataElement = dom.parentWithAttribute(elem, 'data-id');

        if (!dataElement) {
            return;
        }

        var id = dataElement.getAttribute('data-id');
        var type = dataElement.getAttribute('data-type');

        if (type === 'Timer' || type === 'SeriesTimer') {
            return;
        }

        innerElem.innerHTML = getOverlayHtml(dataElement);

        //userdataButtons.fill({
        //    item: item,
        //    style: 'fab-mini',
        //    cssClass: 'cardOverlayFab',
        //    iconCssClass: 'cardOverlayFab-md-icon',
        //    element: innerElem.querySelector('.cardOverlayButtons'),
        //    fillMode: 'insertAdjacent',
        //    insertLocation: 'beforeend'
        //});

        innerElem.querySelector('.cardOverlayButtons').addEventListener('click', onCardOverlayButtonsClick);

        slideUpToShow(innerElem);
    }

    function onHoverIn(e) {

        var elem = e.target;
        var card = dom.parentWithClass(elem, 'cardBox');

        if (!card) {
            return;
        }

        if (preventHover === true) {
            preventHover = false;
            return;
        }

        if (showOverlayTimeout) {
            clearTimeout(showOverlayTimeout);
            showOverlayTimeout = null;
        }

        showOverlayTimeout = setTimeout(function () {
            onShowTimerExpired(card);

        }, 800);
    }

    function preventTouchHover() {
        preventHover = true;
    }

    function ItemHoverMenu(parentElement) {

        this.parent = parentElement;

        this.parent.addEventListener('mouseenter', onHoverIn, true);
        this.parent.addEventListener('mouseleave', onHoverOut, true);
        dom.addEventListener(this.parent, "touchstart", preventTouchHover, {
            passive: true
        });
    }

    ItemHoverMenu.prototype = {
        constructor: ItemHoverMenu,

        destroy: function () {
            this.parent.removeEventListener('mouseenter', onHoverIn, true);
            this.parent.removeEventListener('mouseleave', onHoverOut, true);

            dom.removeEventListener(this.parent, "touchstart", preventTouchHover, {
                passive: true
            });
        }
    };

    return ItemHoverMenu;
});