define([
    "dojo/_base/declare",
    "./_PluginBase",
    "dojo/request/xhr",
    "ngw/route",
    "@nextgisweb/gui/react-app",
    "@nextgisweb/webmap/layers-dropdown",
    "@nextgisweb/pyramid/i18n!",
    "openlayers/ol"
], function (
    declare,
    _PluginBase,
    xhr,
    route,
    reactApp,
    LayersDropdownComp,
    i18n,
    ol
) {
    return declare([_PluginBase], {
        postCreate: function () {
            if (!this.display.layersPanel && !this.display.layersPanel.titleNode) {
                return;
            }

            const titleNode = this.display.layersPanel.titleNode;
            const span = document.createElement("span");
            span.style.margin = "0 0 0 5px";
            span.style.cursor = "pointer";
            titleNode.appendChild(span);
            
            const onClick = (key) => {
                if (key === "zoomToAllLayers") {
                    this.zoomToAllLayers();
                }
            };

            reactApp.default(
                LayersDropdownComp.default,
                {
                    onClick: onClick
                },
                span
            );
        },

        zoomToAllLayers: function () {
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
            });
        }
    });
});
