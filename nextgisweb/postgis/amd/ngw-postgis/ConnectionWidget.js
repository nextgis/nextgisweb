/* globals define */
define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./templates/ConnectionWidget.html",
    // template
    "dijit/form/ValidationTextBox",
    "dojox/layout/TableContainer"
], function (
    declare,
    array,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    template
) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        identity: "postgis_connection",
        title: "Соединение PostGIS",

        serialize: function (data) {
            if (data.postgis_connection === undefined) { data.postgis_connection = {}; }
            var value = data.postgis_connection;

            value.hostname = this.wHostname.get("value");
            value.username = this.wUsername.get("value");
            value.password = this.wPassword.get("value");
            value.database = this.wDatabase.get("value");
        },

        deserialize: function (data) {
            var value = data.postgis_connection;
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