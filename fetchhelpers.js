define([], function () {

    function getFetchPromise(request) {

        var headers = request.headers || {};

        if (request.dataType == 'json') {
            headers.accept = 'application/json';
        }

        var fetchRequest = {
            headers: headers,
            method: request.type,
            credentials: 'same-origin'
        };

        var contentType = request.contentType;

        if (request.data) {

            if (typeof request.data === 'string') {
                fetchRequest.body = request.data;
            } else {
                fetchRequest.body = paramsToString(request.data);

                contentType = contentType || 'application/x-www-form-urlencoded; charset=UTF-8';
            }
        }

        if (contentType) {

            headers['Content-Type'] = contentType;
        }

        if (!request.timeout) {
            return fetch(request.url, fetchRequest);
        }

        return fetchWithTimeout(request.url, fetchRequest, request.timeout);
    }

    function fetchWithTimeout(url, options, timeoutMs) {

        console.log('fetchWithTimeout: timeoutMs: ' + timeoutMs + ', url: ' + url);

        return new Promise(function (resolve, reject) {

            var timeout = setTimeout(reject, timeoutMs);

            options = options || {};
            options.credentials = 'same-origin';

            fetch(url, options).then(function (response) {
                clearTimeout(timeout);

                console.log('fetchWithTimeout: succeeded connecting to url: ' + url);

                resolve(response);
            }, function (error) {

                clearTimeout(timeout);

                console.log('fetchWithTimeout: timed out connecting to url: ' + url);

                reject();
            });
        });
    }

    function paramsToString(params) {

        var values = [];

        for (var key in params) {

            var value = params[key];

            if (value !== null && value !== undefined && value !== '') {
                values.push(encodeURIComponent(key) + "=" + encodeURIComponent(value));
            }
        }
        return values.join('&');
    }

    return {
        getFetchPromise: getFetchPromise
    };
});