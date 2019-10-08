define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-resource/serialize",
    "ngw-pyramid/i18n!render",
    "ngw-pyramid/hbs-i18n",
    "ngw/settings!render",
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
    hbsI18n,
    settings,
    template
) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, serialize.Mixin], {
        templateString: hbsI18n(template, i18n),
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
        }
    });
});