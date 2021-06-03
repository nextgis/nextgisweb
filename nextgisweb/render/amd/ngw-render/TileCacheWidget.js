define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-resource/serialize",
    "@nextgisweb/pyramid/i18n!",
    "@nextgisweb/pyramid/settings!",
    "dojo/text!./template/TileCacheWidget.hbs",
    "dijit/form/CheckBox",
    "dojox/layout/TableContainer",
    "ngw-pyramid/form/IntegerValueTextBox"
], function(
    declare,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    serialize,
    i18n,
    settings,
    template
) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, serialize.Mixin], {
        templateString: i18n.renderTemplate(template),
        title: i18n.gettext("Tile cache"),
        prefix: "tile_cache",

        buildRendering: function() {
            this.inherited(arguments);
            if (!settings.tile_cache.seed) { this.wTableContainer.removeChild(this.wSeedZ) };
            if (!settings.tile_cache.track_changes) { this.wTableContainer.removeChild(this.wTrackChanges) };
        },

        serializeInMixin: function (data) {
            var value = data.tile_cache;
            value.enabled = (value.enabled === "on") ? true : false;
            value.track_changes = (value.track_changes === "on") ? true : false;
            value.image_compose = (value.image_compose === "on") ? true : false;
        },

        _onEnabledChange: function (newValue) {
            if (newValue === true && this.wImageCompose.get("checked") == false) {
                this.wImageCompose.set("checked", true)
            }
        }
    });
});