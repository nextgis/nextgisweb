/*global define, ngwConfig*/
define([
    "dojo/_base/declare",
    "ngw/modelWidget/Widget",
    "ngw/modelWidget/ErrorDisplayMixin",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-pyramid/i18n!auth",
    "ngw-pyramid/hbs-i18n",
    "dojo/text!./template/GroupWidget.hbs",
    "dojo/_base/array",
    "dojo/on",
    // template
    "dijit/form/SimpleTextarea",    
    "dojox/layout/TableContainer",
    "ngw-pyramid/form/KeynameTextBox",
    "ngw-pyramid/form/DisplayNameTextBox"
], function (
    declare,
    Widget,
    ErrorDisplayMixin,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    i18n,
    hbsI18n,
    template,
    array,
    on
) {
    return declare([Widget, ErrorDisplayMixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: hbsI18n(template, i18n),
        identity: "auth_user",
        title: i18n.gettext("Group"),

        validateWidget: function () {
            var widget = this;

            var result = { isValid: true, error: [] };

            array.forEach([this.displayName, this.keyname], function (subw) {
                // форсируем показ значка при проверке
                subw._hasBeenBlurred = true;
                subw.validate();

                // если есть ошибки, фиксируем их
                if (!subw.isValid()) {
                    result.isValid = false;
                }
            });

            return result;
        },

        _setValueAttr: function (value) {
            this.displayName.set("value", value.display_name);
            this.keyname.set("value", value.keyname);
            this.description.set("value", value.description);
        },

        _getValueAttr: function () {
            return {
                display_name: this.displayName.get("value"),
                keyname: this.keyname.get("value"),
                description: this.description.get("value"),
            };
        }
    });
});
