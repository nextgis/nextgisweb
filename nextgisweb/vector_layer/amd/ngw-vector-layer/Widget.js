define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-style",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/layout/ContentPane",
    "@nextgisweb/pyramid/api",
    "@nextgisweb/pyramid/i18n!",
    "@nextgisweb/gui/error",
    "ngw-resource/serialize",
    "ngw-spatial-ref-sys/SRSSelect",
    // resource
    "dojo/text!./template/Widget.hbs",
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
    domStyle,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    ContentPane,
    api,
    i18n,
    error,
    serialize,
    SRSSelect,
    template,
) {
    var Modes = {
        empty: "empty",
        file: "file",
        keep: "keep",
        delete: "delete",
        geom: "geom",
    };
    return declare([ContentPane, serialize.Mixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: i18n.renderTemplate(template),
        title: i18n.gettext("Vector layer"),
        activateOn: { create: true },
        prefix: "vector_layer",

        constructor: function() {
            this.wSrs = SRSSelect({allSrs: null});
            this._geometry_type = null;
            this._gt_options = [
                { value: "POINT", label: i18n.gettext("Point") },
                { value: "LINESTRING", label: i18n.gettext("Line") },
                { value: "POLYGON", label: i18n.gettext("Polygon") },
                { value: "MULTIPOINT", label: i18n.gettext("Multipoint") },
                { value: "MULTILINESTRING", label: i18n.gettext("Multiline") },
                { value: "MULTIPOLYGON", label: i18n.gettext("Multipolygon") },
                { value: "POINTZ", label: i18n.gettext("Point Z") },
                { value: "LINESTRINGZ", label: i18n.gettext("Line Z") },
                { value: "POLYGONZ", label: i18n.gettext("Polygon Z") },
                { value: "MULTIPOINTZ", label: i18n.gettext("Multipoint Z") },
                { value: "MULTILINESTRINGZ", label: i18n.gettext("Multiline Z") },
                { value: "MULTIPOLYGONZ", label: i18n.gettext("Multipolygon Z") },
            ];
        },

        _confirmSectionVision: function (gt, mode) {
            var hide;
            if (gt === undefined) {
                switch (mode) {
                    case Modes.file:
                    case Modes.delete:
                        hide = false;
                        break;
                    case Modes.geom:
                        hide = this.wGeometryType.get("value") === this._geometry_type;
                        break;
                    default:
                        hide = true;
                }
            } else {
                hide = gt === this._geometry_type;
            }
            this.confirm_section.style.display = hide ? "none" : "";
        },

        _layersVision: function (enable) {
            this.wSourceLayer.set("disabled", !enable);
        },

        _resetSouce: function () {
            this.wSourceFile.uploadReset();
            this.wSourceLayer.set("options", []);
            this.wSourceLayer.value = "";
            this.wSourceLayer._setDisplay("");
            this.resetSDN && this.resetSDN();
        },

        postCreate: function () {
            if (this.composite.operation === "create") {
                this.wGeometryType.addOption(this._gt_options);
                this.confirm_section.style.display = "none";
            } else {
                this.wGeometryType.watch("value", function(attr, oldval, newval) {
                    this._confirmSectionVision(newval);
                    this.confirm.set("checked", false);
                }.bind(this));
            }

            this.modeSwitcher.watch("value", function(attr, oldval, newval) {
                this.geometry_section.style.display = 
                    [Modes.empty, Modes.geom].includes(newval) ? "" : "none";
                this.file_section.style.display = newval === Modes.file ? "" : "none";
                if (this.composite.operation === "update") {
                    if ([Modes.file, Modes.delete, Modes.geom].includes(newval)) {
                        switch (newval) {
                            case Modes.file:
                            case Modes.delete:
                                this.confirm_label.innerText = i18n.gettext("Confirm deletion of existing features");
                                break;
                            case Modes.geom:
                                this.confirm_label.innerText = i18n.gettext("Confirm change of geometry type");
                        }
                    }
                    this._confirmSectionVision(undefined, newval);
                    this.confirm.set("checked", false);
                }
            }.bind(this));

            this.modeSwitcher.addOption(
                this.composite.operation === "create" ? [
                    { value: Modes.file, label: i18n.gettext("Load features from file"), selected: true },
                    { value: Modes.empty, label: i18n.gettext("Create empty layer") },
                ] : [
                    { value: Modes.keep, label: i18n.gettext("Keep existing layer features"), selected: true },
                    { value: Modes.file, label: i18n.gettext("Replace layer features from file") },
                    { value: Modes.delete, label: i18n.gettext("Delete all features from layer") },
                    { value: Modes.geom, label: i18n.gettext("Change geometry type") },
                ]
            );

            this._layersVision(false);
            this.wSourceLayer.watch("options", function (attr, oldval, newval) {
                var showLayers = newval.length > 1;
                this._layersVision(showLayers);
            }.bind(this));

            this.wSourceFile.on("complete", function () {
                var upload_meta = this.wSourceFile.get("value");
                api.route("vector_layer.dataset").post({
                    json: { source: upload_meta }
                }).then(lang.hitch(this, function(data) {
                    var layers = data.layers;

                    if (layers.length === 0) {
                        this._resetSouce();
                        error.errorModal({
                            title: i18n.gettext("Validation error"),
                            message: i18n.gettext("Dataset doesn't contain layers.")
                        });
                    } else {
                        var options = [];
                        layers.forEach(function (layer) {
                            options.push({label: layer, value: layer});
                        });
                        this.wSourceLayer.set("options", options);
                        this.wSourceLayer.set("value", layers[0]);
                        this.resetSDN = this.composite.suggestDN(layers[0]);
                    }
                }), lang.hitch(this, function(err) {
                    this._resetSouce();
                    error.errorModal(err);
                }))
            }.bind(this));

            this.wFIDSource.watch("value", function(attr, oldval, newval) {
                var hideFIDField = newval === "SEQUENCE";
                this.wFIDField.set("disabled", hideFIDField);
            }.bind(this));

            this.wCastGeometryType.watch("value", function(attr, oldval, newval) {
                var hideSkipOtherGeometryType = newval === "AUTO";
                this.wSkipOtherGeometryTypes.set("disabled", hideSkipOtherGeometryType);
            }.bind(this));
        },

        deserializeInMixin: function (data) {
            this._geometry_type = data[this.prefix].geometry_type;
            var geom_class = this._geometry_type.replace(/^(MULTI)?(.*?)Z?$/, '$2');
            var gt_options = [];
            this._gt_options.forEach(function (option) {
                if (option.value.includes(geom_class)) {
                    if (option.value === this._geometry_type) {
                        option.selected = true;
                        option.label += ' <span style="color: gray">' + i18n.gettext("current") + '</span>';
                    }
                    gt_options.push(option);
                }
            }.bind(this));
            this.wGeometryType.addOption(gt_options);
        },

        serialize: function(data, lunkwill) {
            this.inherited(arguments);
            lunkwill.suggest(this.composite.operation === "create");
        },

        serializeInMixin: function (data) {
            var prefix = this.prefix,
                setObject = function (key, value) { lang.setObject(prefix + "." + key, value, data); };

            setObject("srs", { id: this.wSrs.get("value") });

            switch (this.modeSwitcher.get("value")) {
                case Modes.empty:
                    setObject("fields", []);
                case Modes.geom:
                    setObject("geometry_type", this.wGeometryType.get("value"));
                    break;

                case Modes.file:
                    setObject("source", this.wSourceFile.get("value"));
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
                            case "YES": return true;
                            case "NO": return false;
                        }
                        return null;
                    }
                    setObject("cast_is_multi", bool_toggle(this.wCastIsMulti.get("value")));
                    setObject("cast_has_z", bool_toggle(this.wCastHasZ.get("value")));
    
                    var fid_source = this.wFIDSource.get("value");
                    setObject("fid_source", fid_source);
                    if (fid_source !== "SEQUENCE") {
                        setObject("fid_field", this.wFIDField.get("value"));
                    }
                    break;

                case Modes.delete:
                    setObject("delete_all_features", true);
                    break;
            }
        },

        validateDataInMixin: function (errback) {
            if (
                this.modeSwitcher.get("value") === "file"
                && !this.wSourceFile.get("value")
            ) {
                return false;
            }

            if (this.composite.operation === "update") {
                var mode = this.modeSwitcher.get("value");
                if (
                    [Modes.file, Modes.delete].includes(mode)
                    || (
                        mode === Modes.geom
                        && this.wGeometryType.get("value") !== this._geometry_type
                    )
                ) {
                    domStyle.set(this.confirm_section, "color", "var(--danger)");
                    return this.confirm.get("value");
                }
            }

            return true;
        },
    });
});
