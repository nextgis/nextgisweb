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
    "@nextgisweb/pyramid/i18n!",
    "@nextgisweb/webmap/icon"
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
    i18n,
    icon
) {
    console.log(icon)

    var GEOM_LENGTH_URL = route.spatial_ref_sys.geom_length;
    var GEOM_AREA_URL = route.spatial_ref_sys.geom_area;
    return declare(Base, {
        constructor: function (options) {
            var tool = this;

            if (this.type == "LineString") {
                this.label = i18n.gettext("Measure distance");
                this.customIcon = '<span class="ol-control__icon"><svg class="icon" fill="currentColor"><use xlink:href="#' + icon.MeasureDistance.id + '"/></svg></span>';
            } else if (this.type == "Polygon") {
                this.label = i18n.gettext("Measure area");
                this.customIcon = '<span class="ol-control__icon"><svg class="icon" fill="currentColor"><use xlink:href="#' + icon.MeasureArea.id + '"/></svg></span>';
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
                            measure = value * m_to_km * m_to_km;
                            suffix = SI_km + "<sup>2</sup>";
                            break;
                        case "metric":
                            if (value > 1E5) {
                                measure = value * m_to_km * m_to_km;
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
                            measure = value * m_to_ft * m_to_ft;
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

            var mapProj = tool.display.map.olMap.getView().getProjection();
            var mapSRID = parseInt(mapProj.getCode().match(/EPSG\:(\d+)/)[1], 10);

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
                                geom: new ol.format.GeoJSON().writeGeometryObject(geom, {
                                    rightHanded: true,
                                }),
                                geom_format: 'geojson',
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
