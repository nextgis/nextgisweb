define([
    "dojo/_base/declare",
    "./_PluginBase",
    "dojo/request/xhr",
    "dijit/MenuItem",
    "ngw/route",
    "@nextgisweb/pyramid/i18n!",
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
            this.menuItem = new MenuItem({
                label: i18n.gettext("Zoom to all layers"),
                iconClass: "iconArrowInOut",
                disabled: false,
                onClick: () => {
                    this.zoomToAllLayers();
                },
                order: 5
            });
        },

        postCreate: function () {
            this.addToLayersMenu();
        },

        zoomToAllLayers: function () {
            this.menuItem.set("disabled", true);
            const webmapId = this.display.config.webmapId;

            xhr.get(route.webmap.extent({id: webmapId}), {
                handleAs: "json"
            }).then(extentData => {
                const extent = [
                    extentData.minLon, extentData.minLat,
                    extentData.maxLon, extentData.maxLat
                ];
                const mapExtent = ol.proj.transformExtent(extent,
                    this.display.lonlatProjection,
                    this.display.displayProjection);
                this.display.map.olMap.getView().fit(mapExtent);
                this.menuItem.set("disabled", false);
            });
        }
    });
});
