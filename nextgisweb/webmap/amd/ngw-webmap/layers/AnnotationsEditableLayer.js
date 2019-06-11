define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/topic',
    'ngw-pyramid/i18n!webmap',
    'openlayers/ol',
    'ngw/openlayers/layer/Vector',
], function (
    declare, lang, topic, i18n, ol, Vector
) {
    return declare(null, {
        _map: null,
        _editableLayer: null,
        _source: null,
        
        constructor: function (map) {
            this._map = map;
        },
        
        activate: function (annotationsLayer) {
            this._editableLayer = new Vector('', {title: 'editor.overlay'});
            this._source = new ol.source.Vector();
            this._editableLayer.olLayer.setSource(this._source);
            this._map.addLayer(this._editableLayer);
            this._setInteractions();
        },
        
        deactivate: function () {
            this._offInteractions();
            this._map.removeLayer(this._editableLayer);
        },
        
        _setInteractions: function () {
            this._draw = new ol.interaction.Draw({
                source: this._source,
                features: this._source.getFeatures(),
                type: 'Point',
                freehandCondition: function (event) {
                    return ol.events.condition.never(event);
                }
            });
            
            this._draw.on('drawend', lang.hitch(this, function (e) {
                topic.publish('webmap/annotations/layer/', 'create', e.feature);
            }));
            
            this._modify = new ol.interaction.Modify({
                source: this._source,
                deleteCondition: function (event) {
                    return ol.events.condition.shiftKeyOnly(event) &&
                        ol.events.condition.singleClick(event);
                }
            });
            
            this._snap = new ol.interaction.Snap({
                source: this._source
            });
            
            this._map.olMap.addInteraction(this._draw);
            this._map.olMap.addInteraction(this._modify);
            this._map.olMap.addInteraction(this._snap);
            
            this._draw.setActive(true);
            this._modify.setActive(true);
            this._snap.setActive(true);
        },
        
        _offInteractions: function () {
            this._map.olMap.removeInteraction(this._draw);
            this._map.olMap.removeInteraction(this._modify);
            this._map.olMap.removeInteraction(this._snap);
            
            this._draw = null;
            this._modify = null;
            this._snap = null;
        }
    });
});
