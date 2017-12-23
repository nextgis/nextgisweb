/* global console */
define([
    "dojo/_base/declare",
    "./_PluginBase",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/Deferred",
    "dijit/layout/TabContainer",
    "dijit/Menu",
    "dijit/MenuItem",
    "dojo/dom-style",
    "dojo/request/xhr",
    "dojo/request/script",
    "dojo/topic",
    "openlayers/ol",
    "ngw-pyramid/i18n!webmap",
    "ngw-feature-layer/FeatureStore",
    "ngw-feature-layer/FeatureGrid",
    "dijit/form/Button",
    "dijit/form/TextBox",
    "dijit/ToolbarSeparator",
    "dijit/popup",
    "put-selector/put",
    "ngw/route"
], function (
    declare,
    _PluginBase,
    lang,
    array,
    Deferred,
    TabContainer,
    Menu,
    MenuItem,
    domStyle,
    xhr,
    script,
    topic,
    ol,
    i18n,
    FeatureStore,
    FeatureGrid,
    Button,
    TextBox,
    ToolbarSeparator,
    popup,
    put,
    route
) {

    var Pane = declare([FeatureGrid], {
        closable: true,
        gutters: false,
        iconClass: "iconTable",

        postCreate: function () {
            this.inherited(arguments);

            var widget = this;

            this.btnZoomToFeature = new Button({
                label: i18n.gettext("Go to"),
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
                if (newVal) {
                    xhr.get(route.feature_layer.feature.item({
                        id: widget.layerId,
                        fid: newVal.id
                    }), {
                        handleAs: "json"
                    }).then(
                        function (feature) {
                            topic.publish("feature.highlight", {geom: feature.geom});
                        }
                    );
                }
            });
        },

        zoomToFeature: function () {
            var display = this.plugin.display;

            xhr.get(route.feature_layer.store.item({id: this.layerId, feature_id: this.get("selectedRow").id}), {
                handleAs: "json",
                headers: { "X-Feature-Box": true }
            }).then(
                function data(featuredata) {
                    display.map.olMap.getView().fit(featuredata.box);
                    display.tabContainer.selectChild(display.mainPane);
                }
            );
        }

    });

    return declare([_PluginBase], {

        constructor: function (options) {
            var plugin = this;

            this.menuItem = new MenuItem({
                label: i18n.gettext("Feature table"),
                iconClass: "iconTable",
                disabled: true,
                onClick: function () {
                    plugin.openFeatureGrid();
                }
            });

            this.tabContainer = new TabContainer({
                region: "bottom",
                style: "height: 45%",
                splitter: true
            });

            var store = this.itemStore,
                menuItem = this.menuItem;

            this.display.watch("item", function (attr, oldVal, newVal) {
                var itemConfig = plugin.display.get("itemConfig");
                menuItem.set("disabled", !(itemConfig.type == "layer" && itemConfig.plugin[plugin.identity]));
            });

           // this.tool = new Identify({display: this.display});
       },

        postCreate: function () {
            if (this.display.layersPanel && this.display.layersPanel.contentWidget.itemMenu) {
                this.display.layersPanel.contentWidget.itemMenu.addChild(this.menuItem);
            }

            // var mapStates = MapStatesObserver.getInstance();
            // mapStates.addState('identifying', this.tool);
            // mapStates.setDefaultState('identifying', true);
        },

        openFeatureGrid: function () {
            var item = this.display.dumpItem(),
                data = this.display.get('itemConfig').plugin[this.identity];

            var pane = new Pane({
                title: item.label,
                layerId: item.layerId,
                likeSearch: data.likeSearch,
                plugin: this,
                onClose: lang.hitch(this, function () {
                    if (this.tabContainer.getChildren().length == 1) {
                        this.display.mapContainer.removeChild(this.tabContainer);
                    }
                    return true;
                })
            });

            if (!this.tabContainer.getChildren().length) {
                this.display.mapContainer.addChild(this.tabContainer);
            }

            this.tabContainer.addChild(pane);
            this.tabContainer.selectChild(pane);
        }
    });
});
