define([
    "dojo/_base/declare",
    "ngw/modelWidget/Widget",
    "ngw/modelWidget/ErrorDisplayMixin",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./templates/Widget.html",
    // util
    "dojo/Deferred",
    "dojo/when",
    // template
    "dojox/layout/TableContainer",
    "ngw/form/Uploader",
    "dijit/form/ComboBox"
], function (
    declare,
    Widget,
    ErrorDisplayMixin,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    template,
    Deferred,
    when
) {
    return declare([Widget, ErrorDisplayMixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        identity: "vector_layer",
        title: "Векторный слой",

        _getValueAttr: function () {
            return {
                file: this.wFile.get("value"),
                encoding: this.wEncoding.get("value")
            };
        },

        validateWidget: function () {
            var promise = new Deferred();

            when(this.wFile.get("value"),
                function (value) {
                    if (value) {
                        promise.resolve({ isValid: true, error: [] });
                    } else {
                        promise.resolve({
                            isValid: false,
                            error: [{ message: "Необходимо загрузить файл!" }]
                        });
                    };
                },
                promise.reject
            );

            return promise;
        }

    });
})