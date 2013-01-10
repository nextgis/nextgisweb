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

        postCreate: function () {
            domConstruct.create("iframe", {
                src: application_url + "/layer/" + this.layer_id + '?no_layout',
                style: "width: 100%; height: 100%;"
            }, this.domNode);
        }
    });

    return declare([_PluginBase], {

        postCreate: function () {
            var identity = this.identity;
            var display = this.webmapDisplay;
            var store = this.webmapDisplay._treeStore;

            var itm = new MenuItem({
                label: "Информация",
                onClick: function () {

                    var pane = new Pane({
                        title: store.getValue(display.treeWidget.selectedItem, "display_name") + ": Информация",
                        layer_id: store.getValue(display.treeWidget.selectedItem, "layer_id")
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