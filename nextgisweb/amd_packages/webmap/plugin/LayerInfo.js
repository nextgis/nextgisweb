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
    var _Pane = declare([ContentPane], {
        closable: true,
        iconClass: "dijitIconFile",

        postCreate: function () {
            domConstruct.create("iframe", {
                src: ngwConfig.applicationUrl + "/layer/" + this.layerId + '?no_layout',
                style: "width: 100%; height: 100%;"
            }, this.domNode);
        }
    });

    return declare([_PluginBase], {

        constructor: function (params) {
            var plugin = this;

            this.menuItem = new MenuItem({
                label: "Информация",
                disabled: true,
                onClick: function () {
                    plugin.openLayerInfo();
                }
            });

            var store = this.itemStore,
                menuItem = this.menuItem;

            this.display.watch("item", function (attr, oldVal, newVal) {
                var type = store.getValue(newVal, "type");
                menuItem.set("disabled", type != "layer");
            });

        },

        postCreate: function () {
            this.display.itemMenu.addChild(this.menuItem);
        },

        openLayerInfo: function () {
            var item = this.display.get("item");

            var pane = new _Pane({
                title: this.itemStore.getValue(item, "label"),
                layerId: this.itemStore.getValue(item, "layerId")
            });

            this.display.tabContainer.addChild(pane);
            this.display.tabContainer.selectChild(pane);
        }
    });
});