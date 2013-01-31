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
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dijit/layout/StackContainer",
    "dijit/layout/StackController",
    "dijit/form/Select",
    "ngw/openlayers",
    "ngw/openlayers/Popup",
    "feature_layer/FieldsDisplayWidget",
    "ngw/settings!feature_layer",
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
    BorderContainer,
    ContentPane,
    StackContainer,
    StackController,
    Select,
    openlayers,
    Popup,
    FieldsDisplayWidget,
    settings
) {

    var Control = OpenLayers.Class(OpenLayers.Control, {
       initialize: function(options) {
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
                    this.selectOptions.push({
                        label: feature.label,
                        value: layerId + "/" + idx
                    });
                    idx ++;
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

            this.fieldsWidget = new FieldsDisplayWidget({
                style: "padding: 2px;"
            });
            this.container.addChild(this.fieldsWidget);

            // создаем виждеты для всех расширений IFeatureLayer
            this._extWidgets = {};
            var deferreds = [this._startupDeferred];
            var widget = this;
            array.forEach(Object.keys(settings.extensions), function (key) {
                var ext = settings.extensions[key];
                
                var deferred = new Deferred();
                deferreds.push(deferred);

                require([ext.displayWidget], function (cls) {
                    var extWidget = new cls({
                        style: "padding: 2px;"
                    });
                    widget.container.addChild(extWidget);
                    widget._extWidgets[key] = extWidget;
                    deferred.resolve(widget);
                });
            }, this);

            this._widgetsDeferred = all(deferreds);
        },

        startup: function () {
            this.inherited(arguments);

            var widget = this;
            this.select.watch("value", function (attr, oldVal, newVal) {
                widget._displayFeature(widget._featureResponse(newVal));
            });

            this._displayFeature(this._featureResponse(this.select.get("value")));
        },

        _featureResponse: function(selectValue) {
            var keys = selectValue.split("/");
            return this.response[keys[0]].features[keys[1]];
        },

        _displayFeature: function (feature) {
            var widget = this;

            xhr.get(ngwConfig.applicationUrl + "/layer/" + feature.layerId + "/store_api/" + feature.id, {
                handleAs: "json",
                headers: { "X-Feature-Ext": "*" }
            }).then(function (feature) {
                widget._widgetsDeferred.then(function () {
                    widget.fieldsWidget.set("feature", feature);
                    for (var ident in widget._extWidgets) {
                        widget._extWidgets[ident].set("feature", feature);
                    };
                }).then(null, function (error) { console.error(error) });
            });
        }

    });

    return declare(Base, {
        label: "Идентификация",

        // Радиус для поиска объектов в пикселях
        pixelRadius: 2,

        // Ширина popup
        popupWidth: 300,

        // Высота popup,
        popupHeight: 200,

        constructor: function (options) {
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
                if (items.length == 0) {
                    // Никаких видимых элементов сейчас нет
                    console.log("Visible items not found!");
                } else {
                    // Добавляем список видимых элементов в запрос
                    request.layers = array.map(items, function (i) {
                        return this.display.itemStore.getValue(i, "layerId")
                    });

                    // XHR-запрос к сервису
                    xhr.post(ngwConfig.applicationUrl + '/feature_layer/identify', {
                        handleAs: "json",
                        data: json.stringify(request)
                    }).then(function (response) {
                        tool._responsePopup(response, point);
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
                this.map.olMap.removePopup(this._popup);
                this._popup = null;
            };
        },

        _responsePopup: function (response, point) {
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
                tool: this
            });

            widget.placeAt(this._popup.contentDiv).startup();

            this.map.olMap.addPopup(this._popup);
            widget.resize();
            widget.select.resize();
        },

    });
});