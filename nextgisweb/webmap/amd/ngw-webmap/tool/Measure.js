/*global define, require*/
define([
    "dojo/_base/declare",
    "./Base",
    "dojo/request/xhr",
    "dojo/number",
    "dijit/popup",
    "dojo/_base/lang",
    "dijit/TooltipDialog",
    "openlayers/ol",
    "ngw/route",
    "@nextgisweb/pyramid/settings!",
    "@nextgisweb/pyramid/i18n!"
], function (
    declare,
    Base,
    xhr,
    number,
    popup,
    lang,
    TooltipDialog,
    ol,
    route,
    settings,
    i18n
) {
    var GEOM_LENGTH_URL = route.spatial_ref_sys.geom_length;
    var GEOM_AREA_URL = route.spatial_ref_sys.geom_area;
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

            var SI_m = i18n.gettext('m'),
                SI_km = i18n.gettext('km'),
                SI_ft = i18n.gettext('ft'),
                SI_mi = i18n.gettext('mi'),
                SI_ha = i18n.gettext('ha'),
                SI_ac = i18n.gettext('ac');

            function formatUnits (value, is_area) {
                var label, measure, suffix, places;

                label = is_area ? "S" : "L";

                var m_to_km = 1E-3,
                    m_to_ft = 1 / 0.3048,
                    ft_to_mi = 1 / 5280,
                    m2_to_ha = 1E-4,
                    m2_to_ac = 1 / 4046.86,
                    ac_to_mi2 = 1 / 640;

                if (is_area) {
                    switch (settings.units_area) {
                        case "sq_km":
                            measure = value * m_to_km**2;
                            suffix = SI_km + "<sup>2</sup>";
                            break;
                        case "metric":
                            if (value > 1E5) {
                                measure = value * m_to_km**2;
                                suffix = SI_km + "<sup>2</sup>";
                            } else {
                                measure = value;
                                suffix = SI_m + "<sup>2</sup>";
                            };
                            break;
                        case "ha":
                            measure = value * m2_to_ha;
                            suffix = SI_ha;
                            break;
                        case "ac":
                            measure = value * m2_to_ac;
                            suffix = SI_ac;
                            break;
                        case "sq_mi":
                            measure = value * m2_to_ac * ac_to_mi2;
                            suffix = SI_mi + "<sup>2</sup>";
                            break;
                        case "imperial":
                            value = value * m2_to_ac;
                            if (value > (640 * 100)) {
                                measure = value * ac_to_mi2;
                                suffix = SI_mi + "<sup>2</sup>";
                            } else {
                                measure = value;
                                suffix = SI_ac;
                            };
                            break;
                        case "sq_ft":
                            measure = value * m_to_ft**2;
                            suffix = SI_ft + "<sup>2</sup>";
                            break;
                        case "sq_m":
                        default:
                            measure = value;
                            suffix = SI_m + "<sup>2</sup>";
                    }
                } else {
                    switch (settings.units_length) {
                        case "km":
                            measure = value * m_to_km;
                            suffix = SI_km;
                            break;
                        case "metric":
                            if (value > 1000) {
                                measure = value * m_to_km;
                                suffix = SI_km;
                            } else {
                                measure = value;
                                suffix = SI_m;
                            };
                            break;
                        case "ft":
                            measure = value * m_to_ft;
                            suffix = SI_ft;
                            break;
                        case "mi":
                            measure = value * m_to_ft * ft_to_mi;
                            suffix = SI_mi;
                            break;
                        case "imperial":
                            value = value * m_to_ft;
                            if (value > 5280) {
                                measure = value * ft_to_mi;
                                suffix = SI_mi;
                            } else {
                                measure = value;
                                suffix = SI_ft;
                            };
                            break;
                        case "m":
                        default:
                            measure = value;
                            suffix = SI_m;
                    }
                }
                if (measure < 1) {
                    places = Math.floor(-Math.log10(measure)) + 4;
                } else {
                    places = 2;
                }
                return [
                    label,
                    "=",
                    number.format(measure, {places: places,locale: dojoConfig.locale}),
                    suffix
                ].join(' ');
            }

            var style = new ol.style.Style({
                fill: new ol.style.Fill({
                    color: 'rgba(7, 109, 191, .2)'
                }),
                stroke: new ol.style.Stroke({
                    color: getComputedStyle(document.documentElement).getPropertyValue('--primary'),
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

            function isValid (geom) {
                if (geom instanceof ol.geom.Polygon) {
                    return geom.getLinearRing(0).getCoordinates().length > 3;
                } else if (geom instanceof ol.geom.LineString) {
                    return geom.getCoordinates().length > 1;
                }
                return true;
            }

            var units = settings.units;
            var mapProj = tool.display.map.olMap.getView().getProjection();
            var mapSRID = mapProj.getCode().match(/EPSG\:(\d+)/)[1];

            var listener;
            var DELAY = 200; // milliseconds
            var id_request, id_actuality = 0;
            this.interaction.on("drawstart", lang.hitch(this, function(evt) {
                this.vector.getSource().clear();
                var now, diff, prev = -Infinity;
                var timeoutID;
                listener = evt.feature.getGeometry().on("change", function(evt) {
                    tool.tooltip.set("content", "...");

                    var geom = evt.target;
                    if (!isValid(geom)) {
                        return;
                    }

                    var is_area = geom instanceof ol.geom.Polygon;
                    var measure_url = is_area ? GEOM_AREA_URL : GEOM_LENGTH_URL;

                    function requestMeasure () {
                        id_request = id_actuality;
                        xhr(measure_url({id: settings.measurement_srid}), {
                            method: "POST",
                            data: JSON.stringify({
                                geom: new ol.format.WKT().writeGeometry(geom),
                                srs: mapSRID
                            }),
                            headers: {'Content-Type': 'application/json'},
                            handleAs: "json"
                        }).then(function (data) {
                            if (id_request === id_actuality) {
                                var output = formatUnits(data.value, is_area);
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
                        timeoutID = window.setTimeout(requestMeasure, DELAY-diff);
                    }
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
