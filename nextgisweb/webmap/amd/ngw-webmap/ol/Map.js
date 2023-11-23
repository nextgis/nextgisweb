define(["dojo/_base/declare", "dojo/Stateful", "openlayers/ol"], function (
    declare,
    Stateful,
    ol
) {
    return declare([Stateful], {
        DPI: 1000 / 39.37 / 0.28,

        IPM: 39.37,

        // limit extent to applying smart zoom
        SMART_ZOOM_EXTENT: 100,

        SMART_ZOOM: 12,

        constructor: function (options) {
            this.olMap = new ol.Map(options);

            this.layers = {};
            var widget = this,
                olMap = this.olMap,
                olView = this.olMap.getView();

            olView.on("change:resolution", function () {
                widget.set("resolution", olView.getResolution());
            });

            olView.on("change:center", function () {
                widget.set("center", olView.getCenter());
            });

            olMap.on("moveend", function () {
                widget.set("position", widget.getPosition(), this);
            });
        },

        addLayer: function (layer) {
            this.layers[layer.name] = layer;
            this.olMap.addLayer(layer.olLayer);
        },

        removeLayer: function (layer) {
            this.olMap.removeLayer(layer.olLayer);
            delete this.layers[layer.name];
        },

        getScaleForResolution: function (res, mpu) {
            return parseFloat(res) * (mpu * this.IPM * this.DPI);
        },

        getResolutionForScale: function (scale, mpu) {
            return parseFloat(scale) / (mpu * this.IPM * this.DPI);
        },

        getPosition: function (crs) {
            var view = this.olMap.getView();
            var center = view.getCenter();
            var mapCrs = view.getProjection().getCode();
            if (crs && crs !== mapCrs) {
                center = ol.proj.transform(center, mapCrs, crs);
            }
            return {
                zoom: view.getZoom(),
                center: center,
            };
        },

        getExtent: function (crs) {
            var view = this.olMap.getView();
            var extent = view.calculateExtent();
            var mapCrs = view.getProjection().getCode();
            if (crs && crs !== mapCrs) {
                extent = ol.proj.transformExtent(extent, mapCrs, crs);
            }
            return extent;
        },

        zoomToFeature: function (feature) {
            var geometry = feature.getGeometry(),
                extent = geometry.getExtent();

            this.zoomToExtent(extent);
        },

        zoomToExtent: function (extent) {
            var view = this.olMap.getView(),
                widthExtent = ol.extent.getWidth(extent),
                heightExtent = ol.extent.getHeight(extent),
                center;

            // If feature extent smaller than SMART_ZOOM_EXTENT then applying smart zoom to it
            if (
                widthExtent < this.SMART_ZOOM_EXTENT &&
                heightExtent < this.SMART_ZOOM_EXTENT
            ) {
                center = ol.extent.getCenter(extent);
                view.setCenter(center);
                if (view.getZoom() < this.SMART_ZOOM) {
                    view.setZoom(this.SMART_ZOOM);
                }
            } else {
                view.fit(extent);
            }
        },

        zoomToNgwExtent: function (ngwExtent, displayProjection) {
            const { minLon, minLat, maxLon, maxLat } = ngwExtent;
            if (
                minLon === null ||
                minLat === null ||
                maxLon === null ||
                maxLat === null
            ) {
                return;
            }

            if (!displayProjection) {
                displayProjection = "EPSG:3857";
            }
            const extent = ol.proj.transformExtent(
                [minLon, minLat, maxLon, maxLat],
                "EPSG:4326",
                displayProjection
            );
            this.zoomToExtent(extent);
        },
    });
});
