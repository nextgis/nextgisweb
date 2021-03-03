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
    "ngw/settings!vector_layer",
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
    template,
    settings,
) {
    return declare([ContentPane, serialize.Mixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: hbsI18n(template, i18n),
        title: i18n.gettext("Vector layer"),
        prefix: "vector_layer",

        constructor: function() {
            this.wSrs = SRSSelect({allSrs: null});
        },

        postCreate: function () {
            if (settings.show_create_mode) {
                this.modeSwitcher.watch('value', function(attr, oldval, newval) {
                    var hideFile = newval === 'empty';
                    this.empty_layer_section.style.display = hideFile ? '' : 'none';
                    this.file_section.style.display = hideFile ? 'none' : '';
                }.bind(this));
            } else {
                this.mode_section.domNode.style.display = 'none';
            }
        },

        serializeInMixin: function (data) {
            var prefix = this.prefix,
                setObject = function (key, value) { lang.setObject(prefix + "." + key, value, data); };

            setObject("srs", { id: this.wSrs.get("value") });

            if (this.modeSwitcher.get("value") === 'file') {
                setObject("source", this.wSourceFile.get("value"));
                setObject("encoding", this.wEncoding.get("value"));
                setObject("error_tolerance", this.wErrorTolerance.get("value"));
                setObject("cast_geometry_type", this.wCastGeometryType.get("value"));
                setObject("cast_is_multi", this.wCastIsMulti.get("value"));
                setObject("cast_has_z", this.wCastHasZ.get("value"));
            } else {
                setObject("fields", []);
                setObject("geometry_type", this.wGeometryType.get("value"));
            }
        },

        validateDataInMixin: function (errback) {
            if (this.modeSwitcher.get("value") === 'file') {
                return this.wSourceFile.upload_promise !== undefined &&
                    this.wSourceFile.upload_promise.isResolved();
            }
            return true;
        }

    });
});
