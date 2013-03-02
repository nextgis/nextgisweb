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
                onClick: function () {
                    widget.zoomToFeature();
                }
            });
            this.toolbar.addChild(this.btnZoomToFeature);

            // При изменении выделенной строки изменяем доступность кнопок
            this.watch("selectedRow", function (attr, oldVal, newVal) {
                widget.btnOpenFeatureTab.set("disabled", newVal === null);
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
        },

        openFeature: function () {
            // TODO: Пока открываем в новом окне, сделать вкладку
            window.open(
                ngwConfig.applicationUrl + "/layer/" + this.layerId
                    + "/feature/" + this.get("selectedRow").id + "/edit"
            );
        }
    });

    return declare([_PluginBase], {

        constructor: function (options) {
            var plugin = this;

            this.menuItem = new MenuItem({
                label: "Таблица объектов",
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
            var item = this.display.dumpItem();

            var pane = new Pane({
                title: item.label,
                tooltip: "Таблица объектов слоя \"" + item.label + "\"",
                layerId: item.layerId,
                plugin: this
            });

            this.display.tabContainer.addChild(pane);
            this.display.tabContainer.selectChild(pane);
        }
    });
});