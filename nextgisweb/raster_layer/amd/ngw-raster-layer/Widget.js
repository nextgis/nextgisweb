/* globals define */
define([
    "dojo/_base/declare",
    "dojo/Deferred",
    "dojo/when",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    // resource
    "dojo/text!./template/Widget.html",
    // template
    "dojox/layout/TableContainer",
    "ngw/form/SpatialRefSysSelect",
    "ngw/form/Uploader"
], function (
    declare,
    Deferred,
    when,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    template
) {
    return declare("ngw.raster_layer.Widget", [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        title: "Растровый слой"

        // _getValueAttr: function () {
        //     var result = { srs_id: this.wSrs.get("value") };

        //     // В общем случае файл имеет тип Promise,
        //     // поэтому используем асинхронный вариант

        //     var promise = new Deferred();

        //     when(this.wFile.get("value"),
        //         function (value) { result.file = value; promise.resolve(result); },
        //         promise.reject
        //     );

        //     return promise;
        // },

        // validateWidget: function () {
        //     var promise = new Deferred();

        //     when(this.wFile.get("value"),
        //         function (value) {
        //             if (value) {
        //                 promise.resolve({ isValid: true, error: [] });
        //             } else {
        //                 promise.resolve({
        //                     isValid: false,
        //                     error: [{ message: "Необходимо загрузить файл!" }]
        //                 });
        //             }
        //         },
        //         promise.reject
        //     );

        //     return promise;
        // }

    });
});