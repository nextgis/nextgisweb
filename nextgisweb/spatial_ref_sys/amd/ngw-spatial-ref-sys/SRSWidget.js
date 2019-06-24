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
    "ngw-pyramid/i18n!auth",
    "ngw-pyramid/hbs-i18n",
    "ngw/route",
    "dojo/text!./template/SRSWidget.hbs",
    "dojo/_base/array",
    "dojo/request/xhr",
    "./ProjStringDialog",
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
    ProjStringDialog
) {

    var projStringDialog = new ProjStringDialog();
    return declare([Widget, ErrorDisplayMixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: hbsI18n(template, i18n),
        identity: "srs_list",
        title: i18n.gettext("SRS"),

        postCreate: function () {
            if (this.value && this.value.disabled && this.wkt) {
                this.wkt.set("readOnly", true);
            }
            if (this.btnImportProjectionString) {
                projStringDialog.on("save", lang.hitch(this, this._insertProjectionString));

                this.btnImportProjectionString.on('click', function () {
                    projStringDialog.show();
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

        _insertProjectionString: function (data) {
            var projString = data && data.projStr;
            if (projString) {
                xhr.post(route.spatial_ref_sys.convert(), {
                    handleAs: "json",
                    headers: { "Accept": "application/json" },
                    data: data
                }).then(
                    function (data) {
                        console.log(data);
                    },
                    function (error) {

                    }
                );
            }
        }
    });
});
