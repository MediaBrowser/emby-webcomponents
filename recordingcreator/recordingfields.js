define(['appRouter', 'globalize', 'connectionManager', 'serverNotifications', 'require', 'loading', 'apphost', 'dom', 'recordingHelper', 'events', 'registrationServices', 'paper-icon-button-light', 'emby-button', 'flexStyles', 'detailButtonStyle'], function (appRouter, globalize, connectionManager, serverNotifications, require, loading, appHost, dom, recordingHelper, events, registrationServices) {
    'use strict';

    function showSeriesRecordingFields(context, programId, apiClient) {

        context.querySelector('.recordSeriesContainer').classList.remove('hide');
    }

    function loadData(parent, program, apiClient) {

        if (program.IsSeries) {
            parent.querySelector('.recordSeriesContainer').classList.remove('hide');
            showSeriesRecordingFields(parent, program.Id, apiClient);
        } else {
            parent.querySelector('.recordSeriesContainer').classList.add('hide');
        }

        var btnManageSeriesRecording = parent.querySelector('.btnManageSeriesRecording');

        if (program.SeriesTimerId) {

            if (btnManageSeriesRecording) {
                btnManageSeriesRecording.classList.remove('hide');
            }
            parent.querySelector('.seriesRecordingButton .recordingIcon').classList.add('recordingIcon-active');
            parent.querySelector('.seriesRecordingButtonText').innerHTML = globalize.translate('HeaderCancelSeries');
        } else {

            if (btnManageSeriesRecording) {
                btnManageSeriesRecording.classList.add('hide');
            }

            parent.querySelector('.seriesRecordingButton .recordingIcon').classList.remove('recordingIcon-active');
            parent.querySelector('.seriesRecordingButtonText').innerHTML = globalize.translate('HeaderRecordSeries');
        }

        if (program.TimerId && program.Status !== 'Cancelled') {
            parent.querySelector('.btnManageRecording').classList.remove('hide');
            parent.querySelector('.singleRecordingButton .recordingIcon').classList.add('recordingIcon-active');

            if (program.Status === 'InProgress') {
                parent.querySelector('.singleRecordingButtonText').innerHTML = globalize.translate('HeaderStopRecording');
            } else {
                parent.querySelector('.singleRecordingButtonText').innerHTML = globalize.translate('HeaderDoNotRecord');
            }

        } else {
            parent.querySelector('.btnManageRecording').classList.add('hide');
            parent.querySelector('.singleRecordingButton .recordingIcon').classList.remove('recordingIcon-active');
            parent.querySelector('.singleRecordingButtonText').innerHTML = globalize.translate('Record');
        }
    }

    function fetchData(instance) {

        var options = instance.options;
        var apiClient = connectionManager.getApiClient(options.serverId);

        return apiClient.getLiveTvProgram(options.programId, apiClient.getCurrentUserId()).then(function (program) {

            instance.TimerId = program.TimerId;
            instance.Status = program.Status;
            instance.SeriesTimerId = program.SeriesTimerId;

            loadData(options.parent, program, apiClient);
        });
    }

    function onTimerChangedExternally(e, apiClient, data) {

        var options = this.options;
        var refresh = false;

        if (data.Id) {
            if (this.TimerId === data.Id) {
                refresh = true;
            }
        }
        if (data.ProgramId && options) {
            if (options.programId === data.ProgramId) {
                refresh = true;
            }
        }

        if (refresh) {
            this.refresh();
        }
    }

    function onSeriesTimerChangedExternally(e, apiClient, data) {

        var options = this.options;
        var refresh = false;

        if (data.Id) {
            if (this.SeriesTimerId === data.Id) {
                refresh = true;
            }
        }
        if (data.ProgramId && options) {
            if (options.programId === data.ProgramId) {
                refresh = true;
            }
        }

        if (refresh) {
            this.refresh();
        }
    }

    function RecordingEditor(options) {

        this.options = options;
        this.embed();

        var timerChangedHandler = onTimerChangedExternally.bind(this);
        this.timerChangedHandler = timerChangedHandler;

        events.on(serverNotifications, 'TimerCreated', timerChangedHandler);
        events.on(serverNotifications, 'TimerCancelled', timerChangedHandler);

        var seriesTimerChangedHandler = onSeriesTimerChangedExternally.bind(this);
        this.seriesTimerChangedHandler = seriesTimerChangedHandler;

        events.on(serverNotifications, 'SeriesTimerCreated', seriesTimerChangedHandler);
        events.on(serverNotifications, 'SeriesTimerCancelled', seriesTimerChangedHandler);
    }

    function onManageRecordingClick(e) {

        var options = this.options;

        if (!this.TimerId || this.Status === 'Cancelled') {
            return;
        }

        var self = this;

        require(['recordingEditor'], function (recordingEditor) {

            recordingEditor.show(self.TimerId, options.serverId, {

                enableCancel: false

            }).then(function () {
                self.changed = true;
            });
        });
    }

    function onManageSeriesRecordingClick(e) {

        var options = this.options;

        if (!this.SeriesTimerId) {
            return;
        }

        appRouter.showItem({
            Type: 'SeriesTimer',
            Id: this.SeriesTimerId,
            ServerId: options.serverId
        });
    }

    function onRecordChange(e) {

        this.changed = true;

        var self = this;
        var options = this.options;
        var apiClient = connectionManager.getApiClient(options.serverId);

        var button = dom.parentWithTag(e.target, 'BUTTON');
        var isChecked = !button.querySelector('i').classList.contains('recordingIcon-active');

        var hasEnabledTimer = this.TimerId && this.Status !== 'Cancelled';

        if (isChecked) {
            if (!hasEnabledTimer) {
                loading.show();
                recordingHelper.createRecording(apiClient, options.programId, false).then(function () {
                    events.trigger(self, 'recordingchanged');
                    fetchData(self);
                    loading.hide();
                });
            }
        } else {
            if (hasEnabledTimer) {
                loading.show();
                recordingHelper.cancelTimer(apiClient, this.TimerId, true).then(function () {
                    events.trigger(self, 'recordingchanged');
                    fetchData(self);
                    loading.hide();
                });
            }
        }
    }

    function sendToast(msg) {
        require(['toast'], function (toast) {
            toast(msg);
        });
    }

    function onRecordSeriesChange(e) {

        this.changed = true;

        var self = this;
        var options = this.options;
        var apiClient = connectionManager.getApiClient(options.serverId);

        var button = dom.parentWithTag(e.target, 'BUTTON');
        var isChecked = !button.querySelector('i').classList.contains('recordingIcon-active');

        if (isChecked) {
            showSeriesRecordingFields(options.parent, options.programId, apiClient);

            if (!this.SeriesTimerId) {

                var promise = this.TimerId ?
                    recordingHelper.changeRecordingToSeries(apiClient, this.TimerId, options.programId) :
                    recordingHelper.createRecording(apiClient, options.programId, true);

                promise.then(function () {
                    fetchData(self);
                });
            }
        } else {

            if (this.SeriesTimerId) {
                apiClient.cancelLiveTvSeriesTimer(this.SeriesTimerId).then(function () {
                    sendToast(globalize.translate('RecordingCancelled'));
                    fetchData(self);
                });
            }
        }
    }

    RecordingEditor.prototype.embed = function () {

        var self = this;

        var options = self.options;
        var context = options.parent;

        var singleRecordingButton = context.querySelector('.singleRecordingButton');

        singleRecordingButton.classList.remove('hide');

        singleRecordingButton.addEventListener('click', onRecordChange.bind(self));
        context.querySelector('.seriesRecordingButton').addEventListener('click', onRecordSeriesChange.bind(self));
        context.querySelector('.btnManageRecording').addEventListener('click', onManageRecordingClick.bind(self));

        var btnManageSeriesRecording = context.querySelector('.btnManageSeriesRecording');
        if (btnManageSeriesRecording) {
            btnManageSeriesRecording.addEventListener('click', onManageSeriesRecordingClick.bind(self));
        }

        fetchData(self);
    };

    RecordingEditor.prototype.hasChanged = function () {

        return this.changed;
    };

    RecordingEditor.prototype.refresh = function () {

        fetchData(this);
    };

    RecordingEditor.prototype.destroy = function () {

        var timerChangedHandler = this.timerChangedHandler;
        this.timerChangedHandler = null;

        events.off(serverNotifications, 'TimerCreated', timerChangedHandler);
        events.off(serverNotifications, 'TimerCancelled', timerChangedHandler);

        var seriesTimerChangedHandler = this.seriesTimerChangedHandler;
        this.seriesTimerChangedHandler = null;

        events.off(serverNotifications, 'SeriesTimerCreated', seriesTimerChangedHandler);
        events.off(serverNotifications, 'SeriesTimerCancelled', seriesTimerChangedHandler);
    };

    return RecordingEditor;
});