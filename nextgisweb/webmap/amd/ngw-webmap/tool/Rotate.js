define([
    "dojo/_base/declare",
    "./Base",
    "openlayers/ol",
    "@nextgisweb/pyramid/i18n!"
], function (
    declare,
    Base,
    ol,
    i18n
) {
    return declare(Base, {
        constructor: function (options) {
            this.label = i18n.gettext("Rotate");
            this.iconClass = "iconRotate";

            this.interaction = new ol.interaction.DragRotate({
                condition: ol.events.condition.always
            });
            this.interaction.setActive(false);
            this.display.map.olMap.addInteraction(this.interaction);
        },

        activate: function () {
            this.interaction.setActive(true);
        },

        deactivate: function () {
            this.interaction.setActive(false);
        }

    });
});
