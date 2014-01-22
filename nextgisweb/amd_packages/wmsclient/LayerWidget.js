define([
    "dojo/_base/declare",
    "ngw/modelWidget/Widget",
    "ngw/modelWidget/ErrorDisplayMixin",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./templates/LayerWidget.html",
    // util
    "dojo/_base/array",
    "dojo/Deferred",
    "dojo/when",
    // template
    "dijit/form/ValidationTextBox",
    "dojox/layout/TableContainer",
    "ngw/form/SpatialRefSysSelect"
], function (
    declare,
    Widget,
    ErrorDisplayMixin,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    template,
    array,
    Deferred,
    when
) {
    return declare([Widget, ErrorDisplayMixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        identity: "wmsclient_layer",
        title: "WMS-клиент",

        postCreate: function () {
            this.inherited(arguments);
        },

        _getValueAttr: function () {
            var result = { 
                url: this.wURL.get("value"),
                srs_id: this.wSRS.get("value"),
            };

            return result;
        },

        _setValueAttr: function (value) {
            this.wURL.set("value", value["url"]);
            this.wSRS.set("value", value["srs_id"]);
        },

        validateWidget: function () {
            var widget = this;
            var result = { isValid: true, error: [] };

            array.forEach([this.wURL], function (subw) {
                // форсируем показ значка при проверке
                subw._hasBeenBlurred = true;
                subw.validate();   

                // если есть ошибки, фиксируем их
                if ( !subw.isValid() ) {
                    result.isValid = false;
                };
            });

            return result;
        }

    });
})