define([
    "dojo/_base/declare",
    "./_PluginBase",
    "dojo/dom-construct",
    "dijit/layout/ContentPane",
    "@nextgisweb/pyramid/i18n!",
], function (declare, _PluginBase, domConstruct, ContentPane, i18n) {
    var Pane = declare([ContentPane], {
        closable: true,
        iconClass: "iconDescription",

        postCreate: function () {
            if (this.data.description) {
                domConstruct.create(
                    "div",
                    {
                        style: "max-width: 60em",
                        innerHTML: this.data.description,
                    },
                    this.domNode
                );
            }
        }
    });

    return declare([_PluginBase], {
        getPluginState: function (nodeData) {
            const { type } = nodeData;
            return {
                enabled: type === "layer" && nodeData.plugin[this.identity],
            };
        },

        run: function () {
            this.openLayerInfo();
            return Promise.resolve(undefined);
        },

        getMenuItem: function () {
            var widget = this;
            return {
                icon: "material-description",
                title: i18n.gettext("Description"),
                onClick: function () {
                    return widget.run();
                },
            };
        },

        openLayerInfo: function () {
            var item = this.display.dumpItem(),
                data = this.display.get("itemConfig").plugin[this.identity];
            if (data !== undefined) {
                var pane = new Pane({
                    title: item.label,
                    layerId: item.layerId,
                    data: data,
                });

                this.display.tabContainer.addChild(pane);
                this.display.tabContainer.selectChild(pane);
            }
        },
    });
});
