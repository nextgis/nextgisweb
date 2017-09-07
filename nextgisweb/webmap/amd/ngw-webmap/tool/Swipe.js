/* globals define */
define([
    "dojo/_base/declare",
    "./Base",
    "ngw/openlayers/control/Swipe",
    "ngw-pyramid/i18n!webmap"
], function (
    declare,
    Base,
    Swipe,
    i18n
) {
    return declare(Base, {
        constructor: function () {
            var tool = this;

            if (this.orientation === "vertical") {
                this.label = i18n.gettext("Vertical swipe");
                this.customIcon = "<span class='ol-control__icon material-icons'>compare</span>";
            } else {
                this.orientation = "horizontal";
                this.label = i18n.gettext("Horizontal swipe");
                this.iconClass = "iconSwipeHorizontal";
            }

            this.control = new Swipe({orientation: this.orientation});

            this.display.watch("item", function () {
                tool.control.removeLayers(tool.control.layers);

                var itemConfig = tool.display.get("itemConfig");
                if (itemConfig.type == "layer") {
                    tool.control.addLayers([
                        tool.display.map.layers[itemConfig.id].olLayer]);
                }
            });
        },

        activate: function () {
            this.display.map.olMap.addControl(this.control);
            this.control.removeLayers(this.control.layers);

            var itemConfig = this.display.get("itemConfig");
            if (itemConfig && itemConfig.type == "layer") {
                this.control.addLayers([
                    this.display.map.layers[itemConfig.id].olLayer]);
            }
        },

        deactivate: function () {
            this.display.map.olMap.removeControl(this.control);
        }
    });
});
