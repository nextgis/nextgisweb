define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/json",
    "ngw-webmap/plugin/_PluginBase",
    "openlayers/ol",
], function (declare, array, lang, json, _PluginBase, ol) {
    const a = 6378137;
    const b = 6356752.3142;
    const e = Math.sqrt(1 - (b * b) / (a * a));

    function toEPSG3395fromEPSG4326(input, output, dimension) {
        const length = input.length;
        dimension = dimension > 1 ? dimension : 2;

        if (output === undefined) {
            output = dimension > 2 ? input.slice() : new Array(length);
        }

        for (let i = 0; i < length; i += dimension) {
            output[i] = (a * (input[i] * Math.PI)) / 180;
            const phi = (input[i + 1] * Math.PI) / 180;
            const c = Math.pow(
                (1 - e * Math.sin(phi)) / (1 + e * Math.sin(phi)),
                e / 2
            );
            output[i + 1] = a * Math.log(Math.tan(Math.PI / 4 + phi / 2) * c);
        }

        return output;
    }

    function toEPSG3395fromEPSG3857(input, output, dimension) {
        const transform = ol.proj.getTransform("EPSG:3857", "EPSG:4326");
        const transformed = transform(input, output, dimension);
        return toEPSG3395fromEPSG4326(transformed, output, dimension);
    }

    return declare([_PluginBase], {
        constructor: function () {
            var wmplugin = this.display.config.webmapPlugin[this.identity];
            var settings = this.display.clientSettings;

            ol.proj.addProjection(
                new ol.proj.Projection({
                    code: "EPSG:3395",
                    units: "m",
                    extent: [
                        -20037508.342789244, -20037508.342789244,
                        20037508.342789244, 20037508.342789244,
                    ],
                    getPointResolution: function (resolution, point) {
                        return resolution / Math.cosh(point[1] / a);
                    },
                })
            );

            ol.proj.addCoordinateTransforms(
                "EPSG:3857",
                "EPSG:3395",
                toEPSG3395fromEPSG3857
            );

            if (wmplugin.basemaps.length) {
                settings.basemaps = [];

                array.forEach(wmplugin.basemaps, function (bm, idx) {
                    var opts = { "base": {}, "layer": {}, "source": {} },
                        qms,
                        copyright_text,
                        copyright_url;

                    opts.base.keyname = bm.keyname;
                    opts.layer.title = bm.display_name;

                    if (!bm.qms) {
                        opts.source.url = bm.url;
                        copyright_text = bm.copyright_text;
                        copyright_url = bm.copyright_url;
                    } else {
                        qms = json.parse(bm.qms);

                        if (qms.epsg !== 3857 && qms.epsg !== 3395) {
                            console.warn(
                                lang.replace(
                                    "CRS {epsg} is not supported, {name} layer.",
                                    {
                                        epsg: qms.epsg,
                                        name: bm.display_name,
                                    }
                                )
                            );
                            return;
                        }

                        copyright_text = qms.copyright_text;
                        copyright_url = qms.copyright_url;

                        opts.source = {
                            "url": qms.url,
                            "minZoom": qms.z_min ? qms.z_min : undefined,
                            "maxZoom": qms.z_max ? qms.z_max : undefined,
                            "projection": "EPSG:" + qms.epsg,
                        };

                        if (!qms.y_origin_top) {
                            opts.source.url = lang.replace(opts.source.url, {
                                "x": "{x}",
                                "y": "{-y}",
                                "z": "{z}",
                            });
                        }
                    }

                    if (opts.source.url.includes("{q}")) {
                        opts.base.mid = "ngw-webmap/ol/layer/QuadKey";
                    } else {
                        opts.base.mid = "ngw-webmap/ol/layer/XYZ";
                    }

                    if (copyright_text) {
                        opts.source.attributions = copyright_text;
                        if (copyright_url) {
                            opts.source.attributions =
                                '<a href="' +
                                copyright_url +
                                '">' +
                                opts.source.attributions +
                                "</a>";
                        }
                    }

                    opts.layer.opacity = bm.opacity ? bm.opacity : undefined;
                    opts.layer.visible = idx === 0 ? true : false;
                    opts.source.crossOrigin = "anonymous";

                    if (bm.enabled) {
                        settings.basemaps.push(opts);
                    }
                });

                settings.basemaps.push({
                    "base": {
                        "keyname": "blank",
                        "mid": "ngw-webmap/ol/layer/XYZ",
                    },
                    "layer": {
                        "title": "None",
                        "visible": settings.basemaps.length ? false : true,
                    },
                    source: {},
                });
            }
        },
    });
});
