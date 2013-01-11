define([
    "dojo/_base/declare",
    "./_PluginBase",
    "dijit/layout/ContentPane",
    "dijit/MenuItem",
    "dojo/dom-construct",
    "dojo/dom-style",
    "feature_layer/FeatureGrid",
    "dijit/form/Button"
], function (
    declare,
    _PluginBase,
    ContentPane,
    MenuItem,
    domConstruct,
    domStyle,
    FeatureGrid,
    Button
) {
    var Pane = declare([FeatureGrid], {
        closable: true,
        iconClass: "dijitIconTable",

        postCreate: function () {
            this.toolbar.addChild(new Button({
                label: "Открыть",
                iconClass: "dijitIconApplication"
            }));

            this.toolbar.addChild(new Button({
                label: "Показать",
                iconClass: "dijitIconSearch"
            }));
        }
    });

    return declare([_PluginBase], {

        postCreate: function () {
            var identity = this.identity;
            var display = this.webmapDisplay;
            var store = this.webmapDisplay._treeStore;

            var itm = new MenuItem({
                label: "Объекты",
                onClick: function () {
                    var plugins = store.getValue(display.treeWidget.selectedItem, "plugins");

                    var pane = new Pane({
                        title: store.getValue(display.treeWidget.selectedItem, "display_name"),
                        gutters: false,
                        layerId: store.getValue(display.treeWidget.selectedItem, "layer_id"),
                    });

                    pane.placeAt(display.tabContainer);
                    pane.startup();

                    display.tabContainer.selectChild(pane);
                }
            });

            display.selectedLayerMenu.addChild(itm);

            display.treeWidget.watch("selectedItem", function (attr, oldVal, newVal) {
                var plugins = store.getValue(newVal, "plugins");
                itm.set("disabled", !(plugins && store.getValue(plugins, identity)));
            });
        }
    });
});