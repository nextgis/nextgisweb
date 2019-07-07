/*global define, ngwConfig*/
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/store/Memory",
    "dojo/dom-style",
    "ngw-pyramid/modelWidget/Widget",
    "ngw-pyramid/modelWidget/ErrorDisplayMixin",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-pyramid/i18n!spatial_ref_sys",
    "ngw-pyramid/hbs-i18n",
    "ngw/route",
    "dojo/text!./template/SRSWidget.hbs",
    "dojo/_base/array",
    "dojo/request/xhr",
    "./SRSStringDialog",
    // template
    "dijit/form/CheckBox",
    "dijit/form/ValidationTextBox",
    "dijit/form/SimpleTextarea",
    "dojox/layout/TableContainer",
    "ngw-auth/PrincipalMemberSelect",
    "ngw-pyramid/form/KeynameTextBox",
    "ngw-pyramid/form/DisplayNameTextBox"
], function (
    declare,
    lang,
    Memory,
    domStyle,
    Widget,
    ErrorDisplayMixin,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    i18n,
    hbsI18n,
    route,
    template,
    array,
    xhr,
    SRSStringDialog
) {

    var srsStringDialog = new SRSStringDialog();
    return declare([Widget, ErrorDisplayMixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: hbsI18n(template, i18n),
        identity: "srs_list",
        title: i18n.gettext("Spatial Reference System"),

        postCreate: function () {
            if (this.value && this.value.disabled && this.wkt) {
                this.wkt.set("readOnly", true);
                this.btnImportSRSString.set("disabled", true);
            }
            if (this.btnImportSRSString) {
                srsStringDialog.on("save", lang.hitch(this, this._insertSRSString));

                this.btnImportSRSString.on('click', function () {
                    srsStringDialog.show();
                });
            }
        },

        validateWidget: function () {

            var result = { isValid: true, error: [] };

            array.forEach([this.displayName], function (subw) {
                // force icon display when checking
                subw._hasBeenBlurred = true;
                subw.validate();

                // if there're errors, mark them
                if (!subw.isValid()) {
                    result.isValid = false;
                }
            });

            return result;
        },

        _setValueAttr: function (value) {
            this.displayName.set("value", value.display_name);
            if (this.wkt) {
                this.wkt.set("value", value.wkt);            
            }
        },

        _getValueAttr: function () {
            var result = {
                display_name: this.displayName.get("value"),
                wkt: this.wkt.get("value")
            };
            return result;
        },

        _handleDialogError: function (message) {
            widget.wkt.set("value", "");
            alert(message);
        },

        _insertSRSString: function (data) {
            var widget = this;
            var projString = data && data.projStr;
            if (projString) {
                xhr.post(route.spatial_ref_sys.convert(), {
                    handleAs: "json",
                    headers: { "Accept": "application/json" },
                    data: data
                }).then(
                    function (data) {
                        var wkt = data && data.wkt;
                        if (data.success && wkt && widget.wkt) {
                            widget.wkt.set("value", wkt);
                        } else {
                            widget._handleDialogError(data.message);
                        }
                    },
                    function (error) {
                        widget._handleDialogError(error);
                    }
                );
            }
        }
    });
});
