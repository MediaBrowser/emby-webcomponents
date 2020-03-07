define(['events', 'apphost', 'connectionManager'], function (events, appHost, connectionManager) {
    'use strict';

    // TODO: replace with each plugin version
    var cacheParam = Date.now();

    function loadStrings(plugin, globalize) {

        var strings = plugin.getTranslations ? plugin.getTranslations() : [];

        return globalize.loadStrings({
            name: plugin.id || plugin.packageName,
            strings: strings
        });
    }

    function definePluginRoute(pluginManager, appRouter, route, plugin) {

        route.contentPath = pluginManager.mapPath(plugin, route.path);
        route.path = pluginManager.mapRoute(plugin, route);

        appRouter.addRoute(route);
    }

    function PluginManager() {

        this.pluginsList = [];
    }

    PluginManager.prototype.loadPlugin = function (url) {

        console.log('Loading plugin: ' + url);
        var instance = this;

        return require([url, 'globalize', 'appRouter']).then(function (responses) {

            var pluginFactory = responses[0];
            var globalize = responses[1];
            var appRouter = responses[2];

            console.log('creating plugin instance');
            var plugin = new pluginFactory();

            // See if it's already installed
            var existing = instance.pluginsList.filter(function (p) {
                return p.id === plugin.id;
            })[0];

            if (existing) {
                return Promise.resolve();
            }

            plugin.installUrl = url;

            var urlLower = url.toLowerCase();
            if (urlLower.indexOf('http:') === -1 && urlLower.indexOf('https:') === -1 && urlLower.indexOf('file:') === -1) {
                if (url.indexOf(appRouter.baseUrl()) !== 0) {

                    url = appRouter.baseUrl() + '/' + url;
                }
            }

            var separatorIndex = Math.max(url.lastIndexOf('/'), url.lastIndexOf('\\'));
            plugin.baseUrl = url.substring(0, separatorIndex);

            var paths = {};
            paths[plugin.id] = plugin.baseUrl;

            console.log('setting require config');
            require.config({
                waitSeconds: 0,
                paths: paths
            });

            instance.register(plugin);

            if (plugin.getRoutes) {
                plugin.getRoutes().forEach(function (route) {
                    definePluginRoute(instance, appRouter, route, plugin);
                });
            }

            console.log('loading plugin strings');

            return loadStrings(plugin, globalize);
        });
    };

    // In lieu of automatic discovery, plugins will register dynamic objects
    // Each object will have the following properties:
    // name
    // type (skin, screensaver, etc)
    PluginManager.prototype.register = function (obj) {

        this.pluginsList.push(obj);
        events.trigger(this, 'registered', [obj]);
    };

    PluginManager.prototype.ofType = function (type) {

        return this.pluginsList.filter(function (o) {
            return o.type === type;
        });
    };

    PluginManager.prototype.plugins = function () {
        return this.pluginsList;
    };

    PluginManager.prototype.mapRoute = function (plugin, route) {

        if (typeof plugin === 'string') {
            plugin = this.pluginsList.filter(function (p) {
                return (p.id || p.packageName) === plugin;
            })[0];
        }

        route = route.path || route;

        if (route.toLowerCase().indexOf('http') === 0) {
            return route;
        }

        return '/plugins/' + plugin.id + '/' + route;
    };

    PluginManager.prototype.mapPath = function (plugin, path, addCacheParam) {

        if (typeof plugin === 'string') {
            plugin = this.pluginsList.filter(function (p) {
                return (p.id || p.packageName) === plugin;
            })[0];
        }

        var url = plugin.baseUrl + '/' + path;

        if (addCacheParam) {
            url += url.indexOf('?') === -1 ? '?' : '&';
            url += 'v=' + cacheParam;
        }

        return url;
    };

    var allowedPluginConfigs = [

        'b0daa30f-2e09-4083-a6ce-459d9fecdd80',
        'de228f12-e43e-4bd9-9fc0-2830819c3b92',

        // auto boxsets
        '899c12c7-5b40-4c4e-9afd-afd74a685eb1',
        // auto-organize
        '14f5f69e-4c8d-491b-8917-8e90e8317530',
        // cinema mode
        '02528C96-F727-44D7-BE87-9EEF040758C3',
        // cover art
        'dc372f99-4e0e-4c6b-8c18-2b887ca4530c',
        // dropbox
        '830fc68f-b964-4d2f-b139-48e22cd143c',
        // email
        'b9f0c474-e9a8-4292-ae41-eb3c1542f4cd',
        // foldersync
        '7cfbb821-e8fd-40ab-b64e-a7749386a6b2',
        // gamebrowser
        '4C2FDA1C-FD5E-433A-AD2B-718E0B73E9A9',
        // genre cleaner
        'cd5a19be-7676-48ef-b64f-a17c98f2b889',
        // google drive
        'b2ff6a63-303a-4a84-b937-6e12f87e3eb9',
        // imvdb
        '0277E613-3EC0-4360-A3DE-F8AF0AABB5E9',
        // ldap
        '9464BD84-D30D-4404-B2AD-DFF4E12D5FC5',
        // next pvr
        '9574ac10-bf23-49bc-949f-924f23cfa48f',
        // notify my android
        '66fd72a4-7e8e-4f22-8d1c-022ce4b9b0d5',
        // open subtitles
        '4DCB591C-0FA2-4C5D-A7E5-DABE37164C8B',
        // podcasts
        '8e791e2a-058a-4b12-8493-8bf69d92d685',
        // prowl
        '577f89eb-58a7-4013-be06-9a970ddb1377',
        // pushalot
        '6153FDF0-40CC-4457-8730-3B4A19512BAE',
        // pushbullet
        'de228f12-e43e-4bd9-9fc0-2830819c3b92',
        // pushover
        '6C3B6965-C257-47C2-AA02-64457AE21D91',
        // reports
        '2FE79C34-C9DC-4D94-9DF2-2F3F36764414',
        // roku thumbnails
        '0417264b-5a93-4ad0-a1f0-b87569b7cf80',
        // backup
        'e711475e-efad-431b-8527-033ba9873a34',
        // studio cleaner
        'AB95885A-1D0E-445E-BDBF-80C1912C98C5',
        // subdb
        'F015EA06-B413-47F1-BF15-F049A799658B',
        // trailers
        '986a7283-205a-4436-862d-23135c067f8a',
        // trakt
        '8abc6789-fde2-4705-8592-4028806fa343',
        // xml metadata
        '2850d40d-9c66-4525-aa46-968e8ef04e97',
        // dropbox
        '830fc68f-b964-4d2f-b139-48e22cd143c7',
        // fanart
        '8D7D93B2-01DC-48DC-8C5D-4E7ABBD9F9EB',
        // musicbrainz
        '341944AF-4959-47E5-8ACE-398520208A71',
        // moviedb
        '3A63A9F3-810E-44F6-910A-14D6AD1255EC',
        // nfo
        'E610BA80-9750-47BC-979D-3F0FC86E0081',
        // studio images
        'C68856B8-6031-480D-B08E-43B9114ADDB2',
        // tvdb
        '7FB7FF5E-5407-4F74-8990-B7AA643085D2',
        // moviedb
        '3A63A9F3-810E-44F6-910A-14D6AD1255EC',
        // Podnapisi
        '0A70BB83-E28F-4633-923D-B87244697831',
        // Addic7ed
        'CEA173E8-8851-4B3B-B61D-5BEF28B4612B',
        // Dlna
        '8C6DDB20-18B1-4131-9285-796179A71C0F',
        // Port mapper
        '96FA50A4-69CE-42AC-B6A3-EF6B3388CCB7',
        // Encoding Diagnostics
        '2EA04F4B-A776-428E-9869-58E8E5B149C2',
        // EmbyDns
        'DD735A61-C43E-446D-A1DB-1F9F47855383',
        // Dvd
        '4C7A45D6-F859-4242-9CDA-AEA1977969DE',
        // Webhooks
        '85A7B1D4-FBDA-4E85-A0A2-AC303C9946A4',
        // NextGen TV Test UI
        'A0BF8914-0E58-4C1C-AF19-BB5B79D81FCA'

    ].map(function (i) {
        return i.toLowerCase();
    });

    PluginManager.prototype.allowPluginPages = function (pluginId) {

        var disallowPlugins = appHost.supports('restrictedplugins') && allowedPluginConfigs.indexOf((pluginId || '').toLowerCase()) === -1;

        return !disallowPlugins;
    };

    PluginManager.prototype.getConfigurationPageUrl = function (name) {

        if (appHost.supports('multiserver')) {

            return "configurationpageext?name=" + encodeURIComponent(name);

        } else {

            return "configurationpage?name=" + encodeURIComponent(name);
        }
    };

    PluginManager.prototype.getConfigurationResourceUrl = function (name) {

        if (appHost.supports('multiserver')) {

            return connectionManager.currentApiClient().getUrl('web/ConfigurationPage',
                {
                    name: name
                });

        } else {

            return this.getConfigurationPageUrl(name);
        }
    };

    return new PluginManager();
});