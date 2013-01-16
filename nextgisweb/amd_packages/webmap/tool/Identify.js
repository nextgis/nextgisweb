define([
    "dojo/_base/declare",
    "./Base",
    "ngw/openlayers/Popup",
    "feature_layer/FeatureGrid",
    "dojo/request/xhr",
    "dojo/json",
    "dojo/_base/array",
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dijit/form/Select"
], function (
    declare,
    Base,
    Popup,
    FeatureGrid,
    xhr,
    json,
    array,
    BorderContainer,
    ContentPane,
    Select
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

    return declare(Base, {
        label: "Идентификация",

        constructor: function (params) {
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

        execute: function (point) {
            var olMap = this.display.map.olMap;

            if (this.popup) {
                olMap.removePopup(this.popup);
                this.popup = null;
            };

            var lonlat = olMap.getLonLatFromPixel(new OpenLayers.Pixel(point[0], point[1]));

            this.popup = new Popup(null,
               lonlat,
               new OpenLayers.Size(300,200),
               null,
               false);

            this.container = new BorderContainer({
                style: "width: 100%; height: 100%; padding: 0",
                gutters: false
            });

            this.topPane = new ContentPane({
                region: "top",
                style: "width: 100%; padding: 0; padding-bottom: 8px;"
            });
            this.container.addChild(this.topPane);

            this.centerPane = new ContentPane({
                region: "center",
                style: "padding: 0; font-size: 8pt;"
            });
            this.container.addChild(this.centerPane);

            // Запрашиваем объекты в окрестностях +/- одной точки
            var bounds = new OpenLayers.Bounds();
            bounds.extend(olMap.getLonLatFromPixel({x: point[0] - 2, y: point[1] - 2}));
            bounds.extend(olMap.getLonLatFromPixel({x: point[0] + 2, y: point[1] + 2}));

            var req = {
                // TODO: Учитывать СК веб-карты
                srs: 3857,
                // TODO: Только видимые элементы веб-карты
                layers: [], 
                geom: bounds.toGeometry().toString()
            };


            var tool = this;
            xhr.post(ngwConfig.applicationUrl + '/feature_layer/identify', {
                handleAs: "json",
                data: json.stringify(req)
            }).then(
                function (data) {
                    var options = [];
                    
                    array.forEach(Object.keys(data), function (lid) {
                        var ldata = data[lid];
                        if (ldata.features && ldata.features.length > 0) {
                            options.push({label: "Слой #" + lid + " (" + ldata.features.length + ")", value: lid});
                        };
                    });

                    var layerSelect = new Select({
                        options: options,
                        style: "width: 99%"
                    }).placeAt(tool.topPane);

                    var selectLayer = function (layer) {
                        if (tool._grid) {
                            tool.centerPane.removeChild(tool._grid);
                        };

                        tool._grid = new FeatureGrid({
                            layer: layer,
                            data: data[layer].features,
                            showToolbar: false,
                            gutters: false,
                            style: "width: 100%; height: 100%;"
                        });
                        tool._grid.placeAt(tool.centerPane).startup();
                        tool._grid.resize();
                    };

                    layerSelect.watch("value", function (attr, oldVal, newVal) {
                        selectLayer(newVal);
                    });

                    tool.container.placeAt(tool.popup.contentDiv);
                    tool.container.startup();
       
                    olMap.addPopup(tool.popup);
                    selectLayer(options[0].value);

                    tool.container.resize();
                }
            );
          
        }
    });
});