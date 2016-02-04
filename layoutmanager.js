define(['browser'], function (browser) {

    return function () {

        var self = this;

        self.setFormFactor = function (formFactor) {

            self.mobile = false;
            self.tv = false;

            self[formFactor] = true;
        };

        // Take a guess at initial layout. The consuming app can override
        if (browser.mobile) {
            self.setFormFactor('mobile');
        } else {
            self.setFormFactor('desktop');
        }
    };
});