define([
    "dojo/_base/declare",
    "ngw/modelWidget/Widget",
    "ngw/modelWidget/ErrorDisplayMixin",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./templates/StyleWidget.html",
    // util
    "dojo/_base/array",
    "dojo/Deferred",
    "dojo/when",
    // template
    "dijit/form/ValidationTextBox",
    "dojox/layout/TableContainer"
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
        identity: "wmsclient_style",
        title: "WMS-стиль",

        postCreate: function () {
            this.inherited(arguments);
        },

        _getValueAttr: function () {
            var result = { 
                wmslayers: this.wWMSLayers.get("value")
            };

            return result;
        },

        _setValueAttr: function (value) {
            this.wWMSLayers.set("value", value["wmslayers"]);
        },

        validateWidget: function () {
            var widget = this;
            var result = { isValid: true, error: [] };

            array.forEach([this.wWMSLayers], function (subw) {
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