define([
    "dojo/_base/declare",
    "./Base",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/Deferred",
    "dojo/promise/all",
    "dojo/json",
    "dojo/request/xhr",
    "dojo/topic",
    "dijit/_WidgetBase",
    "ngw-pyramid/route",
    "openlayers/ol",
    "@nextgisweb/pyramid/api",
    "@nextgisweb/pyramid/i18n!",
    // settings
    "@nextgisweb/pyramid/settings!",
    // css
    "xstyle/css!./resources/Identify.css",
    // TODO: Without preload tabs don't load
    "@nextgisweb/feature-layer/feature-editor",
], function (
    declare,
    Base,
    lang,
    array,
    Deferred,
    all,
    json,
    xhr,
    topic,
    _WidgetBase,
    route,
    ol,
    api,
    i18n,
    webmapSettings
) {
    const wkt = new ol.format.WKT();

    var Control = function (options) {
        this.tool = options.tool;
        ol.interaction.Interaction.call(this, {
            handleEvent: Control.prototype.handleClickEvent,
        });
    };

    Control.prototype = Object.create(ol.interaction.Interaction.prototype);
    Control.prototype.constructor = Control;

    Control.prototype.handleClickEvent = function (evt) {
        if (evt.type === "singleclick") {
            this.tool.execute(evt.pixel);
            evt.preventDefault();
        }
        return true;
    };

    return declare(Base, {
        label: i18n.gettext("Identify"),
        iconClass: "iconIdentify",

        pixelRadius: webmapSettings.identify_radius,

        constructor: function () {
            this.map = this.display.map;
            this.control = new Control({ tool: this });
            this.control.setActive(false);
            this.display.map.olMap.addInteraction(this.control);

            this._bindEvents();
        },

        _bindEvents: function () {
            topic.subscribe(
                "webmap/tool/identify/on",
                lang.hitch(this, function () {
                    this.activate();
                })
            );

            topic.subscribe(
                "webmap/tool/identify/off",
                lang.hitch(this, function () {
                    this.deactivate();
                })
            );
        },

        activate: function () {
            this.control.setActive(true);
        },

        deactivate: function () {
            this.control.setActive(false);
        },
        execute: function (pixel) {
            var tool = this,
                olMap = this.display.map.olMap,
                point = olMap.getCoordinateFromPixel(pixel);

            var request = {
                srs: 3857,
                geom: this._requestGeomString(pixel),
                layers: [],
            };

            this.display.getVisibleItems().then(
                lang.hitch(this, function (items) {
                    var mapResolution = this.display.map.get("resolution");
                    array.forEach(
                        items,
                        function (i) {
                            var item =
                                this.display._itemConfigById[
                                    this.display.itemStore.getValue(i, "id")
                                ];
                            if (
                                !item.identifiable ||
                                mapResolution >= item.maxResolution ||
                                mapResolution < item.minResolution
                            ) {
                                return;
                            }
                            request.layers.push(item.layerId);
                        },
                        this
                    );

                    var layerLabels = {};
                    array.forEach(
                        items,
                        function (i) {
                            layerLabels[
                                this.display.itemStore.getValue(i, "layerId")
                            ] = this.display.itemStore.getValue(i, "label");
                        },
                        this
                    );

                    xhr.post(route.feature_layer.identify(), {
                        handleAs: "json",
                        data: json.stringify(request),
                        headers: {
                            "Content-Type": "application/json",
                        },
                    }).then(function (response) {
                        tool.openIdentifyPanel(response, point, layerLabels);
                    });
                })
            );
        },

        // Build WKT geometry for identification at given pixel
        _requestGeomString: function (pixel) {
            var olMap = this.map.olMap,
                bounds;

            bounds = ol.extent.boundingExtent([
                olMap.getCoordinateFromPixel([
                    pixel[0] - this.pixelRadius,
                    pixel[1] - this.pixelRadius,
                ]),
                olMap.getCoordinateFromPixel([
                    pixel[0] + this.pixelRadius,
                    pixel[1] + this.pixelRadius,
                ]),
            ]);

            return new ol.format.WKT().writeGeometry(
                ol.geom.Polygon.fromExtent(bounds)
            );
        },

        openIdentifyPanel: function (response, point, layerLabels) {
            if (response.featureCount === 0) {
                topic.publish("feature.unhighlight");
            }

            const identifyInfo = {
                point,
                response,
                layerLabels,
            };

            const pm = this.display.panelsManager;
            const pkey = "identify";
            let panel = pm.getPanel(pkey);
            if (panel) {
                if (panel.app) {
                    panel.app.update({ identifyInfo });
                } else {
                    panel.props = { identifyInfo };
                }
            } else {
                throw new Error(
                    "Identification panel should add during Display initialization"
                );
            }
            const activePanel = pm.getActivePanelName();
            if (activePanel !== pkey) {
                pm.activatePanel(pkey);
            }
        },

        identifyFeatureByAttrValue: function (
            layerId,
            attrName,
            attrValue,
            zoom
        ) {
            const identifyDeferred = new Deferred();
            const urlGetLayerInfo = api.routeURL("resource.item", {
                id: layerId,
            });
            const getLayerInfo = xhr.get(urlGetLayerInfo, {
                handleAs: "json",
            });

            const query = {
                limit: 1,
            };
            query[`fld_${attrName}__eq`] = attrValue;

            const getFeaturesUrl = api.routeURL(
                "feature_layer.feature.collection",
                { id: layerId }
            );
            const getFeatures = xhr.get(getFeaturesUrl, {
                handleAs: "json",
                query,
            });

            all([getLayerInfo, getFeatures]).then((results) => {
                const [layerInfo, features] = results;
                if (features.length !== 1) {
                    identifyDeferred.resolve(false);
                    return false;
                }
                const foundFeature = features[0];

                const layerId = layerInfo.resource.id;

                const identifyResponse = {
                    featureCount: 1,
                };
                identifyResponse[layerId] = {
                    featureCount: 1,
                    features: [
                        {
                            fields: foundFeature.fields,
                            id: foundFeature.id,
                            label: "",
                            layerId,
                        },
                    ],
                };

                const geometry = wkt.readGeometry(foundFeature.geom);
                const extent = geometry.getExtent();
                const center = ol.extent.getCenter(extent);

                const layerLabel = {};
                layerLabel[layerId] = layerInfo.resource.display_name;

                this.openIdentifyPanel(identifyResponse, center, layerLabel);
                if (zoom) {
                    const view = this.map.olMap.getView();
                    view.setCenter(center);
                    view.setZoom(zoom);
                } else {
                    this.map.zoomToExtent(extent);
                }
                identifyDeferred.resolve(true);
            });

            return identifyDeferred.promise;
        },
    });
});
