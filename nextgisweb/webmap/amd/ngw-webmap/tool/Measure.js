/*global define, require*/
define([
    "dojo/_base/declare",
    "./Base",
    "dojo/number",
    "dijit/popup",
    "dijit/TooltipDialog",
    "openlayers/ol",
    "ngw-pyramid/i18n!webmap"
], function (
    declare,
    Base,
    number,
    popup,
    TooltipDialog,
    ol,
    i18n
) {
    return declare(Base, {
        constructor: function (options) {
            if (this.type == "LineString") {
                this.label = i18n.gettext("Measure distance");
                this.iconClass = "iconRuler";
            } else if (this.type == "Polygon") {
                this.label = i18n.gettext("Measure area");
                this.iconClass = "iconRulerSquare";
            };

            var wgs84Sphere = new ol.Sphere(6378137);

            var formatLength = function(line) {
                var output;
                var length = 0;
                var coordinates = line.getCoordinates();
                var sourceProj = this.display.map.olMap.getView().getProjection();
                for (var i = 0, ii = coordinates.length - 1; i < ii; ++i) {
                    var c1 = ol.proj.transform(coordinates[i], sourceProj, "EPSG:4326");
                    var c2 = ol.proj.transform(coordinates[i + 1], sourceProj, "EPSG:4326");
                    length += wgs84Sphere.haversineDistance(c1, c2);
                }

                if (length > 100) {
                    output = {
                        measure: Math.round(length / 1000 * 100) / 100,
                        units: "km"
                    }
                } else {
                    output = {
                        measure: Math.round(length * 100) / 100,
                        units: "m"
                    }
                }
                output.label = "L = ";
                return output;
            };

            var formatArea = function(polygon) {
                var output;
                var sourceProj = this.display.map.olMap.getView().getProjection();
                var geom = polygon.clone().transform(sourceProj, "EPSG:4326");
                var coordinates = geom.getLinearRing(0).getCoordinates();
                var area = Math.abs(wgs84Sphere.geodesicArea(coordinates));

                if (area > 10000) {
                    output = {
                        measure: Math.round(area / 1000000 * 100) / 100,
                        units: "km<sup>2</sup>"
                    }
                } else {
                    output = {
                        measure: Math.round(area * 100) / 100,
                        units: "m<sup>2</sup>"
                    }
                }
                output.label = "S = ";
                return output;
            };

            var style = new ol.style.Style({
                fill: new ol.style.Fill({
                    color: 'rgba(221, 0, 0, 0.25)'
                }),
                stroke: new ol.style.Stroke({
                    color: '#d00',
                    width: 2
                }),
                image: new ol.style.Circle({
                    radius: 0
                })
            });
            var source = new ol.source.Vector();
            this.vector = new ol.layer.Vector({
                source: source,
                style: style
            });
            this.display.map.olMap.addLayer(this.vector);

            this.interaction = new ol.interaction.Draw({
                source: source,
                type: this.type,
                style: style
            });
            this.display.map.olMap.addInteraction(this.interaction);
            this.interaction.setActive(false);

            var listener;
            var widget = this;
            this.interaction.on("drawstart", function(evt) {
                this.vector.getSource().clear();
                listener = evt.feature.getGeometry().on("change", function(evt) {
                    var geom = evt.target;
                    var output;
                    if (geom instanceof ol.geom.Polygon) {
                        output = formatArea(geom);
                    } else if (geom instanceof ol.geom.LineString) {
                        output = formatLength(geom);
                    }

                    widget.tooltip.set("content",
                        output.label
                        + number.format(output.measure) + " "
                        + output.units
                    );
                });
            }, this);

            this.interaction.on("drawend", function(evt) {
                ol.Observable.unByKey(listener);
            });

            // Тултип для вывода результатов
            this.tooltip = new TooltipDialog();

            this.active = false;
        },

        activate: function () {
            if (this.active) { return };
            this.active = true;

            this.interaction.setActive(true);

            this.tooltip.set("content", i18n.gettext("Click adds point to measure, double click completes the measurement."));
            
            popup.open({
                popup: this.tooltip,
                around: this.toolbarBtn.domNode
            });
        },

        deactivate: function () {
            if (!this.active) { return };
            this.active = false;

            this.vector.getSource().clear();
            this.interaction.setActive(false);
            popup.close(this.tooltip);
        }

    });
});
