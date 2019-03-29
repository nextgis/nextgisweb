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

            this.label = i18n.gettext("Create features");
            this.customIcon = "<span class='ol-control__icon material-icons'>add_box</span>";
        },

        activate: function () {
            this.layerEditor.activateCreatingMode();
        },

        deactivate: function () {
            this.layerEditor.deactivateCreatingMode();
        }
    });
});
