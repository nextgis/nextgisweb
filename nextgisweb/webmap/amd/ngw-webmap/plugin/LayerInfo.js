define([
    "dojo/_base/declare",
    "./_PluginBase",
    "dojo/dom-construct",
    "dijit/layout/ContentPane",
], function (
    declare,
    _PluginBase,
    domConstruct,
    ContentPane,
) {
    var Pane = declare([ContentPane], {
        closable: true,
        iconClass: "iconDescription",

        postCreate: function () {
            if (this.data.description) {
                domConstruct.create("div", {
                    style: "max-width: 60em",
                    innerHTML: this.data.description
                }, this.domNode);
            }
        }
    });

    return declare([_PluginBase], {
        getPluginState: function (nodeData) {
            const {type} = nodeData;
            return {
                enabled: type === "layer",
            };
        },
        
        run: function () {
            this.openLayerInfo();
            return Promise.resolve(undefined);
        },

        openLayerInfo: function () {
            var item = this.display.dumpItem(),
                data = this.display.get("itemConfig").plugin[this.identity];

            var pane = new Pane({
                title: item.label,
                layerId: item.layerId,
                data: data
            });

            this.display.tabContainer.addChild(pane);
            this.display.tabContainer.selectChild(pane);
        }
    });
});