/*global define, require*/
define([
    "dojo/_base/declare",
    "./Base",
    "ngw/openlayers"
], function (
    declare,
    Base,
    openlayers
) {
    return declare(Base, {
        out: false, 

        constructor: function (options) {
            if (!this.out) {
                this.label = "Увеличение масштаба";
                this.iconClass = "iconZoomIn";
            } else {
                this.label = "Уменьшение масштаба";
                this.iconClass = "iconZoomOut";
            };

            this.control = new openlayers.Control.ZoomBox({out: this.out});
            this.display.map.olMap.addControl(this.control);
        },

        activate: function () {
            this.control.activate();
        },

        deactivate: function () {
            this.control.deactivate();
        }

    });
});
