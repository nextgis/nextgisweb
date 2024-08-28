define([
    "dojo/_base/declare",
    "dojo/io-query",
    "./Adapter",
    "@nextgisweb/pyramid/api",
    "@nextgisweb/pyramid/util",
    "ngw-webmap/ol/layer/Image",
], function (declare, ioQuery, Adapter, api, util, Image) {
    return declare(Adapter, {
        createLayer: function (item) {
            const queue = util.imageQueue;

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
                        const url = src.split("?")[0];
                        const query = src.split("?")[1];
                        const queryObject = ioQuery.queryToObject(query);

                        const resource = queryObject["resource"];
                        const symbolsParam = queryObject["symbols"];
                        const symbols = symbolsParam
                            ? `&symbols[${resource}]=${symbolsParam === "-1" ? "" : symbolsParam}`
                            : "";

                        const img = image.getImage();

                        const newSrc =
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
                            symbols;
                        // Use a timeout to prevent the queue from aborting right after adding, especially in cases with zoomToExtent.
                        setTimeout(() => {
                            queue.add(({ signal }) =>
                                util
                                    .tileLoadFunction({
                                        src: newSrc,
                                        cache: "no-cache",
                                        signal,
                                    })
                                    .then((imageUrl) => {
                                        img.src = imageUrl;
                                    })
                            );
                        });
                    },
                }
            );

            return layer;
        },
    });
});
