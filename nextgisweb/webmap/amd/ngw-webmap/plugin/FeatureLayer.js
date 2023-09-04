define([
    "dojo/_base/declare",
    "./_PluginBase",
    "dojo/topic",
    "@nextgisweb/pyramid/i18n!",
], function (declare, _PluginBase, topic, { gettext }) {
    return declare([_PluginBase], {
        getPluginState: function (nodeData) {
            const { type, plugin } = nodeData;
            return {
                enabled: type === "layer" && plugin[this.identity],
            };
        },

        getMenuItem: function () {
            return {
                icon: "mdi-table-large",
                title: gettext("Feature table"),
                onClick: () => {
                    this.openFeatureGrid();
                    return Promise.resolve(undefined);
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
