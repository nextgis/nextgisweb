define([
    "dojo/_base/declare",
    "./_PluginBase",
    "dijit/layout/ContentPane",
    "dijit/MenuItem",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/request/xhr",
    "feature_layer/FeatureGrid",
    "dijit/form/Button",
    "./../tool/Identify"
], function (
    declare,
    _PluginBase,
    ContentPane,
    MenuItem,
    domConstruct,
    domStyle,
    xhr,
    FeatureGrid,
    Button,
    Identify
) {
    var Pane = declare([FeatureGrid], {
        closable: true,
        iconClass: "dijitIconTable",

        postCreate: function () {
            var widget = this;

            this.btnOpenFeatureTab = new Button({
                label: "Открыть",
                iconClass: "dijitIconApplication",
                disabled: true,
                onClick: function () {
                    widget.openFeature();
                }
            });
            this.toolbar.addChild(this.btnOpenFeatureTab);

            this.btnZoomToFeature = new Button({
                label: "Перейти",
                iconClass: "dijitIconSearch",
                disabled: true,
                onClick: function() {
                    widget.zoomToFeature();
                }
            });
            this.toolbar.addChild(this.btnZoomToFeature);

            // При изменении выделенной строки изменяем доступность кнопок
            this.watch("selectedRow", function (attr, oldVal, newVal) {
                widget.btnOpenFeatureTab.set("disabled", newVal == null);
                widget.btnZoomToFeature.set("disabled", newVal == null);
            });
        },

        zoomToFeature: function () {
            var display = this.display;
            xhr.get(application_url + '/layer/' + this.layer + '/store_api/' + this.get("selectedRow").id, {
                handleAs: 'json',
                headers: { 'X-Feature-Box': true }
            }).then(
                function data(data) {
                    display.map.olMap.zoomToExtent(data.box);
                    display.tabContainer.selectChild(display.mainPane);
                }
            )
        },

        openFeature: function () {
            // TODO: Пока открываем в новом окне, сделать вкладку
            window.open(
                ngwConfig.applicationUrl + "/layer/" + this.layer 
                + "/feature/" + this.get("selectedRow").id + "/edit"
            );
        }
    });

    return declare([_PluginBase], {

        postCreate: function () {
            var identity = this.identity;
            var display = this.webmapDisplay;
            var store = this.webmapDisplay._treeStore;

            var plugin = this;
            var itm = new MenuItem({
                label: "Объекты",
                onClick: function () {
                    var plugins = store.getValue(display.treeWidget.selectedItem, "plugins");

                    var pane = new Pane({
                        plugin: plugin,
                        display: display,
                        layer: store.getValue(display.treeWidget.selectedItem, "layer_id"),
                        // Параметры отображения таба
                        title: store.getValue(display.treeWidget.selectedItem, "display_name"),
                        gutters: false
                    });

                    pane.placeAt(display.tabContainer);
                    //pane.startup();

                    display.tabContainer.selectChild(pane);
                }
            });

            display.selectedLayerMenu.addChild(itm);

            display.treeWidget.watch("selectedItem", function (attr, oldVal, newVal) {
                var plugins = store.getValue(newVal, "plugins");
                itm.set("disabled", !(plugins && store.getValue(plugins, identity)));
            });

            var identifyTool = new Identify({display: display});
            display.addTool(identifyTool);
        }
    });
});