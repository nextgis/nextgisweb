define([
    "dojo/_base/declare",
    "./_PluginBase",
    "dojo/request/xhr",
    "dijit/MenuItem",
    "ngw/route",
    "ngw-pyramid/i18n!webmap",
    "openlayers/ol"
], function (
    declare,
    _PluginBase,
    xhr,
    MenuItem,
    route,
    i18n,
    ol
) {
    return declare([_PluginBase], {

        constructor: function () {
            var plugin = this;

            this.menuItem = new MenuItem({
                label: i18n.gettext("Zoom to layer"),
                iconClass: "iconShapeSquare",
                disabled: true,
                onClick: function () {
                    plugin.zoomToLayer();
                }
            });

            this.display.watch("item", function (attr, oldVal, newVal) {
                var itemConfig = plugin.display.get("itemConfig");
                plugin.menuItem.set("disabled", !(itemConfig.type == "layer" &&
                    itemConfig.plugin[plugin.identity]));
            });
        },

        postCreate: function () {
            if (this.display.layersPanel && this.display.layersPanel.contentWidget.itemMenu) {
                this.display.layersPanel.contentWidget.itemMenu.addChild(this.menuItem);
            }
        },

        zoomToLayer: function () {
            var plugin = this,
                item = this.display.dumpItem();

            xhr.get(route.layer.extent({id: item.layerId}), {
                handleAs: "json"
            }).then(function (data) {
                var extent = data.extent;
                plugin.display.map.olMap.getView().fit(
                    ol.proj.transformExtent([
                        extent.minLon, extent.minLat,
                        extent.maxLon, extent.maxLat
                    ],
                    plugin.display.lonlatProjection,
                    plugin.display.displayProjection));
            });
        }
    });
});
