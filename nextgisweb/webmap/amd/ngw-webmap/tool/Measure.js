/*global define, require*/
define([
    "dojo/_base/declare",
    "./Base",
    "dojo/number",
    "dijit/popup",
    "dojo/_base/lang",
    "dijit/TooltipDialog",
    "openlayers/ol",
    "ngw-pyramid/i18n!webmap"
], function (
    declare,
    Base,
    number,
    popup,
    lang,
    TooltipDialog,
    ol,
    i18n
) {
    return declare(Base, {
        constructor: function (options) {
            var tool = this;

            if (this.type == "LineString") {
                this.label = i18n.gettext("Measure distance");
                this.customIcon = '<svg class="ol-control__icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 612 612" style="width:20px;height:20px"><path d="M606.924 144.053L467.944 5.074c-6.765-6.765-17.728-6.765-24.489 0l-38.001 38.001 69.49 69.494c6.763 6.761 6.769 17.726 0 24.489l-24.489 24.489c-6.765 6.769-17.728 6.769-24.493 0L356.47 92.059l-61.228 61.23 69.494 69.49c6.761 6.761 6.761 17.728 0 24.493l-24.493 24.489c-6.765 6.769-17.728 6.765-24.489.004l-69.495-69.492-61.228 61.227 69.492 69.492c6.761 6.765 6.765 17.728 0 24.489l-24.495 24.493c-6.761 6.769-17.728 6.765-24.491 0l-69.49-69.49L5.075 443.454c-6.765 6.761-6.765 17.728 0 24.491l138.983 138.983c6.761 6.763 17.728 6.763 24.491 0l438.374-438.382c6.766-6.759 6.77-17.727.001-24.493zm-428.97 405.708c-11.5 11.504-30.15 11.504-41.656 0-11.5-11.504-11.5-30.15.004-41.657 11.5-11.5 30.152-11.5 41.652 0 11.503 11.507 11.503 30.153 0 41.657z"/></svg>';
            } else if (this.type == "Polygon") {
                this.label = i18n.gettext("Measure area");
                this.customIcon = '<svg class="ol-control__icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 326.534 326.535" style="width:18px;height:18px"><path d="M326.533 38.375a38.369 38.369 0 00-23.688-35.451 38.37 38.37 0 00-41.816 8.317l-20.065 20.066 14.577 14.577a8.25 8.25 0 01-11.667 11.667l-14.577-14.577-37.83 37.831 14.576 14.577a8.248 8.248 0 010 11.667 8.25 8.25 0 01-11.667 0L179.8 92.473l-37.831 37.83 14.577 14.576a8.25 8.25 0 01-11.667 11.667l-14.577-14.577-37.83 37.83 14.576 14.577a8.25 8.25 0 010 11.667 8.25 8.25 0 01-11.667 0l-14.577-14.577-37.83 37.831 14.576 14.576a8.25 8.25 0 01-11.667 11.667l-14.576-14.576-20.066 20.066a38.372 38.372 0 0027.133 65.503l249.788-.001a38.377 38.377 0 0027.134-11.238 38.377 38.377 0 0011.239-27.133l-.002-249.786zM249.789 249.79l-118.778.002 118.779-118.78-.001 118.778z"/></svg>';
            }

            var formatLength = function(line, units) {
                var output;
                var length = 0;
                var coordinates = line.getCoordinates();
                var sourceProj = tool.display.map.olMap.getView().getProjection();
                for (var i = 0, ii = coordinates.length - 1; i < ii; ++i) {
                    var c1 = ol.proj.transform(coordinates[i], sourceProj, "EPSG:4326");
                    var c2 = ol.proj.transform(coordinates[i + 1], sourceProj, "EPSG:4326");
                    length += ol.sphere.getDistance(c1, c2);
                }

                if ((units === "metric") || (units === null)) {
                    output = (length > 100) ? {
                        measure: Math.round(length / 1000 * 100) / 100,
                        suffix: "km"
                    } : {
                        measure: Math.round(length * 100) / 100,
                        suffix: "m"
                    };
                } else if (units === "imperial") {
                    length = length * (1 / 0.3048); // feets
                    output = (length > 5280) ? {
                        measure: Math.round(length / 5280 * 100) / 100,
                        suffix: "mi"
                    } : {
                        measure: Math.round(length * 100) / 100,
                        suffix: "ft"
                    };
                }

                output.label = "L = ";
                return output;
            };

            var formatArea = function(polygon, units) {
                var output;
                var sourceProj = tool.display.map.olMap.getView().getProjection();
                var area = Math.abs(ol.sphere.getArea(polygon, {projection: sourceProj}));

                if ((units === "metric") || (units === null)) {
                    output = (area > 10000) ? {
                        measure: Math.round(area / 1000000 * 100) / 100,
                        suffix: "km<sup>2</sup>"
                    } : {
                        measure: Math.round(area * 100) / 100,
                        suffix: "m<sup>2</sup>"
                    };
                } else if (units === "imperial") {
                    area = area * (1 / 4046.86);
                    output = (area > (640 * 100)) ? {
                        measure: Math.round(area / 640 * 100) / 100,
                        suffix: "mi<sup>2</sup>"
                    } : {
                        measure: Math.round(area * 100) / 100,
                        suffix: "ac"
                    };
                }

                output.label = "S = ";
                return output;
            };

            var style = new ol.style.Style({
                fill: new ol.style.Fill({
                    color: 'rgba(7, 109, 191, .2)'
                }),
                stroke: new ol.style.Stroke({
                    color: '#076dbf',
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
            var units = this.display.config.measurementSystem;
            this.interaction.on("drawstart", lang.hitch(this, function(evt) {
                this.vector.getSource().clear();
                listener = evt.feature.getGeometry().on("change", function(evt) {
                    var geom = evt.target;
                    var output;
                    if (geom instanceof ol.geom.Polygon) {
                        output = formatArea(geom, units);
                    } else if (geom instanceof ol.geom.LineString) {
                        output = formatLength(geom, units);
                    }

                    tool.tooltip.set("content",
                        output.label
                        + number.format(output.measure) + " "
                        + output.suffix
                    );
                });
            }));

            this.interaction.on("drawend", function(evt) {
                ol.Observable.unByKey(listener);
            });

            // Tooltip for results
            this.tooltip = new TooltipDialog();

            this.active = false;
        },

        activate: function () {
            if (this.active) { return; }
            this.active = true;

            this.interaction.setActive(true);

            this.tooltip.set("content", i18n.gettext("Double click to finish."));
            
            popup.open({
                popup: this.tooltip,
                around: this.toolbarBtn.domNode
            });
        },

        deactivate: function () {
            if (!this.active) { return; }
            this.active = false;

            this.vector.getSource().clear();
            this.interaction.setActive(false);
            popup.close(this.tooltip);
        }

    });
});
