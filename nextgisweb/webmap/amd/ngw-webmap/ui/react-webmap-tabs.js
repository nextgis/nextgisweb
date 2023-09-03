define([
    "dojo/_base/declare",
    "dojo/dom-style",
    // "dijit/_WidgetBase",
    "dijit/layout/TabContainer",
    "@nextgisweb/gui/react-app",
    "@nextgisweb/webmap/webmap-tabs",
], function (
    declare,
    domStyle,
    _WidgetBase,
    reactApp,
    { WebMapTabs, WebMapTabsStore }
) {
    return declare([_WidgetBase], {
        store: undefined,
        component: undefined,

        region: "bottom",
        style: "height: 45%",
        splitter: true,

        buildRendering: function () {
            this.inherited(arguments);
            domStyle.set(this.domNode, "height", "100%");
        },

        postCreate: function () {
            this.store = new WebMapTabsStore({
                onTabs: this._updateContainer.bind(this),
            });
        },

        addTab: function (tab) {
            this.store.addTab(tab);
            this._updateContainer();
        },

        closeTab: function (key) {
            this.store.removeTab(key);
            this._updateContainer();
        },

        _updateContainer: function () {
            if (this.store) {
                if (this.store.tabs.length) {
                    this._runReactApp();
                } else {
                    this._destroyReactApp();
                }
            }
        },

        _runReactApp: function () {
            if (!this.component) {
                this.component = reactApp.default(
                    WebMapTabs,
                    {
                        store: this.store,
                    },
                    this.domNode
                );
                this.display.mapContainer.addChild(this);
            }
        },

        _destroyReactApp: function () {
            if (this.component) {
                this.component.unmount();
            }
            this.component = null;
            this.display.mapContainer.removeChild(this);
        },

        destroy: function () {
            this.destroyReactApp();
        },
    });
});
