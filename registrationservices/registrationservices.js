﻿define(['appSettings', 'focusManager', 'loading', 'apphost', 'iapManager', 'events', 'shell', 'globalize', 'dialogHelper', 'connectionManager', 'layoutManager', 'emby-button', 'emby-linkbutton'], function (appSettings, focusManager, loading, appHost, iapManager, events, shell, globalize, dialogHelper, connectionManager, layoutManager) {
    'use strict';

    var currentDisplayingProductInfos = [];
    var currentDisplayingResolve = null;
    var currentValidatingFeature = null;
    var isCurrentDialogRejected = null;

    function alertText(options) {
        return require(['alert']).then(function (responses) {
            return responses[0](options);
        });
    }

    function showInAppPurchaseInfo(subscriptionOptions, unlockableProductInfo, dialogOptions) {

        return new Promise(function (resolve, reject) {

            require(['listViewStyle', 'formDialogStyle'], function () {
                showInAppPurchaseElement(subscriptionOptions, unlockableProductInfo, dialogOptions, resolve, reject);

                currentDisplayingResolve = resolve;
            });
        });
    }

    function showPeriodicMessage(feature, settingsKey) {

        return new Promise(function (resolve, reject) {

            require(['listViewStyle', 'formDialogStyle'], function () {

                var dlg = dialogHelper.createDialog({
                    size: layoutManager.tv ? 'fullscreen' : 'fullscreen-border',
                    removeOnClose: true,
                    scrollY: false
                });

                dlg.classList.add('formDialog');

                var html = '';
                html += '<div class="formDialogHeader">';
                html += '<button is="paper-icon-button-light" class="btnCancelSupporterInfo autoSize" tabindex="-1"><i class="md-icon">&#xE5C4;</i></button>';
                html += '<h3 class="formDialogHeaderTitle">Emby Premiere';
                html += '</h3>';
                html += '</div>';

                html += '<div is="emby-scroller" data-horizontal="false" data-centerfocus="card" class="formDialogContent">';
                html += '<div class="scrollSlider">';
                html += '<div class="dialogContentInner dialog-content-centered">';

                html += '<h1>' + globalize.translate('HeaderDiscoverEmbyPremiere') + '</h1>';

                html += '<p>' + globalize.translate('MessageDidYouKnowCinemaMode') + '</p>';
                html += '<p>' + globalize.translate('CinemaModeFeatureDescription') + '</p>';

                html += '<h2>' + globalize.translate('HeaderBenefitsEmbyPremiere') + '</h2>';

                html += '<div class="paperList">';
                html += getSubscriptionBenefits().map(getSubscriptionBenefitHtml).join('');
                html += '</div>';

                html += '<br/>';

                html += '<div class="formDialogFooter">';

                html += '<button is="emby-button" type="button" class="raised button-submit block btnGetPremiere block formDialogFooterItem" autoFocus><span>' + globalize.translate('HeaderBecomeProjectSupporter') + '</span></button>';

                var seconds = 11;

                html += '<div class="continueTimeText formDialogFooterItem" style="margin: 1.5em 0 .5em;">' + globalize.translate('ContinueInSecondsValue', seconds) + '</div>';

                html += '<button is="emby-button" type="button" class="raised button-cancel block btnContinue block formDialogFooterItem hide"><span>' + globalize.translate('Continue') + '</span></button>';

                html += '</div>';

                html += '</div>';
                html += '</div>';
                html += '</div>';

                dlg.innerHTML = html;

                var isRejected = true;

                var timeTextInterval = setInterval(function () {

                    seconds -= 1;
                    if (seconds <= 0) {

                        clearInterval(timeTextInterval);

                        dlg.querySelector('.continueTimeText').classList.add('hide');

                        var btnContinue = dlg.querySelector('.btnContinue');

                        btnContinue.classList.remove('hide');
                        focusManager.focus(btnContinue);

                    } else {
                        dlg.querySelector('.continueTimeText').innerHTML = globalize.translate('ContinueInSecondsValue', seconds);
                    }

                }, 1000);

                var i, length;
                var btnPurchases = dlg.querySelectorAll('.buttonPremiereInfo');
                for (i = 0, length = btnPurchases.length; i < length; i++) {
                    btnPurchases[i].addEventListener('click', showExternalPremiereInfo);
                }

                // Has to be assigned a z-index after the call to .open() 
                dlg.addEventListener('close', function (e) {

                    clearInterval(timeTextInterval);

                    if (isRejected) {
                        reject();
                    } else {
                        appSettings.set(settingsKey, new Date().getTime());

                        resolve();
                    }
                });

                dlg.querySelector('.btnContinue').addEventListener('click', function () {
                    isRejected = false;
                    dialogHelper.close(dlg);
                });

                dlg.querySelector('.btnGetPremiere').addEventListener('click', showPremiereInfo);

                dialogHelper.open(dlg);

                var onCancelClick = function () {
                    dialogHelper.close(dlg);
                };
                var elems = dlg.querySelectorAll('.btnCancelSupporterInfo');
                for (i = 0, length = elems.length; i < length; i++) {
                    elems[i].addEventListener('click', onCancelClick);
                }
            });
        });
    }

    function showPeriodicMessageIfNeeded(feature) {

        if (feature !== 'playback') {
            return Promise.resolve();
        }

        var intervalMs = iapManager.getPeriodicMessageIntervalMs(feature);
        if (intervalMs <= 0) {
            return Promise.resolve();
        }

        var settingsKey = 'periodicmessage11-' + feature;

        var lastMessage = parseInt(appSettings.get(settingsKey) || '0');

        if (!lastMessage) {

            // Don't show on the very first playback attempt
            appSettings.set(settingsKey, new Date().getTime());
            return Promise.resolve();
        }

        if ((new Date().getTime() - lastMessage) > intervalMs) {

            var apiClient = connectionManager.currentApiClient();
            if (apiClient.serverId() === '6da60dd6edfc4508bca2c434d4400816') {
                return Promise.resolve();
            }

            var registrationOptions = {
                viewOnly: true
            };

            // Get supporter status
            return connectionManager.getRegistrationInfo(iapManager.getAdminFeatureName(feature), apiClient, registrationOptions).catch(function (errorResult) {

                if (errorResult === 'overlimit') {
                    appSettings.set(settingsKey, new Date().getTime());
                    return Promise.resolve();
                }

                return showPeriodicMessage(feature, settingsKey);
            });
        }

        return Promise.resolve();
    }

    function validateFeature(feature, options) {

        options = options || {};

        console.log('validateFeature: ' + feature);

        return iapManager.isUnlockedByDefault(feature, options).then(function () {

            return showPeriodicMessageIfNeeded(feature);

        }, function () {

            var unlockableFeatureCacheKey = 'featurepurchased-' + feature;
            if (appSettings.get(unlockableFeatureCacheKey) === '1') {
                return showPeriodicMessageIfNeeded(feature);
            }

            var unlockableProduct = iapManager.getProductInfo(feature);
            if (unlockableProduct) {

                var unlockableCacheKey = 'productpurchased-' + unlockableProduct.id;
                if (unlockableProduct.owned) {

                    // Cache this to eliminate the store as a possible point of failure in the future
                    appSettings.set(unlockableFeatureCacheKey, '1');
                    appSettings.set(unlockableCacheKey, '1');
                    return showPeriodicMessageIfNeeded(feature);
                }

                if (appSettings.get(unlockableCacheKey) === '1') {
                    return showPeriodicMessageIfNeeded(feature);
                }
            }

            var unlockableProductInfo = unlockableProduct ? {
                enableAppUnlock: true,
                id: unlockableProduct.id,
                price: unlockableProduct.price,
                feature: feature

            } : null;

            return iapManager.getSubscriptionOptions().then(function (subscriptionOptions) {

                if (subscriptionOptions.filter(function (p) {
                    return p.owned;
                }).length > 0) {
                    return Promise.resolve();
                }

                var registrationOptions = {
                    viewOnly: options.viewOnly
                };

                // Get supporter status
                return connectionManager.getRegistrationInfo(iapManager.getAdminFeatureName(feature), connectionManager.currentApiClient(), registrationOptions).catch(function (errorResult) {

                    if (options.showDialog === false) {
                        return Promise.reject();
                    }

                    var alertPromise;

                    if (errorResult === 'overlimit') {
                        alertPromise = showOverLimitAlert();
                    }

                    if (!alertPromise) {
                        alertPromise = Promise.resolve();
                    }

                    return alertPromise.then(function () {

                        var dialogOptions = {
                            title: globalize.translate('HeaderUnlockFeature'),
                            feature: feature
                        };

                        currentValidatingFeature = feature;

                        return showInAppPurchaseInfo(subscriptionOptions, unlockableProductInfo, dialogOptions);
                    });
                });
            });
        });
    }

    function showOverLimitAlert() {

        return alertText('Your Emby Premiere device limit has been exceeded. Please check with the owner of your Emby Server and have them contact Emby support at apps@emby.media if necessary.').catch(function () {
            return Promise.resolve();
        });
    }

    function cancelInAppPurchase() {

        var elem = document.querySelector('.inAppPurchaseOverlay');
        if (elem) {
            dialogHelper.close(elem);
        }
    }

    function clearCurrentDisplayingInfo() {
        currentDisplayingProductInfos = [];
        currentDisplayingResolve = null;
        currentValidatingFeature = null;
        isCurrentDialogRejected = null;
    }

    function showExternalPremiereInfo() {
        shell.openUrl(iapManager.getPremiumInfoUrl());
    }

    function getPurchaseTermHtml(term) {

        return '<li>' + term + '</li>';
    }

    function getTermsOfPurchaseHtml() {

        var html = '';

        var termsOfPurchase = iapManager.getTermsOfPurchase ? iapManager.getTermsOfPurchase() : [];

        if (!termsOfPurchase.length) {

            return html;
        }

        html += '<h1>' + globalize.translate('HeaderTermsOfPurchase') + '</h1>';

        termsOfPurchase.push('<a is="emby-linkbutton" class="button-link" href="https://emby.media/privacy" target="_blank">' + globalize.translate('PrivacyPolicy') + '</a>');
        termsOfPurchase.push('<a is="emby-linkbutton" class="button-link" href="https://emby.media/terms" target="_blank">' + globalize.translate('TermsOfUse') + '</a>');

        html += '<ul>';
        html += termsOfPurchase.map(getPurchaseTermHtml).join('');
        html += '</ul>';

        return html;
    }

    function showInAppPurchaseElement(subscriptionOptions, unlockableProductInfo, dialogOptions, resolve, reject) {

        cancelInAppPurchase();

        // clone
        currentDisplayingProductInfos = subscriptionOptions.slice(0);

        if (unlockableProductInfo) {
            currentDisplayingProductInfos.push(unlockableProductInfo);
        }

        var dlg = dialogHelper.createDialog({
            size: layoutManager.tv ? 'fullscreen' : 'fullscreen-border',
            removeOnClose: true,
            scrollY: false
        });

        dlg.classList.add('formDialog');

        var html = '';
        html += '<div class="formDialogHeader">';
        html += '<button is="paper-icon-button-light" class="btnCloseDialog autoSize" tabindex="-1"><i class="md-icon">&#xE5C4;</i></button>';
        html += '<h3 class="formDialogHeaderTitle">';
        html += dialogOptions.title || '';
        html += '</h3>';
        html += '</div>';

        html += '<div is="emby-scroller" data-horizontal="false" data-centerfocus="card" class="formDialogContent">';
        html += '<div class="scrollSlider">';
        html += '<form class="dialogContentInner dialog-content-centered">';

        html += '<p style="margin-top:1.5em;">';

        if (unlockableProductInfo) {
            html += globalize.translate('MessageUnlockAppWithPurchaseOrSupporter');
        }
        else {
            html += globalize.translate('MessageUnlockAppWithSupporter');
        }
        html += '</p>';

        html += '<p style="margin:1.5em 0 2em;">';
        html += globalize.translate('MessageToValidateSupporter');
        html += '</p>';

        var hasProduct = false;
        var i, length;

        for (i = 0, length = subscriptionOptions.length; i < length; i++) {

            hasProduct = true;
            html += '<p>';
            html += '<button is="emby-button" type="button" class="raised button-submit block btnPurchase" data-email="' + (subscriptionOptions[i].requiresEmail !== false) + '" data-featureid="' + subscriptionOptions[i].id + '"><span>';
            html += subscriptionOptions[i].title;
            html += '</span></button>';
            html += '</p>';
        }

        if (unlockableProductInfo) {

            hasProduct = true;
            var unlockText = globalize.translate('ButtonUnlockWithPurchase');
            if (unlockableProductInfo.price) {
                unlockText = globalize.translate('ButtonUnlockPrice', unlockableProductInfo.price);
            }
            html += '<p>';
            html += '<button is="emby-button" type="button" class="raised block btnPurchase" data-featureid="' + unlockableProductInfo.id + '"><span>' + unlockText + '</span></button>';
            html += '</p>';
        }

        html += '<p>';
        html += '<button is="emby-button" type="button" class="raised button-cancel block btnRestorePurchase"><span>' + iapManager.getRestoreButtonText() + '</span></button>';
        html += '</p>';

        if (subscriptionOptions.length) {
            html += '<h1 style="margin-top:1.5em;">' + globalize.translate('HeaderBenefitsEmbyPremiere') + '</h1>';

            html += '<div class="paperList" style="margin-bottom:1em;">';
            html += getSubscriptionBenefits().map(getSubscriptionBenefitHtml).join('');
            html += '</div>';
        }

        if (dialogOptions.feature === 'playback') {
            html += '<p>';
            html += '<button is="emby-button" type="button" class="raised button-cancel block btnPlayMinute"><span>' + globalize.translate('ButtonPlayOneMinute') + '</span></button>';
            html += '</p>';
        }

        html += getTermsOfPurchaseHtml();

        html += '</form>';
        html += '</div>';
        html += '</div>';

        dlg.innerHTML = html;
        document.body.appendChild(dlg);

        var btnPurchases = dlg.querySelectorAll('.btnPurchase');
        for (i = 0, length = btnPurchases.length; i < length; i++) {
            btnPurchases[i].addEventListener('click', onPurchaseButtonClick);
        }

        btnPurchases = dlg.querySelectorAll('.buttonPremiereInfo');
        for (i = 0, length = btnPurchases.length; i < length; i++) {
            btnPurchases[i].addEventListener('click', showExternalPremiereInfo);
        }

        isCurrentDialogRejected = true;
        var resolveWithTimeLimit = false;

        var btnPlayMinute = dlg.querySelector('.btnPlayMinute');
        if (btnPlayMinute) {
            btnPlayMinute.addEventListener('click', function () {

                resolveWithTimeLimit = true;
                isCurrentDialogRejected = false;
                dialogHelper.close(dlg);
            });
        }

        dlg.querySelector('.btnRestorePurchase').addEventListener('click', function () {
            restorePurchase(unlockableProductInfo);
        });

        loading.hide();

        function onCloseButtonClick() {

            dialogHelper.close(dlg);
        }

        var btnCloseDialogs = dlg.querySelectorAll('.btnCloseDialog');
        for (i = 0, length = btnCloseDialogs.length; i < length; i++) {
            btnCloseDialogs[i].addEventListener('click', onCloseButtonClick);
        }

        dlg.classList.add('inAppPurchaseOverlay');

        dialogHelper.open(dlg).then(function () {

            var rejected = isCurrentDialogRejected;
            clearCurrentDisplayingInfo();
            if (rejected) {
                reject();
            } else if (resolveWithTimeLimit) {
                resolve({
                    enableTimeLimit: true
                });
            }
        });
    }

    function getSubscriptionBenefits() {

        var list = [];

        list.push({
            name: globalize.translate('HeaderFreeApps'),
            icon: '&#xE5CA;',
            text: globalize.translate('FreeAppsFeatureDescription')
        });

        if (appHost.supports('sync')) {
            list.push({
                name: globalize.translate('HeaderOfflineDownloads'),
                icon: '&#xE2C0;',
                text: globalize.translate('HeaderOfflineDownloadsDescription')
            });
        }

        list.push({
            name: globalize.translate('LiveTV'),
            icon: '&#xE639;',
            text: globalize.translate('LiveTvFeatureDescription')
        });

        list.push({
            name: 'Emby DVR',
            icon: '&#xE1B2;',
            text: globalize.translate('DvrFeatureDescription')
        });

        list.push({
            name: globalize.translate('HeaderCinemaMode'),
            icon: '&#xE02C;',
            text: globalize.translate('CinemaModeFeatureDescription')
        });

        list.push({
            name: globalize.translate('HeaderCloudSync'),
            icon: '&#xE627;',
            text: globalize.translate('CloudSyncFeatureDescription')
        });

        return list;
    }

    function getSubscriptionBenefitHtml(item) {

        var enableLink = appHost.supports('externalpremium');

        var html = '';

        var cssClass = "listItem";

        if (layoutManager.tv) {
            cssClass += ' listItem-focusscale';
        }

        if (enableLink) {
            cssClass += ' listItem-button';

            html += '<button type="button" class="' + cssClass + ' buttonPremiereInfo">';
        } else {
            html += '<div class="' + cssClass + '">';
        }

        html += '<i class="listItemIcon md-icon">' + item.icon + '</i>';

        html += '<div class="listItemBody">';

        html += '<h3 class="listItemBodyText">';
        html += item.name;
        html += '</h3>';

        html += '<div class="listItemBodyText listItemBodyText-secondary">';
        html += item.text;
        html += '</div>';

        html += '</div>';

        if (enableLink) {
            html += '</button>';
        } else {
            html += '</div>';
        }

        return html;
    }

    function onPurchaseButtonClick() {

        var featureId = this.getAttribute('data-featureid');

        if (this.getAttribute('data-email') === 'true') {
            getUserEmail().then(function (email) {
                iapManager.beginPurchase(featureId, email);
            });
        } else {
            iapManager.beginPurchase(featureId);
        }
    }

    function restorePurchase(unlockableProductInfo) {

        var dlg = dialogHelper.createDialog({
            size: layoutManager.tv ? 'fullscreen' : 'fullscreen-border',
            removeOnClose: true,
            scrollY: false
        });

        dlg.classList.add('formDialog');

        var html = '';
        html += '<div class="formDialogHeader">';
        html += '<button is="paper-icon-button-light" class="btnCloseDialog autoSize" tabindex="-1"><i class="md-icon">&#xE5C4;</i></button>';
        html += '<h3 class="formDialogHeaderTitle">';
        html += iapManager.getRestoreButtonText();
        html += '</h3>';
        html += '</div>';

        html += '<div is="emby-scroller" data-horizontal="false" data-centerfocus="card" class="formDialogContent">';
        html += '<div class="scrollSlider">';
        html += '<div class="dialogContentInner dialog-content-centered">';

        html += '<p style="margin:2em 0;">';
        html += globalize.translate('HowDidYouPay');
        html += '</p>';

        html += '<p>';
        html += '<button is="emby-button" type="button" class="raised button-cancel block btnRestoreSub"><span>' + globalize.translate('IHaveEmbyPremiere') + '</span></button>';
        html += '</p>';

        if (unlockableProductInfo) {
            html += '<p>';
            html += '<button is="emby-button" type="button" class="raised button-cancel block btnRestoreUnlock"><span>' + globalize.translate('IPurchasedThisApp') + '</span></button>';
            html += '</p>';
        }

        html += '</div>';
        html += '</div>';
        html += '</div>';

        dlg.innerHTML = html;
        document.body.appendChild(dlg);

        loading.hide();

        dlg.querySelector('.btnCloseDialog').addEventListener('click', function () {

            dialogHelper.close(dlg);
        });

        dlg.querySelector('.btnRestoreSub').addEventListener('click', function () {

            dialogHelper.close(dlg);
            alertText({
                text: globalize.translate('MessageToValidateSupporter'),
                title: 'Emby Premiere'
            });

        });

        var btnRestoreUnlock = dlg.querySelector('.btnRestoreUnlock');
        if (btnRestoreUnlock) {
            btnRestoreUnlock.addEventListener('click', function () {

                dialogHelper.close(dlg);
                iapManager.restorePurchase();
            });
        }

        dialogHelper.open(dlg);
    }

    function getUserEmail() {

        if (connectionManager.isLoggedIntoConnect()) {

            var connectUser = connectionManager.connectUser();

            if (connectUser && connectUser.Email) {
                return Promise.resolve(connectUser.Email);
            }
        }

        return require(['prompt']).then(function (responses) {

            return responses[0]({

                label: globalize.translate('LabelEmailAddress')

            });
        });
    }

    function onProductUpdated(e, product) {

        if (product.owned) {

            var resolve = currentDisplayingResolve;

            if (resolve && currentDisplayingProductInfos.filter(function (p) {

                return product.id === p.id;

            }).length) {

                isCurrentDialogRejected = false;
                cancelInAppPurchase();
                resolve();
                return;
            }
        }

        var feature = currentValidatingFeature;
        if (feature) {
            iapManager.isUnlockedByDefault(feature).then(function () {
                isCurrentDialogRejected = false;
                cancelInAppPurchase();

                if (resolve) {
                    resolve();
                }
            });
        }
    }

    function showPremiereInfo() {

        if (appHost.supports('externalpremium')) {
            showExternalPremiereInfo();
            return Promise.resolve();
        }

        return iapManager.getSubscriptionOptions().then(function (subscriptionOptions) {

            var dialogOptions = {
                title: 'Emby Premiere',
                feature: 'sync'
            };

            return showInAppPurchaseInfo(subscriptionOptions, null, dialogOptions);
        });
    }

    events.on(iapManager, 'productupdated', onProductUpdated);

    return {

        validateFeature: validateFeature,
        showPremiereInfo: showPremiereInfo
    };
});