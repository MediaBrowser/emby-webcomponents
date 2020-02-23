define(['events', 'playbackManager', 'dom', 'browser', 'Modernizr', 'css!./iconosd', 'material-icons'], function (events, playbackManager, dom, browser, Modernizr) {
    'use strict';

    var currentPlayer;
    var osdElement;
    var iconElement;
    var progressElement;

    var enableAnimation;

    function getOsdElementHtml() {
        var html = '';

        html += '<i class="md-icon iconOsdIcon">&#xE1AC;</i>';

        html += '<div class="iconOsdProgressOuter"><div class="iconOsdProgressInner brightnessOsdProgressInner"></div></div>';

        return html;
    }

    function ensureOsdElement() {

        var elem = osdElement;
        if (!elem) {

            enableAnimation = Modernizr.csstransitions;

            elem = document.createElement('div');
            elem.classList.add('hide');
            elem.classList.add('iconOsd');
            elem.classList.add('iconOsd-hidden');
            elem.classList.add('brightnessOsd');
            elem.innerHTML = getOsdElementHtml();

            iconElement = elem.querySelector('i');
            progressElement = elem.querySelector('.iconOsdProgressInner');

            document.body.appendChild(elem);
            osdElement = elem;

            dom.addEventListener(elem, dom.whichTransitionEvent(), onHideComplete, {
                passive: true
            });
        }
    }

    function onHideComplete(e) {

        if (e.target === e.currentTarget) {

            if (this.classList.contains('iconOsd-hidden')) {
                this.classList.add('hide');
            }
        }
    }

    var hideTimeout;
    function showOsd() {

        clearHideTimeout();

        var elem = osdElement;

        elem.classList.remove('hide');

        // trigger reflow
        void elem.offsetWidth;

        elem.classList.remove('iconOsd-hidden');

        hideTimeout = setTimeout(hideOsd, 3000);
    }

    function clearHideTimeout() {
        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }
    }

    function hideOsd() {

        clearHideTimeout();

        var elem = osdElement;
        if (elem) {

            if (enableAnimation) {
                // trigger reflow
                void elem.offsetWidth;

                elem.classList.add('iconOsd-hidden');
            } else {
                onHideComplete.call(elem);
            }
        }
    }

    function updateElementsFromPlayer(brightness) {

        if (iconElement) {
            if (brightness >= 80) {
                iconElement.innerHTML = '&#xE1AC;';
            }
            else if (brightness >= 20) {
                iconElement.innerHTML = '&#xE1AE;';
            } else {
                iconElement.innerHTML = '&#xE1AD;';
            }
        }
        if (progressElement) {
            progressElement.style.width = (brightness || 0) + '%';
        }
    }

    function releaseCurrentPlayer() {

        var player = currentPlayer;

        if (player) {
            events.off(player, 'brightnesschange', onBrightnessChanged);
            events.off(player, 'playbackstop', hideOsd);
            currentPlayer = null;
        }
    }

    function onBrightnessChanged(e) {

        var player = this;

        ensureOsdElement();

        updateElementsFromPlayer(playbackManager.getBrightness(player));

        showOsd();
    }

    function bindToPlayer(player) {

        if (player === currentPlayer) {
            return;
        }

        releaseCurrentPlayer();

        currentPlayer = player;

        if (!player) {
            return;
        }

        hideOsd();
        events.on(player, 'brightnesschange', onBrightnessChanged);
        events.on(player, 'playbackstop', hideOsd);
    }

    events.on(playbackManager, 'playerchange', function () {
        bindToPlayer(playbackManager.getCurrentPlayer());
    });

    bindToPlayer(playbackManager.getCurrentPlayer());

});