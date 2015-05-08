define([
    ngwConfig.assetUrl + "openlayers/OpenLayers.js"
], function () {

    // This fix for issue https://github.com/openlayers/openlayers/issues/1302
    // have to be removed after switching to OpenLayers newer than 2.13.1
    OpenLayers.TileManager.prototype.addTile = function(evt) {
        if (evt.tile instanceof OpenLayers.Tile.Image) {
          if (!evt.tile.layer.singleTile) {
            evt.tile.events.on({
                beforedraw: this.queueTileDraw,
                beforeload: this.manageTileCache,
                loadend: this.addToCache,
                unload: this.unloadTile,
                scope: this
            });
          }
        } else {
            // Layer has the wrong tile type, so don't handle it any longer
            this.removeLayer({layer: evt.tile.layer});
        }
    };

    return OpenLayers;
})
