define([
    "dojo/_base/declare",
    "dojo/io-query",
    "./Adapter",
    "@nextgisweb/pyramid/api",
    "ngw-webmap/ol/layer/Image",
], function (declare, ioQuery, Adapter, api, Image) {
    const getLayerZoom = (l) => l.olLayer.getMapInternal().getView().getZoom();

    return declare(Adapter, {
        createLayer: function (item) {
            let imagesLoading = [];

            const abortLoading = function () {
                imagesLoading.forEach((img) => {
                    img.src = "";
                });
                imagesLoading = [];
            };

            const layer = new Image(
                item.id,
                {
                    maxResolution: item.maxResolution
                        ? item.maxResolution
                        : undefined,
                    minResolution: item.minResolution
                        ? item.minResolution
                        : undefined,
                    visible: item.visibility,
                    opacity: item.transparency
                        ? 1 - item.transparency / 100
                        : 1.0,
                },
                {
                    url: api.routeURL("render.image"),
                    params: {
                        resource: item.styleId,
                    },
                    ratio: 1,
                    crossOrigin: "anonymous",
                    imageLoadFunction: function (image, src) {
                        abortLoading();
                        const url = src.split("?")[0];
                        const query = src.split("?")[1];
                        const queryObject = ioQuery.queryToObject(query);

                        const resource = queryObject["resource"];
                        const symbolsParam = queryObject["symbols"];
                        const symbols = symbolsParam
                            ? `&symbols[${resource}]=${symbolsParam === "-1" ? "" : symbolsParam}`
                            : "";

                        const img = image.getImage();

                        img.src =
                            url +
                            "?resource=" +
                            resource +
                            "&extent=" +
                            queryObject["BBOX"] +
                            "&size=" +
                            queryObject["WIDTH"] +
                            "," +
                            queryObject["HEIGHT"] +
                            "&nd=204" +
                            symbols +
                            "#" +
                            Date.now(); // in-memory cache busting

                        imagesLoading.push(img);
                        img._zoom = getLayerZoom(layer);
                        img.onload = () => {
                            imagesLoading = imagesLoading.filter(
                                (loadedImg) => loadedImg !== img
                            );
                        };
                    },
                }
            );

            return layer;
        },
    });
});
