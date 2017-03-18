define(['globalize', 'loading', 'connectionManager'], function (globalize, loading, connectionManager) {
    'use strict';

    function changeRecordingToSeries(apiClient, timerId, programId) {

        loading.show();

        return apiClient.getItem(apiClient.getCurrentUserId(), programId).then(function (item) {

            if (item.IsSeries) {
                // cancel, then create series
                return cancelTimer(apiClient, timerId, false).then(function () {
                    return apiClient.getNewLiveTvTimerDefaults({ programId: programId }).then(function (timerDefaults) {

                        return apiClient.createLiveTvSeriesTimer(timerDefaults).then(function () {

                            loading.hide();
                        });
                    });
                });
            } else {
                // cancel 
                return cancelTimer(apiClient, timerId, true);
            }
        });
    }

    function cancelTimerWithConfirmation(timerId, serverId) {

        return new Promise(function (resolve, reject) {

            require(['confirm'], function (confirm) {

                confirm({

                    text: globalize.translate('sharedcomponents#MessageConfirmRecordingCancellation'),
                    primary: 'cancel',
                    confirmText: globalize.translate('sharedcomponents#HeaderCancelRecording'),
                    cancelText: globalize.translate('sharedcomponents#HeaderKeepRecording')

                }).then(function () {

                    loading.show();

                    var apiClient = connectionManager.getApiClient(serverId);
                    apiClient.cancelLiveTvTimer(timerId).then(function () {

                        require(['toast'], function (toast) {
                            toast(globalize.translate('sharedcomponents#RecordingCancelled'));
                        });

                        loading.hide();
                        resolve();
                    }, reject);

                }, reject);
            });
        });
    }

    function cancelSeriesTimerWithConfirmation(timerId, serverId) {

        return new Promise(function (resolve, reject) {

            require(['confirm'], function (confirm) {

                confirm({

                    text: globalize.translate('sharedcomponents#MessageConfirmRecordingCancellation'),
                    primary: 'cancel',
                    confirmText: globalize.translate('sharedcomponents#HeaderCancelSeries'),
                    cancelText: globalize.translate('sharedcomponents#HeaderKeepSeries')

                }).then(function () {

                    loading.show();

                    var apiClient = connectionManager.getApiClient(serverId);
                    apiClient.cancelLiveTvSeriesTimer(timerId).then(function () {

                        require(['toast'], function (toast) {
                            toast(globalize.translate('sharedcomponents#SeriesCancelled'));
                        });

                        loading.hide();
                        resolve();
                    }, reject);

                }, reject);
            });
        });
    }

    function cancelTimer(apiClient, timerId, hideLoading) {
        loading.show();
        return apiClient.cancelLiveTvTimer(timerId).then(function () {

            if (hideLoading) {
                loading.hide();
            }
        });
    }

    function createRecording(apiClient, programId, isSeries) {

        loading.show();
        return apiClient.getNewLiveTvTimerDefaults({ programId: programId }).then(function (item) {

            var promise = isSeries ?
                apiClient.createLiveTvSeriesTimer(item) :
                apiClient.createLiveTvTimer(item);

            return promise.then(function () {

                loading.hide();
            });
        });
    }

    function toggleRecording(serverId, programId, timerId, timerStatus, seriesTimerId) {

        var apiClient = connectionManager.getApiClient(serverId);

        var hasTimer = timerId && timerStatus !== 'Cancelled';

        if (seriesTimerId && hasTimer) {

            // cancel 
            return cancelTimer(apiClient, timerId, true);

        } else if (hasTimer && programId) {

            // change to series recording, if possible
            // otherwise cancel individual recording
            return changeRecordingToSeries(apiClient, timerId, programId);

        } else if (programId) {
            // schedule recording
            return createRecording(apiClient, programId);
        } else {
            return Promise.reject();
        }
    }

    return {
        cancelTimer: cancelTimer,
        createRecording: createRecording,
        changeRecordingToSeries: changeRecordingToSeries,
        toggleRecording: toggleRecording,
        cancelTimerWithConfirmation: cancelTimerWithConfirmation,
        cancelSeriesTimerWithConfirmation: cancelSeriesTimerWithConfirmation
    };
});