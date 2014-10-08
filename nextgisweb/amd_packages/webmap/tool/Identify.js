/*global console, OpenLayers*/
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
    "dojo/on",
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dijit/layout/StackContainer",
    "dijit/layout/StackController",
    "dijit/form/Select",
    "dijit/form/Button",
    "put-selector/put",
    "ngw/route",
    "ngw/openlayers",
    "ngw/openlayers/Popup",
    "feature_layer/FieldsDisplayWidget",
    // settings
    "ngw/settings!feature_layer",
    "ngw/settings!webmap",
    // css
    "xstyle/css!./resources/Identify.css"
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
    on,
    BorderContainer,
    ContentPane,
    StackContainer,
    StackController,
    Select,
    Button,
    put,
    route,
    openlayers,
    Popup,
    FieldsDisplayWidget,
    featureLayersettings,
    webmapSettings
) {

    var Control = OpenLayers.Class(OpenLayers.Control, {
        initialize: function (options) {
            OpenLayers.Control.prototype.initialize.apply(this, [options]);

            this.handler = new OpenLayers.Handler.Click(this, {
                click: this.clickCallback
            });
        },

        clickCallback: function (evt) {
            this.tool.execute([evt.xy.x, evt.xy.y]);
        }
    });

    var Widget = declare([BorderContainer], {
        style: "width: 100%; height: 100%",
        gutters: false,

        postCreate: function () {
            this.inherited(arguments);

            this.selectOptions = [];

            array.forEach(Object.keys(this.response), function (layerId) {
                var layerResponse = this.response[layerId];
                var idx = 0;
                array.forEach(layerResponse.features, function (feature) {
                    var label = put("div[style=\"overflow: hidden; display: inline-block; text-align: left;\"] $ span[style=\"color: gray\"] $ <", feature.label, " (" + this.layerLabels[layerId] + ")");
                    domStyle.set(label, "width", (this.popupSize[0] - 35) + "px");
                    this.selectOptions.push({
                        label: label.outerHTML,
                        value: layerId + "/" + idx
                    });
                    idx++;
                }, this);
            }, this);

            this.selectPane = new ContentPane({
                region: "top",
                layoutPriority: 1,
                style: "padding: 0px 4px;"
            });
            this.addChild(this.selectPane);

            this.select = new Select({
                style: "width: 100%",
                options: this.selectOptions
            }).placeAt(this.selectPane);

            this.container = new StackContainer({
                region: "center"
            });
            this.addChild(this.container);


            this.controller = new StackController({
                region: "top",
                layoutPriority: 2,
                containerId: this.container.id
            });
            domClass.add(this.controller.domNode, "ngwWebmapToolIdentify-controller");
            this.addChild(this.controller);

            this._extWidgets = {};

            if (featureLayersettings.identify.attributes) {
                this._extWidgets["feature_layer/FieldsDisplayWidget"] = new FieldsDisplayWidget({style: "padding: 2px;"});
                this.container.addChild(this._extWidgets["feature_layer/FieldsDisplayWidget"]);
            }

            // создаем виждеты для всех расширений IFeatureLayer
            var deferreds = [this._startupDeferred];
            var widget = this;
            array.forEach(Object.keys(featureLayersettings.extensions), function (key) {
                var ext = featureLayersettings.extensions[key];

                var deferred = new Deferred();
                deferreds.push(deferred);

                require([ext.displayWidget], function (Cls) {
                    var extWidget = new Cls({
                        style: "padding: 2px;"
                    });
                    widget.container.addChild(extWidget);
                    widget._extWidgets[key] = extWidget;
                    deferred.resolve(widget);
                });
            }, this);

            this._widgetsDeferred = all(deferreds);

            this._widgetsDeferred.then(function () {
                // Если не дождаться пока все панели будут добавлены,
                // то новая кнопка будет в случайном месте.
                widget.editButton = new Button({
                    iconClass: "dijitIconEdit",
                    showLabel: true,
                    onClick: function () {
                        // TODO: Пока открываем в новом окне, сделать вкладку
                        var feature = widget._featureResponse(widget.select.get("value"));
                        window.open(route("feature_layer.feature.edit", {
                            id: feature.layerId,
                            feature_id: feature.id
                        }));
                    }
                }).placeAt(widget.controller, "last");
            });
        },

        startup: function () {
            this.inherited(arguments);

            var widget = this;
            this.select.watch("value", function (attr, oldVal, newVal) {
                widget._displayFeature(widget._featureResponse(newVal));
            });

            this._displayFeature(this._featureResponse(this.select.get("value")));
        },

        _featureResponse: function (selectValue) {
            var keys = selectValue.split("/");
            return this.response[keys[0]].features[keys[1]];
        },

        _displayFeature: function (feature) {
            var widget = this;

            xhr.get(route("feature_layer.store.item", {id: feature.layerId, feature_id: feature.id}), {
                handleAs: "json",
                headers: { "X-Feature-Ext": "*" }
            }).then(function (feature) {
                widget._widgetsDeferred.then(function () {
                    var selected = false;
                    array.forEach(Object.keys(widget._extWidgets), function (ident) {
                        widget._extWidgets[ident].set("feature", feature);

                        if (!selected && !widget._extWidgets[ident].get("disabled")) {
                            widget.container.selectChild(widget._extWidgets[ident]);
                            selected = true;
                        }
                    }, this);
                }).then(null, function (error) { console.error(error); });
            });
        }

    });

    return declare(Base, {
        label: "Идентификация",
        iconClass: "iconIdentify",

        // Радиус для поиска объектов в пикселях
        pixelRadius: webmapSettings.identify_radius,

        // Ширина popup
        popupWidth: webmapSettings.popup_width,

        // Высота popup,
        popupHeight: webmapSettings.popup_height,

        constructor: function () {
            this.map = this.display.map;

            this.control = new Control({tool: this});
            this.display.map.olMap.addControl(this.control);
        },

        activate: function () {
            this.control.activate();
        },

        deactivate: function () {
            this.control.deactivate();

            if (this.popup) {
                this.display.map.olMap.removePopup(this.popup);
                this.popup = null;
            }
        },

        execute: function (pixel) {
            var tool = this,
                olMap = this.display.map.olMap,
                point = olMap.getLonLatFromPixel(new OpenLayers.Pixel(pixel[0], pixel[1]));

            var request = {
                srs: 3857,
                geom: this._requestGeomString(pixel)
            };

            this.display.getVisibleItems().then(function (items) {
                if (items.length === 0) {
                    // Никаких видимых элементов сейчас нет
                    console.log("Visible items not found!");
                } else {
                    // Добавляем список видимых элементов в запрос
                    request.layers = array.map(items, function (i) {
                        return this.display.itemStore.getValue(i, "layerId");
                    });

                    var layerLabels = {};
                    array.forEach(items, function (i) {
                        layerLabels[this.display.itemStore.getValue(i, "layerId")] = this.display.itemStore.getValue(i, "label");
                    }, this);

                    // XHR-запрос к сервису
                    xhr.post(route("feature_layer.identify"), {
                        handleAs: "json",
                        data: json.stringify(request)
                    }).then(function (response) {
                        tool._responsePopup(response, point, layerLabels);
                    });
                }
            });

        },

        // WKT-строка геометрии поиска объектов для точки pixel
        _requestGeomString: function (pixel) {
            var olMap = this.map.olMap,
                bounds = new openlayers.Bounds();

            bounds.extend(olMap.getLonLatFromPixel({x: pixel[0] - this.pixelRadius, y: pixel[1] - this.pixelRadius}));
            bounds.extend(olMap.getLonLatFromPixel({x: pixel[0] + this.pixelRadius, y: pixel[1] + this.pixelRadius}));

            return bounds.toGeometry().toString();
        },

        _removePopup: function () {
            if (this._popup) {
                this._popup.widget.select.closeDropDown(true);
                this._popup.widget.destroyRecursive();
                this.map.olMap.removePopup(this._popup);
                this._popup = null;
            }
        },

        _responsePopup: function (response, point, layerLabels) {
            // TODO: Проверить, есть ли какой-нибудь результат
            // и показывать popup только если он есть.

            this._removePopup();

            this._popup = new Popup({
                title: "Идентификация",
                point: point,
                size: [this.popupWidth, this.popupHeight]
            });

            var widget = new Widget({
                response: response,
                tool: this,
                layerLabels: layerLabels,
                popupSize: [this.popupWidth, this.popupHeight]
            });
            this._popup.widget = widget;

            widget.placeAt(this._popup.contentDiv).startup();

            this.map.olMap.addPopup(this._popup);
            widget.resize();

            // Обработчик закрытия
            on(this._popup._closeSpan, "click", lang.hitch(this, function () {
                this._removePopup();
            }));
        }

    });
});