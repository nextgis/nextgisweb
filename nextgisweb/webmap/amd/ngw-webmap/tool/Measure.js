define([
    "dojo/_base/declare",
    "./Base",
    "dojo/request/xhr",
    "dijit/popup",
    "dojo/_base/lang",
    "dijit/TooltipDialog",
    "openlayers/ol",
    "ngw-pyramid/route",
    "@nextgisweb/pyramid/settings!",
    "@nextgisweb/pyramid/i18n!",
    "@nextgisweb/webmap/utils",
    "@nextgisweb/webmap/icon",
], function (
    declare,
    Base,
    xhr,
    popup,
    lang,
    TooltipDialog,
    ol,
    route,
    settings,
    i18n,
    utils,
    icon
) {
    var GEOM_LENGTH_URL = route.spatial_ref_sys.geom_length;
    var GEOM_AREA_URL = route.spatial_ref_sys.geom_area;

    return declare(Base, {
        constructor: function () {
            var tool = this;

            if (this.type == "LineString") {
                this.label = i18n.gettext("Measure distance");
                this.customIcon =
                    '<span class="ol-control__icon"><svg class="icon" fill="currentColor"><use xlink:href="#' +
                    icon.MeasureDistance.id +
                    '"/></svg></span>';
            } else if (this.type == "Polygon") {
                this.label = i18n.gettext("Measure area");
                this.customIcon =
                    '<span class="ol-control__icon"><svg class="icon" fill="currentColor"><use xlink:href="#' +
                    icon.MeasureArea.id +
                    '"/></svg></span>';
            }

            function formatUnits(value, is_area) {
                const label = is_area ? "S" : "L";

                const formatConfig = {
                    format: "html-string",
                    locale: dojoConfig.locale,
                };

                const formattedMeasure = is_area
                    ? utils.formatMetersArea(
                        value,
                        settings.units_area,
                        formatConfig
                    )
                    : utils.formatMetersLength(
                        value,
                        settings.units_length,
                        formatConfig
                    );

                return `${label} = ${formattedMeasure}`;
            }

            var style = new ol.style.Style({
                fill: new ol.style.Fill({
                    color: "rgba(7, 109, 191, .2)",
                }),
                stroke: new ol.style.Stroke({
                    color: getComputedStyle(
                        document.documentElement
                    ).getPropertyValue("--primary"),
                    width: 2,
                }),
                image: new ol.style.Circle({
                    radius: 0,
                }),
            });
            var source = new ol.source.Vector();
            this.vector = new ol.layer.Vector({
                source: source,
                style: style,
            });
            this.display.map.olMap.addLayer(this.vector);

            this.interaction = new ol.interaction.Draw({
                source: source,
                type: this.type,
                style: style,
            });
            this.display.map.olMap.addInteraction(this.interaction);
            this.interaction.setActive(false);

            const maxZIndex = this.display.map.getMaxZIndex();
            this.vector.setZIndex(maxZIndex + 1);

            function isValid(geom) {
                if (geom instanceof ol.geom.Polygon) {
                    return geom.getLinearRing(0).getCoordinates().length > 3;
                } else if (geom instanceof ol.geom.LineString) {
                    return geom.getCoordinates().length > 1;
                }
                return true;
            }

            var mapProj = tool.display.map.olMap.getView().getProjection();
            var mapSRID = parseInt(
                mapProj.getCode().match(/EPSG\:(\d+)/)[1],
                10
            );

            var listener;
            var DELAY = 200; // milliseconds
            var id_request,
                id_actuality = 0;
            this.interaction.on(
                "drawstart",
                lang.hitch(this, function (evt) {
                    this.vector.getSource().clear();
                    var now,
                        diff,
                        prev = -Infinity;
                    var timeoutID;
                    listener = evt.feature
                        .getGeometry()
                        .on("change", function (evt) {
                            tool.tooltip.set("content", "...");

                            var geom = evt.target;
                            if (!isValid(geom)) {
                                return;
                            }

                            var is_area = geom instanceof ol.geom.Polygon;
                            var measure_url = is_area
                                ? GEOM_AREA_URL
                                : GEOM_LENGTH_URL;

                            function requestMeasure() {
                                id_request = id_actuality;
                                xhr(
                                    measure_url({
                                        id: settings.measurement_srid,
                                    }),
                                    {
                                        method: "POST",
                                        data: JSON.stringify({
                                            geom: new ol.format.GeoJSON().writeGeometryObject(
                                                geom,
                                                {
                                                    rightHanded: true,
                                                }
                                            ),
                                            geom_format: "geojson",
                                            srs: mapSRID,
                                        }),
                                        headers: {
                                            "Content-Type": "application/json",
                                        },
                                        handleAs: "json",
                                    }
                                ).then(function (data) {
                                    if (id_request === id_actuality) {
                                        var output = formatUnits(
                                            data.value,
                                            is_area
                                        );
                                        tool.tooltip.set("content", output);
                                    }
                                });
                            }

                            if (timeoutID) {
                                window.clearTimeout(timeoutID);
                                timeoutID = null;
                            }

                            now = Date.now();
                            diff = now - prev;
                            prev = now;
                            id_actuality++;
                            if (diff > DELAY) {
                                requestMeasure();
                            } else {
                                timeoutID = window.setTimeout(
                                    requestMeasure,
                                    DELAY - diff
                                );
                            }
                        });
                })
            );

            this.interaction.on(
                "drawend",
                lang.hitch(this, function () {
                    ol.Observable.unByKey(listener);
                })
            );

            // Tooltip for results
            this.tooltip = new TooltipDialog();

            this.active = false;
        },

        activate: function () {
            if (this.active) {
                return;
            }
            this.active = true;

            this.interaction.setActive(true);

            this.tooltip.set(
                "content",
                i18n.gettext("Double click to finish.")
            );

            popup.open({
                popup: this.tooltip,
                around: this.toolbarBtn.domNode,
            });
        },

        deactivate: function () {
            if (!this.active) {
                return;
            }
            this.active = false;

            this.vector.getSource().clear();
            this.interaction.setActive(false);
            popup.close(this.tooltip);
        },
    });
});
