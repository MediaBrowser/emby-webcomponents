define(['layoutManager', 'dialogText'], function (layoutManager, dialogText) {

    function showTvConfirm(options) {
        return new Promise(function (resolve, reject) {

            require(['actionsheet'], function (actionSheet) {

                var items = [];

                items.push({
                    name: dialogText.get('Ok'),
                    id: 'ok'
                });

                items.push({
                    name: dialogText.get('Cancel'),
                    id: 'cancel'
                });

                actionSheet.show({

                    title: options.text,
                    items: items

                }).then(function (id) {

                    switch (id) {

                        case 'ok':
                            resolve();
                            break;
                        default:
                            reject();
                            break;
                    }

                }, reject);
            });
        });
    }

    function showConfirm(options) {

    }

    return function (text, title) {

        var options;
        if (typeof text === 'string') {
            options = {
                title: title,
                text: text
            };
        } else {
            options = text;
        }

        if (layoutManager.tv) {
            return showTvConfirm(options);
        }

        return showTvConfirm(options);
    };
});