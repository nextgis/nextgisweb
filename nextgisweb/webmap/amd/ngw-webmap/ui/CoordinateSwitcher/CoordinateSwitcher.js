define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/dom-construct",
    "ngw-pyramid/i18n!webmap",
    "ngw-pyramid/hbs-i18n",
    "dojo/on",
    "dojo/dom-class",
    "put-selector/put",
    "dijit/form/Select",
    "openlayers/ol",
    "openlayers/proj4",
    "ngw-pyramid/utils/coordinateConverter",
    "ngw/route",
    "ngw/load-json!api/component/spatial_ref_sys/",
    "ngw/settings!pyramid",
    //templates
    "xstyle/css!./CoordinateSwitcher.css"
], function (
    declare,
    array,
    domConstruct,
    i18n,
    hbsI18n,
    on,
    domClass,
    put,
    Select,
    ol,
    proj4,
    CoordinateConverter,
    route,
    customCoordinateSystems,
    settingsPyramid
) {
    var degreeFormat = settingsPyramid.degree_format;
    if (customCoordinateSystems) {
        array.forEach(customCoordinateSystems, function (c) {
            c.projCode = (c.auth_name ? c.auth_name + ":" : "") + c.auth_srid;
            proj4.defs(c.projCode, c.wkt);
        });
    }

    return declare([Select], {
        point: undefined,
        coordinates: {},
        options: [],
        projections: {
            initial: undefined,
            lonlat: undefined
        },
        name: "coordinate-switcher",
        class: "coordinate-switcher",
        constructor: function(options){
            declare.safeMixin(this,options);
            if (customCoordinateSystems) {
                this._convertCoordinates();
                this._setOptions();
            } else {
                // for backward compatibility
                this._convertDefaultCoordinates();
                this._setDefaultOptions();
            }
        },
        buildRendering: function(){
            this.inherited(arguments);
            domClass.add(this.dropDown.domNode, "coordinate-switcher__dropdown");
        },
        _convertCoordinates: function(){
            var that = this;
            array.forEach(customCoordinateSystems, function(c) {
                var custom = proj4(that.projections.initial, c.wkt, that.point);
                that.coordinates[c.projCode] = [custom[0], custom[1]];
            })
        },
        _setOptions: function() {
            var that = this;
            that.options = [];
            array.forEach(customCoordinateSystems, function (c) {
                var code = c.projCode;
                var pr = proj4(c.projCode);
                var coord = that.coordinates[code];
                var x = coord[1];
                var y = coord[0];
                var pushOption = function (opt) {
                    var el = put(
                        "span span $ + span.ngwPopup__coordinates-srs-name $ <", 
                        opt.value, c.display_name);
                    that.options.push({
                        label: el.innerHTML,
                        value: opt.value,
                        format: opt.format,
                        selected: c.projCode === that.selectedFormat
                    });
                }
                if (pr.oProj.units == 'degree') {
                    var fx, fy;
                    if (degreeFormat == 'dd') {
                        fx = x.toFixed(6);
                        fy = y.toFixed(6);
                    } else if (degreeFormat == 'ddm') {
                        fx = CoordinateConverter.DDtoDM(x, { lon: false, needString: true });
                        fy = CoordinateConverter.DDtoDM(y, { lon: true, needString: true });
                    } else if (degreeFormat == 'dms') {
                        fx = CoordinateConverter.DDtoDMS(x, { lon: false, needString: true });
                        fy = CoordinateConverter.DDtoDMS(y, { lon: true, needString: true });
                    };
                    pushOption({
                        value: fx + ", " + fy,
                        format: code,
                    });
                } else {
                    pushOption({     
                        value: Math.round(x) + ", " + Math.round(y),
                        format: code,
                    });
                }
            });
        },
        // for backward compatibility
        _convertDefaultCoordinates: function(){
            var pointLonLat = ol.proj.transform(this.point, this.projections.initial, this.projections.lonlat),
                pointLatLon=[pointLonLat[1], pointLonLat[0]];

            this.coordinates={
                DD: [
                    Math.round(pointLatLon[0]*1000000)/1000000,
                    Math.round(pointLatLon[1]*1000000)/1000000
                ],
                DMS: [
                    CoordinateConverter.DDtoDMS(pointLatLon[0], {lon: false, needString: true}),
                    CoordinateConverter.DDtoDMS(pointLatLon[1], {lon: true, needString: true})
                ],
                DM: [
                    CoordinateConverter.DDtoDM(pointLatLon[0], {lon: false, needString: true}),
                    CoordinateConverter.DDtoDM(pointLatLon[1], {lon: true, needString: true})
                ],
                degrees: [
                    Math.round(pointLatLon[0]*1000000)/1000000 + "°",
                    Math.round(pointLatLon[1]*1000000)/1000000 + "°"
                ],
                meters: [
                    Math.round(this.point[1]),
                    Math.round(this.point[0])
                ]
            };
        },
        // for backward compatibility
        _setDefaultOptions: function(){
            this.options = [
                {
                    label: this.coordinates.DD[0] + ", " + this.coordinates.DD[1],
                    value: this.coordinates.DD[0] + ", " + this.coordinates.DD[1],
                    format: "DD",
                    selected: !this.selectedFormat || this.selectedFormat == "DD"
                },
                {
                    label: this.coordinates.DM[0] + ", " + this.coordinates.DM[1],
                    value: this.coordinates.DM[0] + ", " + this.coordinates.DM[1],
                    format: "DM",
                    selected: this.selectedFormat == "DM"
                },
                {
                    label: this.coordinates.DMS[0] + ", " + this.coordinates.DMS[1],
                    value: this.coordinates.DMS[0] + ", " + this.coordinates.DMS[1],
                    format: "DMS",
                    selected: this.selectedFormat == "DMS"
                },
                {
                    label: this.coordinates.meters[0] + ", " + this.coordinates.meters[1],
                    value: this.coordinates.meters[0] + ", " + this.coordinates.meters[1],
                    format: "meters",
                    selected: this.selectedFormat == "meters"
                }
            ];
        },
        postCreate: function(){
            this.inherited(arguments);
        }
    });
});