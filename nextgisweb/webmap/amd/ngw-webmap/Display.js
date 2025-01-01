define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/layout/ContentPane",
    "./ui/react-webmap-tabs",
    // compat
    "@nextgisweb/webmap/compat/ShadowDisplay",
    // settings
    "@nextgisweb/pyramid/i18n!",
    "@nextgisweb/pyramid/settings!webmap",
    "dojo/text!./template/Display.hbs",
    // template
    "dijit/layout/BorderContainer",
], function (
    declare,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    ContentPane,
    ReactWebMapTabs,
    ShadowDisplay,
    { renderTemplate },
    settings,
    template
) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: renderTemplate(template),

        // AMD module loading: adapter, basemap, plugin
        _midDeferred: undefined,

        _itemStoreDeferred: undefined,
        _mapDeferred: undefined,
        _mapExtentDeferred: undefined,
        _layersDeferred: undefined,
        _postCreateDeferred: undefined,
        _startupDeferred: undefined,

        // Permalink params
        _urlParams: undefined,

        // Current basemap
        _baseLayer: undefined,

        // For image loading
        assetUrl: ngwConfig.assetUrl,

        modeURLParam: "panel",
        emptyModeURLValue: "none",

        webmapStore: undefined,
        tinyConfig: undefined,

        constructor: function (options) {
            declare.safeMixin(this, options);
            this.clientSettings = settings;
            this.tabContainer = new ReactWebMapTabs({ display: this });
            this.shadow = new ShadowDisplay.default(this);
        },

        postCreate: function () {
            this.inherited(arguments);
            this.leftPanelPane = new ContentPane({
                class: "leftPanelPane",
                region: "left",
                gutters: false,
                splitter: true,
            });
            this.shadow._postCreate();
        },

        startup: function () {
            this.inherited(arguments);
            this.shadow.startup();
        },

        prepareItem: function (item) {
            this.shadow.prepareItem(item);
        },

        _mapAddControls: function (controls) {
            this.shadow._mapAddControls(controls);
        },
        _mapAddLayer: function (id) {
            this.shadow._mapAddLayer(id);
        },

        _switchBasemap: function (basemapLayerKey) {
            this.shadow._switchBasemap(basemapLayerKey);
        },

        _pluginsPanels: [],

        _getActiveBasemapKey: function () {
            return this.shadow._getActiveBasemapKey();
        },

        handleSelect: function (selectedKeys) {
            this.shadow.handleSelect(selectedKeys);
        },

        setLayerZIndex: function (id, zIndex) {
            this.shadow.setLayerZIndex(id, zIndex);
        },

        getVisibleItems: function () {
            return this.shadow.getVisibleItems();
        },

        dumpItem: function () {
            return this.shadow.dumpItem();
        },

        _zoomToInitialExtent: function () {
            this.shadow._zoomToInitialExtent();
        },

        highlightGeometry: function (geometry) {
            this.shadow.highlightGeometry(geometry);
        },

        getItemConfig: function () {
            return this.shadow.getItemConfig();
        },

        getUrlParams: function () {
            return this.shadow.getUrlParams();
        },

        isTinyMode: function () {
            return this.shadow.isTinyMode();
        },
    });
});
