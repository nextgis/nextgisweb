define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/layout/ContentPane",
    "ngw-pyramid/i18n!vector_layer",
    "ngw-pyramid/hbs-i18n",
    "ngw-resource/serialize",
    "ngw-spatial-ref-sys/SRSSelect",
    // resource
    "dojo/text!./template/Widget.hbs",
    // template
    "dojox/layout/TableContainer",
    "ngw-file-upload/Uploader",
    "dijit/form/ComboBox"
], function (
    declare,
    lang,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    ContentPane,
    i18n,
    hbsI18n,
    serialize,
    SRSSelect,
    template
) {
    return declare([ContentPane, serialize.Mixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: hbsI18n(template, i18n),
        title: i18n.gettext("Vector layer"),
        prefix: "vector_layer",

        constructor: function() {
            this.wSrs = SRSSelect({allSrs: null});
        },

        serializeInMixin: function (data) {
            var prefix = this.prefix,
                setObject = function (key, value) { lang.setObject(prefix + "." + key, value, data); };

            setObject("srs", { id: this.wSrs.get("value") });
            setObject("source", this.wSourceFile.get("value"));
            setObject("source.encoding", this.wSourceEncoding.get("value"));
        },

        validateDataInMixin: function (errback) {
            return this.wSourceFile.upload_promise !== undefined &&
                this.wSourceFile.upload_promise.isResolved();
        }

    });
});
