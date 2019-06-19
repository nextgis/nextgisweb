/*global define, ngwConfig*/
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/store/Memory",
    "ngw-pyramid/modelWidget/Widget",
    "ngw-pyramid/modelWidget/ErrorDisplayMixin",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-pyramid/i18n!auth",
    "ngw-pyramid/hbs-i18n",
    "dojo/text!./template/SRSWidget.hbs",
    "dojo/_base/array",
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
    Widget,
    ErrorDisplayMixin,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    i18n,
    hbsI18n,
    template,
    array
) {
    return declare([Widget, ErrorDisplayMixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: hbsI18n(template, i18n),
        identity: "srs_list",
        title: i18n.gettext("SRS"),

        constructor: function (obj) {
            this.wktEditDisabled = obj.value && obj.value.disabled;
            // this.fromWkt = obj.value && obj.value.wkt;
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
            // if (this.wktEditDisabled && this.fromWkt !== this.wkt.get("value")) {
            //     result.isValid = false;
            // }

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
        }
    });
});
