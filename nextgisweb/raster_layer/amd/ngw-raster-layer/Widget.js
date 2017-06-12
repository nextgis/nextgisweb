/* globals define */
define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-resource/serialize",
    "ngw-pyramid/i18n!raster_layer",
    "ngw-pyramid/hbs-i18n",
    // resource
    "dojo/text!./template/Widget.hbs",
    // template
    "dojox/layout/TableContainer",
    "ngw-spatial-ref-sys/SpatialRefSysSelect",
    "ngw-file-upload/Uploader"
], function (
    declare,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    serialize,
    i18n,
    hbsI18n,
    template
) {
    return declare("ngw.raster.layer.Widget", [_WidgetBase, serialize.Mixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: hbsI18n(template, i18n),
        title: i18n.gettext("Raster layer"),

        serializeInMixin: function (data) {
            if (data.raster_layer === undefined) { data.raster_layer = {}; }
            var value = data.raster_layer;
            
            value.srs = { id: this.wSrs.get("value") };
            value.source = this.wFile.data;
        },

        validateDataInMixin: function (errback) {
            return this.wFile.upload_promise !== undefined &&
                this.wFile.upload_promise.isResolved();
        }
    });
});
