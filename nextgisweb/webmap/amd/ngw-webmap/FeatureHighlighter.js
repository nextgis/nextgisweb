define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/request/xhr',
    'dojo/topic',
    'dojo/Deferred',
    'ngw/route',
    'ngw/openlayers/layer/Vector',
    'openlayers/ol'
], function (declare, lang, xhr, topic, Deferred, route, Vector, ol) {
    return declare('ngw-webmap.FeatureHighlighter', [], {
        _map: null,
        _source: null,
        _overlay: null,
        _wkt: new ol.format.WKT(),
        _zIndex: 1000,

        constructor: function (map, highlightStyle) {
            this._map = map;
            this._overlay = new Vector('highlight', {
                title: 'Highlight Overlay',
                style: highlightStyle ? highlightStyle : this._getDefaultStyle()
            });
            this._overlay.olLayer.setZIndex(this._zIndex);
            this._source = this._overlay.olLayer.getSource();

            this._bindEvents();

            this._map.addLayer(this._overlay);
        },

        _getDefaultStyle: function () {
            var strokeStyle = new ol.style.Stroke({
                width: 3,
                color: 'rgba(255,255,0,1)'
            });

            return new ol.style.Style({
                stroke: strokeStyle,
                image: new ol.style.Circle({
                    stroke: strokeStyle,
                    radius: 5
                })
            });
        },

        _bindEvents: function () {
            topic.subscribe('feature.highlight', lang.hitch(this, this._highlightFeature));
            topic.subscribe('feature.unhighlight', lang.hitch(this, this._unhighlightFeature));
        },

        _highlightFeature: function (e) {
            var feature;

            this._source.clear();

            feature = new ol.Feature({
                geometry: this._wkt.readGeometry(e.geom)
            });
            this._source.addFeature(feature);

            return feature;
        },

        _unhighlightFeature: function () {
            this._source.clear();
        },

        highlightFeatureById: function (featureId, layerId) {
            var get_feature_item_url = route.feature_layer.feature.item({id: layerId, fid: featureId}),
                highlightedDeferred = new Deferred(),
                feature;

            xhr.get(get_feature_item_url, {
                method: 'GET',
                handleAs: 'json'
            }).then(lang.hitch(this, function (feature) {
                feature = this._highlightFeature({geom: feature.geom});
                highlightedDeferred.resolve(feature);
            }));

            return highlightedDeferred.promise;
        }
    });
});
