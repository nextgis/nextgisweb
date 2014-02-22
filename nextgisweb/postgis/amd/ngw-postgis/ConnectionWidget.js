/* globals define */
define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw/modelWidget/Widget",
    "ngw/modelWidget/ErrorDisplayMixin",
    "dojo/text!./templates/ConnectionWidget.html",
    // template
    "dijit/form/ValidationTextBox",
    "dojox/layout/TableContainer"
], function (
    declare,
    array,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    Widget,
    ErrorDisplayMixin,
    template
) {
    return declare([Widget, ErrorDisplayMixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        identity: "postgis_connection",
        title: "Соединение PostGIS",

        _getValueAttr: function () {
            var result = {
                hostname: this.wHostname.get("value"),
                username: this.wUsername.get("value"),
                password: this.wPassword.get("value"),
                database: this.wDatabase.get("value")
            };
            return result;
        },

        _setValueAttr: function (value) {
            this.wHostname.set("value", value.hostname);
            this.wUsername.set("value", value.username);
            this.wPassword.set("value", value.password);
            this.wDatabase.set("value", value.database);
        },

        validateWidget: function () {
            var result = { isValid: true, error: [] };

            array.forEach([this.wHostname, this.wUsername, this.wPassword, this.wDatabase], function (subw) {
                subw._hasBeenBlurred = true;
                subw.validate();

                if ( !subw.isValid() ) { result.isValid = false; }
            });

            return result;
        }

    });
});