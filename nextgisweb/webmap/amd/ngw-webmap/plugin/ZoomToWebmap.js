define([
    "dojo/_base/declare", "./_PluginBase",
    "dojo/request/xhr", "ngw-pyramid/route",
    "@nextgisweb/gui/react-app", "@nextgisweb/webmap/layers-dropdown"
], function (
    declare, _PluginBase,
    xhr, route,
    reactApp, LayersDropdownComp
) {
    return declare([_PluginBase], {
        postCreate: function () {
            if (!this.display.layersPanel || !this.display.layersPanel.titleNode) {
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
                { onClick },
                span
            );
        },

        zoomToAllLayers: function () {
            const webmapId = this.display.config.webmapId;

            xhr.get(route.webmap.extent({id: webmapId}), {
                handleAs: "json"
            }).then(extent => {
                if (!extent) {
                    return;
                }
                this.display.map.zoomToNgwExtent(extent, this.display.displayProjection);
            });
        }
    });
});
