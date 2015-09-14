/*global define, require*/
define([
    "dojo/_base/declare",
    "./Base",
    "ngw/openlayers",
    "ngw-pyramid/i18n!webmap"
], function (
    declare,
    Base,
    openlayers,
    i18n
) {
    return declare(Base, {
        out: false, 

        constructor: function (options) {
            if (!this.out) {
                this.label = i18n.gettext("Zoom in");
                this.iconClass = "iconZoomIn";
            } else {
                this.label = i18n.gettext("Zoom out");
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
