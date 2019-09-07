﻿define(['browser', 'connectionManager', 'playbackManager', 'dom', 'css!./style'], function (browser, connectionManager, playbackManager, dom) {
    'use strict';

    function enableAnimation(elem) {

        if (browser.slow) {
            return false;
        }

        return true;
    }

    function enableRotation() {

        if (browser.tv) {
            return false;
        }

        // Causes high cpu usage
        if (browser.firefox) {
            return false;
        }

        return true;
    }

    function Backdrop() {

    }

    Backdrop.prototype.load = function (url, parent, existingBackdropImage) {

        var img = new Image();

        var self = this;

        img.onload = function () {

            if (self.isDestroyed) {
                return;
            }

            var backdropImage = document.createElement('div');
            backdropImage.classList.add('backdropImage');
            backdropImage.classList.add('displayingBackdropImage');
            backdropImage.style.backgroundImage = "url('" + url + "')";
            backdropImage.setAttribute('data-url', url);

            backdropImage.classList.add('backdropImageFadeIn');
            parent.appendChild(backdropImage);

            if (!enableAnimation(backdropImage)) {
                if (existingBackdropImage && existingBackdropImage.parentNode) {
                    existingBackdropImage.parentNode.removeChild(existingBackdropImage);
                }
                internalBackdrop(true);
                return;
            }

            var onAnimationComplete = function () {
                dom.removeEventListener(backdropImage, dom.whichAnimationEvent(), onAnimationComplete, {
                    once: true
                });
                if (backdropImage === self.currentAnimatingElement) {
                    self.currentAnimatingElement = null;
                }
                if (existingBackdropImage && existingBackdropImage.parentNode) {
                    existingBackdropImage.parentNode.removeChild(existingBackdropImage);
                }
            };

            dom.addEventListener(backdropImage, dom.whichAnimationEvent(), onAnimationComplete, {
                once: true
            });

            internalBackdrop(true);
        };
        img.src = url;
    };

    Backdrop.prototype.cancelAnimation = function () {
        var elem = this.currentAnimatingElement;
        if (elem) {
            elem.classList.remove('backdropImageFadeIn');
            this.currentAnimatingElement = null;
        }
    };

    Backdrop.prototype.destroy = function () {

        this.isDestroyed = true;
        this.cancelAnimation();
    };

    var backdropContainer;
    function getBackdropContainer() {

        if (!backdropContainer) {
            backdropContainer = document.querySelector('.backdropContainer');
        }

        if (!backdropContainer) {
            backdropContainer = document.createElement('div');
            backdropContainer.classList.add('backdropContainer');
            document.body.insertBefore(backdropContainer, document.body.firstChild);
        }

        return backdropContainer;
    }

    var hasExternalBackdrop;
    var currentLoadingBackdrop;
    function clearBackdrop(clearAll) {

        clearRotation();

        if (currentLoadingBackdrop) {
            currentLoadingBackdrop.destroy();
            currentLoadingBackdrop = null;
        }

        var elem = getBackdropContainer();
        elem.innerHTML = '';

        if (clearAll) {
            hasExternalBackdrop = false;
        }
        internalBackdrop(false);
    }

    var backgroundContainer;
    function getBackgroundContainer() {
        if (!backgroundContainer) {
            backgroundContainer = document.querySelector('.backgroundContainer');
        }
        return backgroundContainer;
    }
    var hasInternalBackdrop;
    function setBackgroundContainerBackgroundEnabled() {

        if (hasInternalBackdrop || hasExternalBackdrop) {
            getBackgroundContainer().classList.add('withBackdrop');
        } else {
            getBackgroundContainer().classList.remove('withBackdrop');
        }
    }

    function internalBackdrop(enabled) {
        hasInternalBackdrop = enabled;
        setBackgroundContainerBackgroundEnabled();
    }

    function externalBackdrop(enabled) {
        hasExternalBackdrop = enabled;
        setBackgroundContainerBackgroundEnabled();
    }

    function getRandom(min, max) {
        return Math.floor(Math.random() * (max - min) + min);
    }

    function setBackdropImage(url) {

        if (currentLoadingBackdrop) {
            currentLoadingBackdrop.destroy();
            currentLoadingBackdrop = null;
        }

        var elem = getBackdropContainer();
        var existingBackdropImage = elem.querySelector('.displayingBackdropImage');

        if (existingBackdropImage && existingBackdropImage.getAttribute('data-url') === url) {
            if (existingBackdropImage.getAttribute('data-url') === url) {
                return;
            }
            existingBackdropImage.classList.remove('displayingBackdropImage');
        }

        var instance = new Backdrop();
        instance.load(url, elem, existingBackdropImage);
        currentLoadingBackdrop = instance;
    }

    var standardWidths = [480, 720, 1280, 1440, 1920];
    function getBackdropMaxWidth() {

        var width = dom.getWindowSize().innerWidth;

        if (standardWidths.indexOf(width) !== -1) {
            return width;
        }

        var roundScreenTo = 100;
        width = Math.floor(width / roundScreenTo) * roundScreenTo;

        return Math.min(width, 1920);
    }

    function getItemImageUrls(item, imageOptions) {

        imageOptions = imageOptions || {};

        var apiClient = connectionManager.getApiClient(item.ServerId);

        if (item.BackdropImageTags && item.BackdropImageTags.length > 0) {

            return item.BackdropImageTags.map(function (imgTag, index) {

                return apiClient.getScaledImageUrl(item.BackdropItemId || item.Id, Object.assign(imageOptions, {
                    type: "Backdrop",
                    tag: imgTag,
                    maxWidth: getBackdropMaxWidth(),
                    index: index
                }));
            });
        }

        if (item.ParentBackdropItemId && item.ParentBackdropImageTags && item.ParentBackdropImageTags.length) {

            return item.ParentBackdropImageTags.map(function (imgTag, index) {

                return apiClient.getScaledImageUrl(item.ParentBackdropItemId, Object.assign(imageOptions, {
                    type: "Backdrop",
                    tag: imgTag,
                    maxWidth: getBackdropMaxWidth(),
                    index: index
                }));
            });
        }

        return [];
    }

    function getImageUrls(items, imageOptions) {

        var list = [];

        for (var i = 0, length = items.length; i < length; i++) {

            var itemImages = getItemImageUrls(items[i], imageOptions);

            for (var j = 0, numImages = itemImages.length; j < numImages; j++) {
                list.push(itemImages[j]);
            }
        }

        return list;
    }

    function arraysEqual(a, b) {
        if (a === b) {
            return true;
        }
        if (a == null || b == null) {
            return false;
        }
        if (a.length !== b.length) {
            return false;
        }

        // If you don't care about the order of the elements inside
        // the array, you should sort both arrays here.

        for (var i = 0; i < a.length; ++i) {
            if (a[i] !== b[i]) {
                return false;
            }
        }
        return true;
    }

    var rotationInterval;
    var currentRotatingImages = [];
    var currentRotationIndex = -1;

    function setBackdrops(items, imageOptions, enableImageRotation) {

        var images = getImageUrls(items, imageOptions);

        if (images.length) {

            startRotation(images, enableImageRotation);

        } else {
            clearBackdrop();
        }
    }

    function startRotation(images, enableImageRotation) {

        if (arraysEqual(images, currentRotatingImages)) {
            return;
        }

        clearRotation();

        currentRotatingImages = images;
        currentRotationIndex = -1;

        if (images.length > 1 && enableImageRotation !== false && enableRotation()) {
            rotationInterval = setInterval(onRotationInterval, 24000);
        }
        onRotationInterval();
    }

    function onRotationInterval() {

        if (playbackManager.isPlayingLocally(['Video', 'Game', 'Book', 'Photo'])) {
            return;
        }

        var newIndex = currentRotationIndex + 1;
        if (newIndex >= currentRotatingImages.length) {
            newIndex = 0;
        }

        currentRotationIndex = newIndex;
        setBackdropImage(currentRotatingImages[newIndex]);
    }

    function clearRotation() {
        var interval = rotationInterval;
        if (interval) {
            clearInterval(interval);
        }
        rotationInterval = null;
        currentRotatingImages = [];
        currentRotationIndex = -1;
    }

    function setBackdrop(url, imageOptions) {

        if (url) {
            if (typeof url !== 'string') {
                url = getImageUrls([url], imageOptions)[0];
            }
        }

        if (url) {
            clearRotation();

            setBackdropImage(url);

        } else {
            clearBackdrop();
        }
    }

    return {

        getImageUrls: getImageUrls,
        setBackdrops: setBackdrops,
        setBackdrop: setBackdrop,
        clear: clearBackdrop,
        externalBackdrop: externalBackdrop
    };

});