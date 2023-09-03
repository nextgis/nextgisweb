define([
    "dojo/_base/declare",
    "./_PluginBase",
    "dijit/layout/TabContainer",
    "dijit/_WidgetBase",
    "dojo/topic",
    "@nextgisweb/pyramid/i18n!",
], function (
    declare,
    _PluginBase,
    TabContainer,
    _WidgetBase,
    topic,
    i18n
) {
    return declare([_PluginBase], {
        constructor: function () {
            this.tabContainer = new TabContainer({
                region: "bottom",
                style: "height: 45%",
                splitter: true,
            });
        },

        getPluginState: function (nodeData) {
            const { type, plugin } = nodeData;
            return {
                enabled: type === "layer" && plugin[this.identity],
            };
        },

        run: function () {
            this.openFeatureGrid();
            return Promise.resolve(undefined);
        },

        getMenuItem: function () {
            var widget = this;
            return {
                icon: "mdi-table-large",
                title: i18n.gettext("Feature table"),
                onClick: function () {
                    return widget.run();
                },
            };
        },

        openFeatureGrid: function () {
            var item = this.display.dumpItem(),
                layerId = item.layerId;

            this.display.tabContainer.addTab({
                key: String(layerId),
                label: item.label,
                component: () =>
                    new Promise((resolve) => {
                        require([
                            "@nextgisweb/webmap/webmap-feature-grid-tab",
                        ], (module) => {
                            resolve(module);
                        });
                    }),

                props: {
                    topic,
                    layerId: layerId,
                    plugin: this,
                },
            });
        },
    });
});
