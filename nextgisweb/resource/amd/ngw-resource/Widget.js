define([
    "dojo/_base/declare",
    "ngw/modelWidget/Widget",
    "ngw/modelWidget/ErrorDisplayMixin",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./templates/Widget.html",
    "dojo/_base/array",
    "dojo/on",
    // template
    "dojox/layout/TableContainer",
    "ngw/form/DisplayNameTextBox",
    "ngw/form/KeynameTextBox"
], function (
    declare,
    Widget,
    ErrorDisplayMixin,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    template,
    array,
    on
) {
    return declare([Widget, ErrorDisplayMixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        identity: "resource",
        title: "Ресурс",
        style: "margin: 1ex;",

        postCreate: function () {
            this.watch("disabled", function (attr, oldVal, newVal) {
                array.forEach([this.wDisplayName, this.wKeyname], function (w) {
                    w.set(attr, newVal);
                });
            });
        },

        validateWidget: function () {
            var result = { isValid: true, error: [] };

            array.forEach([this.wDisplayName, this.wKeyname], function (subw) {
                // форсируем показ значка при проверке
                subw._hasBeenBlurred = true;
                subw.validate();

                // если есть ошибки, фиксируем их
                if ( !subw.isValid() ) {
                    result.isValid = false;
                }
            });

            return result;
        },

        serialize: function (data) {
            if (data.resource === undefined) { data.resource = {}; }
            data.resource.display_name = this.wDisplayName.get("value");
            data.resource.keyname = this.wKeyname.get("value");
        },

        deserialize: function (data) {
            this.wDisplayName.set("value", data.resource.display_name);
            this.wKeyname.set("value", data.resource.keyname);
        }
    });
});