define([
    "dojo/_base/declare",
    "./Adapter",
    "@nextgisweb/pyramid/api",
    "@nextgisweb/pyramid/util",
    "ngw-webmap/ol/layer/XYZ",
], function (declare, Adapter, api, util, XYZ) {
    return declare(Adapter, {
        createLayer: function (item) {
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
                    tileLoadFunction: function (image, src) {
                        const img = image.getImage();
                        const abortController = new AbortController();

                        util.tileLoadFunction({
                            src,
                            signal: abortController.signal,
                            cache: "force-cache",
                        }).then((imageUrl) => {
                            img.src = imageUrl;
                        });
                    },
                }
            );

            return layer;
        },
    });
});
