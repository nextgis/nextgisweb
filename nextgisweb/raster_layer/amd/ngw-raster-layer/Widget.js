define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-resource/serialize",
    "ngw-spatial-ref-sys/SRSSelect",
    "@nextgisweb/pyramid/i18n!",
    // resource
    "dojo/text!./template/Widget.hbs",
    // settings
    "@nextgisweb/pyramid/settings!",
    // template
    "dojox/layout/TableContainer",
    "dijit/form/CheckBox",
    "ngw-file-upload/Uploader"
], function (
    declare,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    serialize,
    SRSSelect,
    i18n,
    template,
    settings
) {
    return declare("ngw.raster.layer.Widget", [_WidgetBase, serialize.Mixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: i18n.renderTemplate(template),
        title: i18n.gettext("Raster layer"),

        constructor: function () {
            this.wSrs = SRSSelect({allSrs: null});
        },

        postCreate: function () {
            this.inherited(arguments);
            this.wCOG.set("checked", settings.cog_enabled);
        },

        serializeInMixin: function (data) {
            if (data.raster_layer === undefined) { data.raster_layer = {}; }
            var value = data.raster_layer;
            
            value.srs = { id: this.wSrs.get("value") };
            value.source = this.wFile.data;

            if (
                this.composite.operation == "create" ||
                this.composite.operation == "update" && value.source
            ) {
                value.cog = this.wCOG.checked;
            }
        },

        validateDataInMixin: function (errback) {
            return this.composite.operation == "create" ?
                this.wFile.upload_promise !== undefined &&
                    this.wFile.upload_promise.isResolved() : true;
        }
    });
});
