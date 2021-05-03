/* globals define */
define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-resource/serialize",
    "ngw-spatial-ref-sys/SRSSelect",
    "@nextgisweb/pyramid/i18n",
    // resource
    "dojo/text!./template/Widget.hbs",
    // template
    "dojox/layout/TableContainer",
    "ngw-file-upload/Uploader"
], function (
    declare,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    serialize,
    SRSSelect,
    i18n,
    template
) {
    return declare("ngw.raster.layer.Widget", [_WidgetBase, serialize.Mixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: i18n.renderTemplate(template),
        title: i18n.gettext("Raster layer"),

        constructor: function () {
            this.wSrs = SRSSelect({allSrs: null});
        },

        serializeInMixin: function (data) {
            if (data.raster_layer === undefined) { data.raster_layer = {}; }
            var value = data.raster_layer;
            
            value.srs = { id: this.wSrs.get("value") };
            value.source = this.wFile.data;
        },

        validateDataInMixin: function (errback) {
            return this.composite.operation == "create" ?
                this.wFile.upload_promise !== undefined &&
                    this.wFile.upload_promise.isResolved() : true;
        }
    });
});
