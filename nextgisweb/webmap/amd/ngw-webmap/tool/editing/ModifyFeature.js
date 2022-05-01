define([
    "dojo/_base/declare",
    "../Base",
    "@nextgisweb/pyramid/i18n!",
    "@nextgisweb/pyramid/icon"
], function (
    declare,
    Base,
    i18n,
    icon
) {
    return declare(Base, {
        layerEditor: null,

        constructor: function (options) {
            declare.safeMixin(this, options);

            this.label = i18n.gettext("Modify features");
            this.customIcon = '<span class="ol-control__icon">' + icon.html({glyph: "edit"}) + '</span>';
        },

        activate: function () {
            this.layerEditor.activateModifyingMode();
        },

        deactivate: function () {
            this.layerEditor.deactivateModifyingMode();
        }
    });
});
