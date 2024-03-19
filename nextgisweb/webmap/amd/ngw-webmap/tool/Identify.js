define([
    "dojo/_base/declare",
    "./Base",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/Deferred",
    "dojo/promise/all",
    "dojo/json",
    "dojo/request/xhr",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/on",
    "dojo/topic",
    "dijit/_WidgetBase",
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dijit/layout/StackContainer",
    "dijit/layout/StackController",
    "dijit/form/Select",
    "dijit/form/Button",
    "put-selector/put",
    "ngw-pyramid/route",
    "openlayers/ol",
    "ngw-webmap/ol/Popup",
    "@nextgisweb/pyramid/api",
    "@nextgisweb/pyramid/i18n!",
    "ngw-feature-layer/FieldsDisplayWidget",
    "ngw-feature-layer/GeometryInfoWidget",
    "ngw-webmap/ui/CoordinateSwitcher/CoordinateSwitcher",
    "ngw-pyramid/CopyButton/CopyButton",
    // settings
    "@nextgisweb/pyramid/settings!feature_layer",
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
    domClass,
    domStyle,
    domConstruct,
    on,
    topic,
    _WidgetBase,
    BorderContainer,
    ContentPane,
    StackContainer,
    StackController,
    Select,
    Button,
    put,
    route,
    ol,
    Popup,
    api,
    i18n,
    FieldsDisplayWidget,
    GeometryInfoWidget,
    CoordinateSwitcher,
    CopyButton,
    featureLayersettings,
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

    const openFeatureEditorTab = ({ resourceId, featureId, widget }) => {
        require(["@nextgisweb/feature-layer/feature-editor-modal"], (
            featureEditorModal
        ) => {
            featureEditorModal.showFeatureEditorModal({
                bodyStyle: { height: "100%" },
                editorOptions: {
                    featureId,
                    resourceId,
                    onSave: () => {
                        widget.reset();
                        topic.publish("feature.updated", {
                            resourceId,
                            featureId,
                        });
                    },
                },
            });
        });
    };

    var Widget = declare([BorderContainer], {
        style: "width: 100%; height: 100%",
        gutters: false,
        features: [],
        coordinates: undefined,
        postCreate: function () {
            this.inherited(arguments);

            this.selectOptions = [];

            var layersResponse = Object.keys(this.response);
            this.tool.display.itemStore.fetch({
                scope: this,
                queryOptions: { deep: true },
                query: { type: "layer" },
                onItem: function (item) {
                    var itemObj = this.tool.display.itemStore.dumpItem(item),
                        layerId = itemObj.layerId.toString(),
                        layerIdx = layersResponse.indexOf(layerId);

                    if (layerIdx > -1) {
                        var layerResponse = this.response[layerId];
                        var idx = 0;

                        array.forEach(
                            layerResponse.features,
                            function (feature) {
                                var label = put(
                                    'div[style="overflow: hidden; display: inline-block; text-align: left;"] $ span[style="color: gray"] $ <',
                                    feature.label,
                                    ` (${this.layerLabels[layerId]})`
                                );
                                feature.labelWithLayer = `${feature.label} (${this.layerLabels[layerId]})`;
                                domStyle.set(
                                    label,
                                    "width",
                                    this.popupSize[0] - 35 + "px"
                                );

                                this.selectOptions.push({
                                    label: label.outerHTML,
                                    value: layerId + "/" + idx,
                                });
                                idx++;
                            },
                            this
                        );
                        layersResponse.splice(layerIdx, 1);
                    }
                },
            });

            if (this.response.featureCount) {
                // render layer select
                this._displaySelectPane();

                // render feature container
                this.featureContainer = new BorderContainer({
                    region: "center",
                    gutters: false,
                    class: "ngwPopup__features",
                }).placeAt(this.domNode);
                setTimeout(lang.hitch(this, this.resize), 50);
                this._displayFeature(
                    this._featureResponse(this.select.get("value"))
                );
            }

            // Coordinates
            this._displayCoordinates();

            // Create widgets for each IFeatureLayer extension
            var deferreds = [];

            this.extWidgetClasses = {};

            array.forEach(
                Object.keys(featureLayersettings.extensions),
                function (key) {
                    var ext = featureLayersettings.extensions[key];

                    var deferred = new Deferred();
                    deferreds.push(deferred);

                    require([ext], lang.hitch(this, function (cls) {
                        this.extWidgetClasses[key] = cls;
                        deferred.resolve(this);
                    }));
                },
                this
            );

            this.extWidgetClassesDeferred = all(deferreds);
        },

        reset: function () {
            this.domNode.innerHTML = "";
            this.postCreate();
        },

        _displaySelectPane: function () {
            this.selectPane = new ContentPane({
                region: "top",
                layoutPriority: 1,
                style: "padding: 0 2px 0 1px",
            });

            this.addChild(this.selectPane);

            this.select = new Select({
                style: "width: 100%",
                options: this.selectOptions,
            }).placeAt(this.selectPane);

            this.select.watch(
                "value",
                lang.hitch(this, function (attr, oldVal, newVal) {
                    this._displayFeature(this._featureResponse(newVal));
                })
            );
        },
        _featureResponse: function (selectValue) {
            var keys = selectValue.split("/");
            return this.response[keys[0]].features[keys[1]];
        },
        _displayFeature: function (featureInfo) {
            var widget = this,
                lid = featureInfo.layerId,
                fid = featureInfo.id,
                iurl = route.feature_layer.feature.item({ id: lid, fid: fid });

            domConstruct.empty(widget.featureContainer.domNode);

            xhr.get(iurl, {
                method: "GET",
                handleAs: "json",
            }).then(function (feature) {
                widget.extWidgetClassesDeferred.then(function () {
                    widget.extContainer = new StackContainer({
                        region: "center",
                        style: "overflow-y: scroll",
                    });

                    widget.featureContainer.addChild(widget.extContainer);

                    widget.extController = new StackController({
                        region: "top",
                        layoutPriority: 2,
                        containerId: widget.extContainer.id,
                    });
                    domClass.add(
                        widget.extController.domNode,
                        "ngwWebmapToolIdentify-controller"
                    );

                    widget.featureContainer.addChild(widget.extController);

                    // Show feature attributes widget until it's not disabled by settings.
                    if (webmapSettings.identify_attributes) {
                        var fwidget = new FieldsDisplayWidget({
                            resourceId: lid,
                            featureId: fid,
                            compact: true,
                            title: i18n.gettext("Attributes"),
                        });

                        fwidget.renderValue(feature.fields);
                        fwidget.placeAt(widget.extContainer);
                    }

                    if (webmapSettings.show_geometry_info) {
                        var geometryWidget = new GeometryInfoWidget({
                            resourceId: lid,
                            featureId: fid,
                            compact: true,
                            title: i18n.gettext("Geometry"),
                        });
                        geometryWidget.renderValue(lid, fid);
                        geometryWidget.placeAt(widget.extContainer);
                    }

                    array.forEach(
                        Object.keys(widget.extWidgetClasses),
                        function (key) {
                            var cls = widget.extWidgetClasses[key],
                                ewidget = new cls({
                                    resourceId: lid,
                                    featureId: fid,
                                    compact: true,
                                });

                            if (
                                ewidget.renderValue(feature.extensions[key]) !==
                                false
                            ) {
                                ewidget.placeAt(widget.extContainer);
                            }
                        }
                    );

                    const display = widget.tool.display;
                    Object.values(display._itemConfigById).forEach((config) => {
                        if (
                            config.layerId !== lid ||
                            !widget._isEditEnabled(display, config)
                        ) {
                            return;
                        }

                        widget.editButton = new Button({
                            iconClass: "dijitIconEdit",
                            showLabel: true,
                            onClick: () =>
                                openFeatureEditorTab({
                                    resourceId: lid,
                                    featureId: fid,
                                    widget: widget,
                                }),
                        }).placeAt(widget.extController, "last");
                        domClass.add(widget.editButton.domNode, "no-label");
                    });

                    widget.resize();
                });

                topic.publish("feature.highlight", {
                    geom: feature.geom,
                    featureId: feature.id,
                    layerId: lid,
                    featureInfo: featureInfo,
                });
            });
        },

        _isEditEnabled: function (display, config) {
            const pluginName = "ngw-webmap/plugin/FeatureLayer";

            if (display.isTinyMode() && !display.isTinyModePlugin(pluginName)) {
                return false;
            }

            const configLayerPlugin = config.plugin[pluginName];
            const readOnly = configLayerPlugin.readonly;
            return !readOnly;
        },

        _displayCoordinates: function () {
            this.coordinatePane = new ContentPane({
                region: "bottom",
                class: "ngwPopup__coordinates",
            });
            this.addChild(this.coordinatePane);

            const coordSwitcher = new CoordinateSwitcher({
                point: this.coordinates,
            });
            coordSwitcher.placeAt(this.coordinatePane);
            coordSwitcher.startup();

            const coordCopy = new CopyButton({
                target: coordSwitcher,
                targetAttribute: coordSwitcher.formattedSelectedValue,
                class: "ngwPopup__coordinates-copy",
            });
            coordCopy.placeAt(this.coordinatePane, "first");

            on(coordSwitcher.dropDown.containerNode, "click", () => {
                coordCopy.copy();
            });
        },
    });

    return declare(Base, {
        label: i18n.gettext("Identify"),
        iconClass: "iconIdentify",

        pixelRadius: webmapSettings.identify_radius,
        popupWidth: webmapSettings.popup_width,
        popupHeight: webmapSettings.popup_height,

        constructor: function () {
            this.map = this.display.map;
            this.control = new Control({ tool: this });
            this.control.setActive(false);
            this.display.map.olMap.addInteraction(this.control);

            this._bindEvents();

            this._popup = new Popup({
                title: i18n.gettext("Identify"),
                size: [this.popupWidth, this.popupHeight],
            });
            this.display.map.olMap.addOverlay(this._popup);
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
            this._popup.setPosition(undefined);
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
                        tool._responsePopup(response, point, layerLabels);
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

        _responsePopup: function (
            response,
            point,
            layerLabels,
            afterPopupInit
        ) {
            if (response.featureCount === 0) {
                topic.publish("feature.unhighlight");
                domClass.add(
                    this._popup.contentDiv,
                    "ngwPopup__content--nofeature"
                );
            } else {
                domClass.remove(
                    this._popup.contentDiv,
                    "ngwPopup__content--nofeature"
                );
            }

            domConstruct.empty(this._popup.contentDiv);

            var widget = new Widget({
                response: response,
                tool: this,
                layerLabels: layerLabels,
                popupSize: [this.popupWidth, this.popupHeight],
                coordinates: point,
                displayProjection: this.display.displayProjection,
                lonlatProjection: this.display.lonlatProjection,
            });
            this._popup.widget = widget;

            widget.placeAt(this._popup.contentDiv);

            this._popup.setTitle(
                i18n.gettext("Features") + ": " + response.featureCount
            );
            this._popup.setPosition(point);
            if (afterPopupInit && afterPopupInit instanceof Function)
                afterPopupInit();

            this._popup._closeSpan.onclick = () => {
                this._popup.setPosition(undefined);
                topic.publish("feature.unhighlight");
            };
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

                this._responsePopup(
                    identifyResponse,
                    center,
                    layerLabel,
                    () => {
                        if (zoom) {
                            const view = this.map.olMap.getView();
                            view.setCenter(center);
                            view.setZoom(zoom);
                        } else {
                            this.map.zoomToExtent(extent);
                        }
                    }
                );
                identifyDeferred.resolve(true);
            });

            return identifyDeferred.promise;
        },
    });
});
