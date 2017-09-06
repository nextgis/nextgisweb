define([
    "dojo/_base/declare",
    "./_PluginBase",
    "dojo/dom-construct",
    "dijit/layout/ContentPane",
    "dijit/MenuItem",
    "ngw-pyramid/i18n!webmap",
], function (
    declare,
    _PluginBase,
    domConstruct,
    ContentPane,
    MenuItem,
    i18n
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

        constructor: function () {
            var plugin = this;

            this.menuItem = new MenuItem({
                label: i18n.gettext("Description"),
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
            if (this.display.layersPanel && this.display.layersPanel.contentWidget.itemMenu) {
                this.display.layersPanel.contentWidget.itemMenu.addChild(this.menuItem);
            }
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