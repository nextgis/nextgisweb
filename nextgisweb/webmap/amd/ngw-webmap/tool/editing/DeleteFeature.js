define([
    "dojo/_base/declare",
    "../Base",
    "ngw-pyramid/i18n!webmap"
], function (
    declare,
    Base,
    i18n
) {
    return declare(Base, {
        layerEditor: null,

        constructor: function (options) {
            declare.safeMixin(this, options);

            this.label = i18n.gettext("Delete features");
            this.customIcon = "<span class='ol-control__icon material-icons'>delete</span>";
        },

        activate: function () {
            this.layerEditor.activateDeletingMode();
        },

        deactivate: function () {
            this.layerEditor.deactivateDeletingMode();
        }
    });
});
