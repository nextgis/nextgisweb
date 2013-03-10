/*global define, ngwConfig*/
define([
    "dojo/_base/declare",
    "./_PluginBase",
    "dijit/layout/ContentPane",
    "dojo/dom-construct",
    "dijit/MenuItem",
    "feature_layer/FeatureGrid"
], function (
    declare,
    _PluginBase,
    ContentPane,
    domConstruct,
    MenuItem,
    FeatureGrid
) {
    var Pane = declare([ContentPane], {
        closable: true,
        iconClass: "iconDescription",

        postCreate: function () {
            if (this.data.description) {
                domConstruct.create("div", {
                    style: 'max-width: 60em',
                    innerHTML: this.data.description
                }, this.domNode);
            }
        }
    });

    return declare([_PluginBase], {

        constructor: function (params) {
            var plugin = this;

            this.menuItem = new MenuItem({
                label: "Описание",
                iconClass: "iconDescription",
                disabled: true,
                onClick: function () {
                    plugin.openLayerInfo();
                }
            });

            var store = this.itemStore,
                menuItem = this.menuItem;

            this.display.watch("item", function (attr, oldVal, newVal) {
                var type = store.getValue(newVal, "type");
                menuItem.set("disabled", type !== "layer");
            });

        },

        postCreate: function () {
            this.display.itemMenu.addChild(this.menuItem);
        },

        openLayerInfo: function () {
            var item = this.display.dumpItem(),
                data = this.display.get('itemConfig').plugin[this.identity];

            var pane = new Pane({
                title: item.label,
                tooltip: "Описание слоя \"" + item.label + "\"",
                layerId: item.layerId,
                data: data
            });

            this.display.tabContainer.addChild(pane);
            this.display.tabContainer.selectChild(pane);
        }
    });
});