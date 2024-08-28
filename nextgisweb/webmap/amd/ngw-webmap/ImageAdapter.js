define([
    "dojo/_base/declare",
    "dojo/io-query",
    "./Adapter",
    "@nextgisweb/pyramid/api",
    "@nextgisweb/pyramid/util",
    "ngw-webmap/ol/layer/Image",
], function (declare, ioQuery, Adapter, api, util, Image) {
    const transparentImage =
        "data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

    function tileLoadFunction({ src, signal }) {
        return fetch(src, {
            method: "GET",
            signal,
        })
            .then((response) => {
                if (response.ok) {
                    // return response.arrayBuffer();
                    return Promise.reject();
                } else {
                    return Promise.reject();
                }
            })
            .then((arrayBuffer) => {
                const blob = new Blob([arrayBuffer]);
                const urlCreator = window.URL || window.webkitURL;
                return urlCreator.createObjectURL(blob);
            })
            .catch(() => {
                return transparentImage;
            });
    }

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
                            symbols +
                            "#" +
                            Date.now(); // in-memory cache busting

                        const abortController = new AbortController();
                        // Use a timeout to prevent the queue from aborting right after adding, especially in cases with zoomToExtent.
                        setTimeout(() => {
                            queue.add(
                                () =>
                                    tileLoadFunction({
                                        src: newSrc,
                                        signal: abortController.signal,
                                    }).then((imageUrl) => {
                                        img.src = imageUrl;
                                    }),
                                () => {
                                    abortController.abort();
                                }
                            );
                        });
                    },
                }
            );

            return layer;
        },
    });
});
