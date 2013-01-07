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
    "ngw/form/SpatialRefSysSelect",
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
            var result = { srs_id: this.wSRS.get("value") };

            // В общем случае файл имеет тип Promise,
            // поэтому используем асинхронный вариант

            var promise = new Deferred();

            when(this.wFile.get("value"),
                function (value) { result['file'] = value; promise.resolve(result) },
                promise.reject
            );

            return promise;        },

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