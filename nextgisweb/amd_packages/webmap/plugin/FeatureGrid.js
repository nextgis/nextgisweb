define([
    "dojo/_base/declare",
    "./_PluginBase",
    "dijit/layout/ContentPane",
    "dijit/MenuItem",
    "dojo/dom-construct",
    "dojo/dom-style",
    "feature_layer/FeatureGrid"
], function (
    declare,
    _PluginBase,
    ContentPane,
    MenuItem,
    domConstruct,
    domStyle,
    FeatureGrid
) {
    var Pane = declare([ContentPane], {
        closable: true, 

        constructor: function (params) {
            declare.safeMixin(this, params);
        },

        startup: function () {
            this.inherited(arguments);

            var grid = new FeatureGrid(this.gridParams);
            domStyle.set(grid.domNode, "height", "100%");
            this.set("content", grid.domNode);
            
            // Любопытно, что startup тут не работает, вернее работает, но
            // в результате заголовок сливается с первой строкой. Почему при
            // этом работает refresh() не очень понятно, но побочный эффект - 
            // первая порция данных запрашивается дважды.
            grid.refresh();

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
                    var pluginData = store.dumpItem(store.getValue(plugins, identity));

                    var pane = new Pane({
                        title: store.getValue(display.treeWidget.selectedItem, "display_name") + ": Объекты",
                        gridParams: pluginData
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