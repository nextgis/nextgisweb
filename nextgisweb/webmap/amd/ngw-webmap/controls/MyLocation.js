define([
    "dojo/_base/declare",
    "dojo/on",
    "dojo/dom-construct",
    "@nextgisweb/pyramid/i18n!",
    "openlayers/ol",
], function (declare, on, domConstruct, i18n, ol) {
    const zIndexLocationLayer = 6000;
    const positionFeatureStyle = new ol.style.Style({
        image: new ol.style.Circle({
            radius: 6,
            fill: new ol.style.Fill({
                color: "#076dbf",
            }),
            stroke: new ol.style.Stroke({
                color: "#fff",
                width: 1,
            }),
        }),
    });

    return declare(ol.control.Control, {
        display: undefined,

        element: undefined,
        target: undefined,
        tipLabel: undefined,

        geolocation: undefined,
        geolocationLayer: undefined,
        positionFeature: undefined,
        accuracyFeature: undefined,

        constructor: function (options) {
            this.inherited(arguments);
            declare.safeMixin(this, options);

            this.element = domConstruct.create("div", {
                class: "ol-control ol-unselectable",
                innerHTML:
                    "<button><span class='ol-control__icon material-icons'>my_location</span></button>",
                title: this.tipLabel,
            });

            if (
                !("geolocation" in navigator) ||
                location.protocol !== "https:"
            ) {
                this.element.style.visibility = "hidden";
            }

            on(this.element, "click", () => this._onClick());

            ol.control.Control.call(this, {
                element: this.element,
                target: this.target,
            });
        },

        _shouldZoom: false,
        _onClick: function () {
            if (this.geolocation) {
                this._zoomToPosition();
            } else {
                this._shouldZoom = true;
                this._buildGeolocationLayer();
                this._makeGeolocation();
            }
        },

        _makeGeolocation: function () {
            this.geolocation = new ol.Geolocation({
                trackingOptions: {
                    enableHighAccuracy: true,
                },
                projection: this.display.map.olMap.getView().getProjection(),
                tracking: true,
            });

            this.geolocation.on("change:accuracyGeometry", () =>
                this._onGeolocationGeometryChange()
            );
            this.geolocation.on("change:position", () =>
                this._onGeolocationPosChange()
            );
            this.geolocation.on("error", () => this._onGeolocationError());
        },

        _buildGeolocationLayer: function () {
            this.positionFeature = new ol.Feature();
            this.positionFeature.setStyle(positionFeatureStyle);
            this.accuracyFeature = new ol.Feature();

            this.geolocationLayer = new ol.layer.Vector({
                map: this.display.map.olMap,
                source: new ol.source.Vector({
                    features: [this.accuracyFeature, this.positionFeature],
                }),
            });
            this.geolocationLayer.setZIndex(zIndexLocationLayer);
        },

        _onGeolocationGeometryChange: function () {
            this.accuracyFeature.setGeometry(
                this.geolocation.getAccuracyGeometry()
            );
        },

        _onGeolocationPosChange: function () {
            const coordinates = this.geolocation.getPosition();
            this.positionFeature.setGeometry(
                coordinates ? new ol.geom.Point(coordinates) : null
            );

            if (this._shouldZoom) {
                this._shouldZoom = false;
                this._zoomToPosition();
            }
        },

        _onGeolocationError: function () {
            this.element.classList.add("error");
            this.element.setAttribute(
                "title",
                i18n.gettext("Your location could not be determined")
            );
        },

        _zoomToPosition: function () {
            if (!this.positionFeature || !this.positionFeature.getGeometry())
                return;
            const extent = this.positionFeature.getGeometry().getExtent();
            this.display.map.zoomToExtent(extent);
        },
    });
});
