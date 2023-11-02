define([
    "dojo/_base/declare",
    "./_PluginBase",
    "ngw-webmap/ui/react-panel",
    "@nextgisweb/pyramid/i18n!",
], function (declare, _PluginBase, reactPanel, { gettext }) {
    return declare([_PluginBase], {
        getPluginState: function (nodeData) {
            var type = nodeData.type;
            var data = this.display.get("itemConfig").plugin[this.identity];
            return {
                enabled:
                    type === "layer" &&
                    nodeData.plugin[this.identity] &&
                    data.description,
            };
        },

        run: function () {
            this.openLayerInfo();
            return Promise.resolve(undefined);
        },

        getMenuItem: function () {
            var widget = this;
            return {
                icon: "mdi-text-long",
                title: gettext("Description"),
                onClick: function () {
                    return widget.run();
                },
            };
        },

        openLayerInfo: function () {
            const pm = this.display.panelsManager;
            const pkey = "resource-description";
            const item = this.display.dumpItem();
            const data = this.display.get("itemConfig").plugin[this.identity];
            if (data !== undefined) {
                const content = data.description;
                let panel = pm.getPanel(pkey);
                if (panel) {
                    if (panel.app) {
                        panel.app.update({ content });
                    } else {
                        panel.props = { content };
                    }
                } else {
                    const cls = reactPanel(
                        "@nextgisweb/webmap/panel/description",
                        {
                            props: { content },
                        }
                    );
                    pm.addPanels([
                        {
                            cls: cls,
                            params: {
                                title: item.label,
                                name: pkey,
                                order: 100,
                                menuIcon: "mdi-text-long",
                            },
                        },
                    ]);
                    panel = pm.getPanel(pkey);
                }
                pm.activatePanel(pkey);
            }
        },
    });
});
