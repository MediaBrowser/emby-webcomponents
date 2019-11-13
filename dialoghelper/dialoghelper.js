define(['appRouter', 'focusManager', 'browser', 'inputManager', 'dom', 'css!./dialoghelper.css', 'scrollStyles'], function (appRouter, focusManager, browser, inputManager, dom) {
    'use strict';

    var globalOnOpenCallback;

    function enableAnimation() {

        // too slow
        if (browser.tv) {
            return false;
        }

        return browser.supportsCssAnimation() && dom.supportsEventListenerOnce();
    }

    function tryRemoveElement(elem) {
        var parentNode = elem.parentNode;
        if (parentNode) {

            // Seeing crashes in edge webview
            try {
                parentNode.removeChild(elem);
            } catch (err) {
                console.log('Error removing dialog element: ' + err);
            }
        }
    }

    function getScrollingElement() {
        return document.scrollingElement || document.documentElement;
    }

    function DialogHashHandler(dlg, hash, resolve) {

        var self = this;
        self.originalUrl = window.location.href;
        var activeElement = document.activeElement;
        var removeScrollLockOnClose = false;

        function onHashChange(e) {

            var isBack = self.originalUrl === window.location.href;

            if (isBack || !isOpened(dlg)) {
                window.removeEventListener('popstate', onHashChange);
            }

            if (isBack) {
                self.closedByBack = true;
                closeDialog(dlg);
            }
        }

        function onBackCommand(e) {

            if (e.detail.command === 'back') {
                self.closedByBack = true;
                e.preventDefault();
                e.stopPropagation();
                closeDialog(dlg);
            }
        }

        function onDialogClosed() {

            if (!isHistoryEnabled(dlg)) {
                inputManager.off(dlg, onBackCommand);
            }

            window.removeEventListener('popstate', onHashChange);

            removeBackdrop(dlg);
            dlg.classList.remove('opened');

            if (removeScrollLockOnClose) {
                getScrollingElement().classList.remove('withDialogOpen');
            }

            if (activeElement) {
                focusManager.focus(activeElement);
            }

            if (dlg.getAttribute('data-removeonclose') !== 'false') {

                var dialogContainer = dlg.dialogContainer;
                if (dialogContainer) {
                    tryRemoveElement(dialogContainer);
                    dlg.dialogContainer = null;
                } else {
                    tryRemoveElement(dlg);
                }
            }

            //resolve();
            // if we just called appRouter.back(), then use a timeout to allow the history events to fire first
            setTimeout(function () {
                resolve({
                    element: dlg,
                    closedByBack: self.closedByBack
                });
            }, 1);
        }

        dlg.addEventListener('close', onDialogClosed);

        //if (!dlg.classList.contains('dialog-fullscreen')) {
        addBackdropOverlay(dlg);
        //}

        dlg.classList.remove('hide');


        dlg.classList.add('opened');
        dlg.dispatchEvent(new CustomEvent('open', {
            bubbles: false,
            cancelable: false
        }));

        var scrollingElement = getScrollingElement();
        if (dlg.getAttribute('data-lockscroll') === 'true' && !scrollingElement.classList.contains('withDialogOpen')) {
            scrollingElement.classList.add('withDialogOpen');
            removeScrollLockOnClose = true;
        }

        animateDialogOpen(dlg);

        if (isHistoryEnabled(dlg)) {
            appRouter.pushState({ dialogId: hash }, "Dialog", '#' + hash);

            window.addEventListener('popstate', onHashChange);
        } else {
            inputManager.on(dlg, onBackCommand);
        }
    }

    function onOpenAnimationFinish(e) {

        if (e.target !== e.currentTarget) {
            return;
        }

        var dlg = this;

        dom.removeEventListener(dlg, dom.whichAnimationEvent(), onOpenAnimationFinish, {
            passive: true
        });

        focusManager.pushScope(dlg);
        if (dlg.getAttribute('data-autofocus') === 'true') {
            focusManager.autoFocus(dlg);
        }
    }

    function animateDialogOpen(dlg) {

        if (enableAnimation()) {

            dom.addEventListener(dlg, dom.whichAnimationEvent(), onOpenAnimationFinish, {
                passive: true
            });
            return;
        }

        onOpenAnimationFinish.call(dlg, {
            target: dlg,
            currentTarget: dlg
        });
    }

    function addBackdropOverlay(dlg) {

        var backdrop = document.createElement('div');
        backdrop.classList.add('dialogBackdrop');

        var backdropParent = dlg.dialogContainer || dlg;
        backdropParent.parentNode.insertBefore(backdrop, backdropParent);
        dlg.backdrop = backdrop;

        // trigger reflow or the backdrop will not animate
        void backdrop.offsetWidth;
        backdrop.classList.add('dialogBackdropOpened');

        dom.addEventListener((dlg.dialogContainer || backdrop), 'click', function (e) {
            if (e.target === dlg.dialogContainer) {
                close(dlg);
            }
        }, {
            passive: true
        });
    }

    function isHistoryEnabled(dlg) {
        return dlg.getAttribute('data-history') === 'true';
    }

    function open(dlg) {

        if (globalOnOpenCallback) {
            globalOnOpenCallback(dlg);
        }

        var parent = dlg.parentNode;
        if (parent) {
            parent.removeChild(dlg);
        }

        var dialogContainer = document.createElement('div');
        dialogContainer.classList.add('dialogContainer');
        dialogContainer.appendChild(dlg);
        dlg.dialogContainer = dialogContainer;
        document.body.appendChild(dialogContainer);

        return new Promise(function (resolve, reject) {

            new DialogHashHandler(dlg, 'dlg' + Date.now(), resolve);
        });
    }

    function isOpened(dlg) {

        //return dlg.opened;
        return !dlg.classList.contains('hide');
    }

    function close(dlg) {

        if (isOpened(dlg)) {
            if (isHistoryEnabled(dlg)) {
                appRouter.back();
            } else {
                closeDialog(dlg);
            }
        }
    }

    function onCloseAnimationFinish(e) {

        if (e.target !== e.currentTarget) {
            return;
        }

        var dlg = this;

        dom.removeEventListener(dlg, dom.whichAnimationEvent(), onCloseAnimationFinish, {
            passive: true
        });

        focusManager.popScope(dlg);

        dlg.classList.add('hide');
        dlg.dispatchEvent(new CustomEvent('close', {
            bubbles: false,
            cancelable: false
        }));
    }

    function closeDialog(dlg) {

        if (dlg.classList.contains('hide')) {
            return;
        }

        dlg.dispatchEvent(new CustomEvent('closing', {
            bubbles: false,
            cancelable: false
        }));

        dlg.classList.add('dialog-close');

        if (enableAnimation()) {

            dom.addEventListener(dlg, dom.whichAnimationEvent(), onCloseAnimationFinish, {
                once: true
            });

            return;
        }

        onCloseAnimationFinish.call(dlg, {
            target: dlg,
            currentTarget: dlg
        });
    }

    //var supportsOverscrollBehavior = 'overscroll-behavior-y' in document.body.style;
    function shouldLockDocumentScroll(options) {

        //if (supportsOverscrollBehavior) {
        //    return false;
        //}

        return true;
    }

    function removeBackdrop(dlg) {

        var backdrop = dlg.backdrop;

        if (!backdrop) {
            return;
        }

        dlg.backdrop = null;

        var onAnimationFinish = function () {
            tryRemoveElement(backdrop);
        };

        if (enableAnimation()) {

            backdrop.classList.remove('dialogBackdropOpened');

            // this is not firing animatonend
            setTimeout(onAnimationFinish, 300);
            return;
        }

        onAnimationFinish();
    }

    function createDialog(options) {

        options = options || {};

        // If there's no native dialog support, use a plain div
        // Also not working well in samsung tizen browser, content inside not clickable
        // Just go ahead and always use a plain div because we're seeing issues overlaying absoltutely positioned content over a modal dialog
        var dlg = document.createElement('div');

        dlg.classList.add('focuscontainer');
        dlg.classList.add('hide');

        if (shouldLockDocumentScroll(options)) {
            dlg.setAttribute('data-lockscroll', 'true');
        }

        if (options.enableHistory !== false && appRouter.enableNativeHistory()) {
            dlg.setAttribute('data-history', 'true');
        }

        // without this safari will scroll the background instead of the dialog contents
        // but not needed here since this is already on top of an existing dialog
        // but skip it in IE because it's causing the entire browser to hang
        // Also have to disable for firefox because it's causing select elements to not be clickable
        if (options.modal !== false) {
            dlg.setAttribute('modal', 'modal');
        }

        if (options.autoFocus !== false) {
            dlg.setAttribute('data-autofocus', 'true');
        }

        dlg.classList.add('dialog');

        if (!enableAnimation()) {
            dlg.classList.add('dialog-noanimation');
        }

        if (options.removeOnClose) {
            dlg.setAttribute('data-removeonclose', 'true');
        }

        if (options.size) {
            dlg.classList.add('dialog-fixedSize');
            dlg.classList.add('dialog-' + options.size);
        }

        if (options.autoCenter !== false && !dlg.classList.contains('dialog-fixedSize')) {
            dlg.classList.add('centeredDialog');
        }

        return dlg;
    }

    return {
        open: open,
        close: close,
        createDialog: createDialog,
        setOnOpen: function (val) {
            globalOnOpenCallback = val;
        }
    };
});