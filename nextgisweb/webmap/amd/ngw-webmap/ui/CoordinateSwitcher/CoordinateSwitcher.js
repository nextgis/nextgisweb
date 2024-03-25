define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/dom-class",
    "dojo/Deferred",
    "dijit/form/Select",
    "put-selector/put",
    "openlayers/ol",
    "ngw-pyramid/utils/coordinateConverter",
    "@nextgisweb/pyramid/api",
    "@nextgisweb/pyramid/api/load!api/component/spatial_ref_sys/",
    "@nextgisweb/pyramid/settings!",
    "xstyle/css!./CoordinateSwitcher.css",
], function (
    declare,
    array,
    domClass,
    Deferred,
    Select,
    put,
    ol,
    CoordinateConverter,
    api,
    spatialRefSysList,
    settings
) {
    const localStorageKey = "ng.coordinates.srs";
    const defaultSrs = "4326";
    const degreeFormatSetting = settings.degree_format;
    const wkt = new ol.format.WKT();

    const srsCoordinates = {};
    if (spatialRefSysList) {
        spatialRefSysList.forEach((srsInfo) => {
            srsCoordinates[srsInfo.id] = srsInfo;
        });
    }

    return declare([Select], {
        point: undefined,
        coordinates: {},
        options: [],
        name: "coordinate-switcher",
        class: "coordinate-switcher",

        constructor: function (options) {
            declare.safeMixin(this, options);

            this._transform().then((transformedCoord) => {
                this._setOptions(transformedCoord);
                this._bindEvents();
            });
        },

        formattedSelectedValue: function (that) {
            return that.options.find((o) => o.selected).formatValue;
        },

        postCreate: function () {
            this.inherited(arguments);
        },

        buildRendering: function () {
            this.inherited(arguments);
            domClass.add(
                this.dropDown.domNode,
                "coordinate-switcher__dropdown"
            );
        },

        _transform: function () {
            const deferred = new Deferred();
            api.route("spatial_ref_sys.geom_transform.batch")
                .post({
                    json: {
                        srs_from: 3857,
                        srs_to: Object.keys(srsCoordinates).map(Number),
                        geom: wkt.writeGeometry(new ol.geom.Point(this.point)),
                    },
                })
                .then((transformed) => {
                    const transformedCoord = {};
                    transformed.forEach((t) => {
                        const wktPoint = wkt.readGeometry(t.geom);
                        transformedCoord[t.srs_id] = wktPoint.getCoordinates();
                    });
                    deferred.resolve(transformedCoord);
                });
            return deferred.promise;
        },

        _buildOption: function (formatCoords, srsInfo) {
            const element = put(
                "span span $ + span.ngwPopup__coordinates-srs-name $ <",
                formatCoords,
                srsInfo.display_name
            );

            return {
                label: element.innerHTML,
                value: srsInfo.id,
                formatValue: formatCoords,
            };
        },

        _setOptions: function (transformedCoord) {
            this.options = [];
            array.forEach(Object.keys(transformedCoord), (srsId) => {
                const coord = transformedCoord[srsId];
                const srsInfo = srsCoordinates[srsId];
                const formatCoords = srsInfo.geographic
                    ? this._formatGeographicCoords(coord)
                    : this._formatNotGeographicCoords(coord);
                const option = this._buildOption(formatCoords, srsInfo);
                this.options.push(option);
            });

            this._setSelectedValue(transformedCoord);
        },

        _formatGeographicCoords: function (coordinates) {
            const [x, y] = coordinates;
            let fx, fy;
            if (degreeFormatSetting === "dd") {
                fx = x.toFixed(6);
                fy = y.toFixed(6);
            } else if (degreeFormatSetting === "ddm") {
                fx = CoordinateConverter.DDtoDM(x, {
                    lon: true,
                    needString: true,
                });
                fy = CoordinateConverter.DDtoDM(y, {
                    lon: false,
                    needString: true,
                });
            } else if (degreeFormatSetting === "dms") {
                fx = CoordinateConverter.DDtoDMS(x, {
                    lon: true,
                    needString: true,
                });
                fy = CoordinateConverter.DDtoDMS(y, {
                    lon: false,
                    needString: true,
                });
            }
            return `${fx}, ${fy}`;
        },

        _formatNotGeographicCoords: function (coordinates) {
            const [x, y] = coordinates;
            return `${Math.round(x)}, ${Math.round(y)}`;
        },

        _bindEvents: function () {
            this.on("change", (srsId) => {
                localStorage.setItem(localStorageKey, srsId);
            });
        },

        _setSelectedValue: function (transformedCoord) {
            const defaultSrsId = localStorage.getItem(localStorageKey);
            if (defaultSrsId && defaultSrsId in transformedCoord) {
                this.set("value", defaultSrsId);
            } else {
                localStorage.setItem(localStorageKey, defaultSrs);
                this.set("value", defaultSrsId);
            }
        },
    });
});
