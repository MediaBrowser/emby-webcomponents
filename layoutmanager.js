define(['browser', 'appSettings'], function (browser, appSettings) {

    function setLayout(self, layout, selectedLayout) {

        if (layout == selectedLayout) {
            self[layout] = true;
            document.documentElement.classList.add('layout-' + layout);
        } else {
            self[layout] = false;
            document.documentElement.classList.remove('layout-' + layout);
        }
    }

    function layoutManager() {

        var self = this;

        self.setLayout = function (layout, save) {

            if (layout == 'auto') {
                self.autoLayout();

                if (save !== false) {
                    appSettings.set('layout', '');
                }
            } else {
                setLayout(self, 'mobile', layout);
                setLayout(self, 'tv', layout);
                setLayout(self, 'desktop', layout);

                if (save !== false) {
                    appSettings.set('layout', layout);
                }
            }
        };

        self.getSavedLayout = function (layout) {

            return appSettings.get('layout');
        };

        self.autoLayout = function (undetectedLayout) {

            // Take a guess at initial layout. The consuming app can override
            if (browser.mobile) {
                self.setLayout('mobile', false);
            } else if (browser.tv) {
                self.setLayout('tv', false);
            } else {
                self.setLayout(undetectedLayout || 'desktop', false);
            }
        };

        self.autoLayout();
    };

    return new layoutManager();
});