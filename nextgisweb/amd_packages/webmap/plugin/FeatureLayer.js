/*global define, ngwConfig*/
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
        gutters: false,
        iconClass: "iconTable",

        postCreate: function () {
            this.inherited(arguments);

            var widget = this;

            this.btnZoomToFeature = new Button({
                label: "Перейти",
                iconClass: "iconArrowInOut",
                disabled: true,
                onClick: function () {
                    widget.zoomToFeature();
                }
            });
            this.toolbar.addChild(this.btnZoomToFeature);

            // При изменении выделенной строки изменяем доступность кнопок
            this.watch("selectedRow", function (attr, oldVal, newVal) {
                widget.btnZoomToFeature.set("disabled", newVal === null);
            });
        },

        zoomToFeature: function () {
            var display = this.plugin.display;

            xhr.get(ngwConfig.applicationUrl + '/layer/' + this.layerId + '/store_api/' + this.get("selectedRow").id, {
                handleAs: 'json',
                headers: { 'X-Feature-Box': true }
            }).then(
                function data(featuredata) {
                    display.map.olMap.zoomToExtent(featuredata.box);
                    display.tabContainer.selectChild(display.mainPane);
                }
            );
        }

    });

    return declare([_PluginBase], {

        constructor: function (options) {
            var plugin = this;

            this.menuItem = new MenuItem({
                label: "Таблица объектов",
                iconClass: "iconTable",
                disabled: true,
                onClick: function () {
                    plugin.openFeatureGrid();
                }
            });

            var store = this.itemStore,
                menuItem = this.menuItem;

            this.display.watch("item", function (attr, oldVal, newVal) {
                var type = store.getValue(newVal, "type");
                menuItem.set("disabled", type !== "layer");
            });


            this.tool = new Identify({display: this.display});
        },

        postCreate: function () {
            this.display.itemMenu.addChild(this.menuItem);
            this.display.addTool(this.tool);
        },

        openFeatureGrid: function () {
            var item = this.display.dumpItem(),
                data = this.display.get('itemConfig').plugin[this.identity];

            var pane = new Pane({
                title: item.label,
                tooltip: "Таблица объектов слоя \"" + item.label + "\"",
                layerId: item.layerId,
                likeSearch: data.likeSearch,
                plugin: this
            });

            console.log(data);

            this.display.tabContainer.addChild(pane);
            this.display.tabContainer.selectChild(pane);
        }
    });
});