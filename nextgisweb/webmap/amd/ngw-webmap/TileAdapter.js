define([
    "dojo/_base/declare",
    "./Adapter",
    "@nextgisweb/pyramid/api",
    "ngw-webmap/ol/layer/XYZ",
], function (declare, Adapter, api, XYZ) {
    return declare(Adapter, {
        createLayer: function (item) {
            let tilesLoading = {};

            const getZoom = (l) => {
                const map = l.olLayer.getMapInternal();
                const view = map.getView();
                return view.getZoom();
            };

            const abortLoading = function ({ ignoreZoom }) {
                Object.keys(tilesLoading).forEach((key) => {
                    const img = tilesLoading[key];
                    if (img && img._zoom !== ignoreZoom) {
                        tilesLoading[key].src = "";
                        delete tilesLoading[key];
                    }
                });
            };

            const layer = new XYZ(
                item.id,
                {
                    visible: item.visibility,
                    maxResolution: item.maxResolution
                        ? item.maxResolution
                        : undefined,
                    minResolution: item.minResolution
                        ? item.minResolution
                        : undefined,
                    opacity: item.transparency
                        ? 1 - item.transparency / 100
                        : 1.0,
                },
                {
                    url:
                        api.routeURL("render.tile") +
                        "?z={z}&x={x}&y={y}" +
                        "&resource=" +
                        item.styleId +
                        "&nd=204",
                    crossOrigin: "anonymous",
                    tileLoadFunction: function (tile, src) {
                        let zoom = getZoom(layer);

                        const [z, x, y] = tile.getTileCoord();
                        const tileKey = [z, x, y].join("-");
                        const img = tile.getImage();

                        img._zoom = z;

                        abortLoading({ ignoreZoom: zoom });

                        img.src = src;
                        tilesLoading[tileKey] = img;

                        img.onload = img.onerror = function () {
                            delete tilesLoading[tileKey];
                        };
                    },
                }
            );

            return layer;
        },
    });
});
