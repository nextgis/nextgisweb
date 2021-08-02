define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/request/xhr",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/layout/ContentPane",
    "@nextgisweb/pyramid/i18n!",
    "ngw/route",
    "ngw-pyramid/ErrorDialog/ErrorDialog",
    "ngw-resource/serialize",
    "ngw-spatial-ref-sys/SRSSelect",
    // resource
    "dojo/text!./template/Widget.hbs",
    "@nextgisweb/pyramid/settings!",
    // template
    "dojox/layout/TableContainer",
    "ngw-file-upload/Uploader",
    "dijit/layout/ContentPane",
    "dijit/form/ComboBox",
    "dijit/form/CheckBox",
    "dijit/TitlePane"
], function (
    declare,
    lang,
    xhr,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    ContentPane,
    i18n,
    route,
    ErrorDialog,
    serialize,
    SRSSelect,
    template,
    settings
) {
    return declare([ContentPane, serialize.Mixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: i18n.renderTemplate(template),
        title: i18n.gettext("Vector layer"),
        prefix: "vector_layer",

        constructor: function() {
            this.wSrs = SRSSelect({allSrs: null});
        },

        _layersVision: function (enable) {
            // this.wLayerName.domNode.parentNode.parentNode
            //     .style.display = show ? "" : "none";
            this.wSourceLayer.set("disabled", !enable);
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

            this._layersVision(false);
            this.wSourceLayer.watch("options", function (attr, oldval, newval) {
                var showLayers = newval.length > 1;
                this._layersVision(showLayers);
            }.bind(this));

            this.wSourceFile.on("complete", function () {
                var upload_meta = this.wSourceFile.get("value");
                xhr.post(route.vector_layer.dataset(), {
                    handleAs: "json",
                    headers: { "Content-Type": "application/json" },
                    data: JSON.stringify({
                        source: upload_meta
                    })
                }).then(function (data) {
                    var layers = data.layers;

                    var options = [];
                    layers.forEach(function (layer) {
                        options.push({label: layer, value: layer});
                    });
                    this.wSourceLayer.set("options", options);

                    if (layers.length === 0) {
                        this.wSourceFile.uploadReset();
                        new ErrorDialog({
                            title: i18n.gettext("Validation error"),
                            message: i18n.gettext("Dataset doesn't contain layers.")
                        }).show();
                    } else {
                        this.wSourceLayer.set("value", layers[0]);
                    }
                }.bind(this), function (error) {
                    this.wSourceLayer.set("options", []);
                    ErrorDialog.xhrError(error);
                    this.wSourceFile.uploadReset();
                }.bind(this));
            }.bind(this));

            this.wFIDSource.watch('value', function(attr, oldval, newval) {
                var hideFIDField = newval === 'SEQUENCE';
                this.wFIDField.set('disabled', hideFIDField);
            }.bind(this));

            this.wCastGeometryType.watch('value', function(attr, oldval, newval) {
                var hideSkipOtherGeometryType = newval === 'AUTO';
                this.wSkipOtherGeometryTypes.set('disabled', hideSkipOtherGeometryType);
            }.bind(this));
        },

        serializeInMixin: function (data) {
            var prefix = this.prefix,
                setObject = function (key, value) { lang.setObject(prefix + "." + key, value, data); };

            setObject("srs", { id: this.wSrs.get("value") });

            if (this.modeSwitcher.get("value") === 'file') {
                setObject("source", this.wSourceFile.get("value"));
                setObject("encoding", this.wEncoding.get("value"));
                if (this.wSourceLayer.get("options").length > 1) {
                    setObject("source_layer", this.wSourceLayer.get("value"));
                }

                setObject("fix_errors", this.wFixErrors.get("value"));
                setObject("skip_errors", this.wSkipErrors.get("value"));
                var cast_geometry_type = this.wCastGeometryType.get("value");
                if (cast_geometry_type === "AUTO") {
                    cast_geometry_type = null;
                } else {
                    setObject("skip_other_geometry_types", this.wSkipOtherGeometryTypes.get("value"));
                }

                setObject("cast_geometry_type", cast_geometry_type);
                function bool_toggle (value) {
                    switch (value) {
                        case 'YES': return true;
                        case 'NO': return false;
                    }
                    return null;
                }
                setObject("cast_is_multi", bool_toggle(this.wCastIsMulti.get("value")));
                setObject("cast_has_z", bool_toggle(this.wCastHasZ.get("value")));

                var fid_source = this.wFIDSource.get("value");
                setObject("fid_source", fid_source);
                if (fid_source !== 'SEQUENCE') {
                    setObject("fid_field", this.wFIDField.get("value"));
                }
            } else {
                setObject("fields", []);
                setObject("geometry_type", this.wGeometryType.get("value"));
            }
        },

        validateDataInMixin: function (errback) {
            if (this.modeSwitcher.get("value") === 'file') {
                return !!this.wSourceFile.get("value");
            }
            return true;
        }

    });
});
