define([
    'dojo/_base/declare',
    'ngw-pyramid/i18n!webmap',
    'openlayers/ol',
    'ngw/openlayers/layer/Vector',
], function (
    declare, i18n, ol, Vector
) {
    return declare(null, {
        _layer: null,
        _source: null,
        
        constructor: function () {
            this._source = new ol.source.Vector();
            this._layer = new Vector('', {title: 'annotaions'});
            this._layer.olLayer.setSource(this._source);
        },
        
        addToMap: function (map) {
            map.addLayer(this._layer);
        },
        
        getSource: function () {
            return this._source;
        }
    });
});
