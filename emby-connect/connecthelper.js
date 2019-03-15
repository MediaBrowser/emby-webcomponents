define(['globalize', 'apphost', 'loading', 'alert', 'emby-linkbutton'], function (globalize, appHost, loading, alert) {
    'use strict';

    function resolvePromise() {
        return Promise.resolve();
    }

    function rejectPromise() {
        return Promise.reject();
    }

    function showNewUserInviteMessage(result) {

        if (!result.IsNewUserInvitation && !result.IsPending) {

            // It was immediately approved
            return Promise.resolve();
        }

        var message = result.IsNewUserInvitation ?
            globalize.translate('MessageInvitationSentToNewUser', result.GuestDisplayName) :
            globalize.translate('MessageInvitationSentToUser', result.GuestDisplayName);

        return alert({

            text: message,
            title: globalize.translate('HeaderInvitationSent')

        }).then(resolvePromise, resolvePromise);
    }

    function inviteGuest(options) {

        var apiClient = options.apiClient;

        loading.show();

        // Add/Update connect info
        return apiClient.ajax({

            type: "POST",
            url: apiClient.getUrl('Connect/Invite'),
            dataType: 'json',
            data: options.guestOptions || {}

        }).then(function (result) {

            loading.hide();
            return showNewUserInviteMessage(result);

        }, function (response) {

            loading.hide();

            var statusCode = response ? response.status : 0;

            if (statusCode === 502) {
                return showConnectServerUnreachableErrorMessage().then(rejectPromise, rejectPromise);
            }
            else if (statusCode === 404) {
                // User doesn't exist
                return alert({
                    text: globalize.translate('GuestUserNotFound')
                }).then(rejectPromise, rejectPromise);

            } else if ((statusCode || 0) >= 500) {

                // Unable to reach connect server ?
                return alert({
                    text: globalize.translate('ErrorReachingEmbyConnect')
                }).then(rejectPromise, rejectPromise);

            } else {

                // status 400 = account not activated

                // General error
                return showGuestGeneralErrorMessage().then(rejectPromise, rejectPromise);
            }
        });
    }

    function showGuestGeneralErrorMessage() {

        var html;

        if (appHost.supports('externallinks')) {
            html = globalize.translate('ErrorAddingGuestAccount1', '<a is="emby-linkbutton" class="button-link" href="https://emby.media/connect" target="_blank">https://emby.media/connect</a>');
            html += '<br/><br/>' + globalize.translate('ErrorAddingGuestAccount2', 'apps@emby.media');
        }

        var text = globalize.translate('ErrorAddingGuestAccount1', 'https://emby.media/connect');
        text += '\n\n' + globalize.translate('ErrorAddingGuestAccount2', 'apps@emby.media');

        return alert({
            text: text,
            html: html
        });
    }

    function showConnectServerUnreachableErrorMessage() {

        var text = globalize.translate('ErrorConnectServerUnreachable', 'https://connect.emby.media');

        return alert({
            text: text
        });
    }

    function showLinkUserErrorMessage(username, statusCode) {

        var html;
        var text;

        if (statusCode === 502) {
            return showConnectServerUnreachableErrorMessage();
        }
        else if (username) {

            if (appHost.supports('externallinks')) {
                html = globalize.translate('ErrorAddingEmbyConnectAccount1', '<a is="emby-linkbutton" class="button-link" href="https://emby.media/connect" target="_blank">https://emby.media/connect</a>');
                html += '<br/><br/>' + globalize.translate('ErrorAddingEmbyConnectAccount2', 'apps@emby.media');
            }

            text = globalize.translate('ErrorAddingEmbyConnectAccount1', 'https://emby.media/connect');
            text += '\n\n' + globalize.translate('ErrorAddingEmbyConnectAccount2', 'apps@emby.media');

        } else {
            html = text = globalize.translate('DefaultErrorMessage');
        }

        return alert({
            text: text,
            html: html
        });
    }

    function updateUserLink(apiClient, user, newConnectUsername) {
        var currentConnectUsername = user.ConnectUserName || '';
        var enteredConnectUsername = newConnectUsername;

        var linkUrl = apiClient.getUrl('Users/' + user.Id + '/Connect/Link');

        if (currentConnectUsername && !enteredConnectUsername) {

            // Remove connect info
            // Add/Update connect info
            return apiClient.ajax({

                type: "DELETE",
                url: linkUrl

            }).then(function () {

                return alert({
                    text: globalize.translate('MessageEmbyAccontRemoved'),
                    title: globalize.translate('HeaderEmbyAccountRemoved'),

                }).catch(resolvePromise);

            }, function (response) {

                var statusCode = response ? response.status : 0;

                if (statusCode === 502) {
                    return showConnectServerUnreachableErrorMessage().then(rejectPromise);
                }

                return alert({
                    text: globalize.translate('ErrorRemovingEmbyConnectAccount')

                }).then(rejectPromise);
            });

        }
        else if (currentConnectUsername !== enteredConnectUsername) {

            // Add/Update connect info
            return apiClient.ajax({
                type: "POST",
                url: linkUrl,
                data: {
                    ConnectUsername: enteredConnectUsername
                },
                dataType: 'json'

            }).then(function (result) {

                var msgKey = result.IsPending ? 'MessagePendingEmbyAccountAdded' : 'MessageEmbyAccountAdded';

                return alert({
                    text: globalize.translate(msgKey),
                    title: globalize.translate('HeaderEmbyAccountAdded'),

                }).catch(resolvePromise);

            }, function (response) {

                var statusCode = response ? response.status : 0;

                if (statusCode === 502) {
                    return showConnectServerUnreachableErrorMessage().then(rejectPromise);
                }

                return showLinkUserErrorMessage('.', statusCode).then(rejectPromise);
            });

        } else {
            return Promise.reject();
        }
    }

    return {
        inviteGuest: inviteGuest,
        updateUserLink: updateUserLink,
        showLinkUserErrorMessage: showLinkUserErrorMessage,
        showConnectServerUnreachableErrorMessage: showConnectServerUnreachableErrorMessage
    };
});