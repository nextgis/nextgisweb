define([
    "dojo/_base/declare",
    "dojo/Deferred",
    "dojo/when",
    "ngw/ObjectWidget",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./templates/Widget.html",
    // template
    "dojox/layout/TableContainer",
    "ngw/form/SpatialRefSysSelect",
    "ngw/form/Uploader"
], function (
    declare,
    Deferred,
    when,
    ObjectWidget,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    template
) {
    return declare("raster_layer.Widget", [ObjectWidget, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        identity: "raster_layer",
        title: "Растровый слой",

        _getValueAttr: function () {
            var result = { srs_id: this.wSrs.get("value") };

            // В общем случае файл имеет тип Promise,
            // поэтому используем асинхронный вариант

            var promise = new Deferred();

            when(this.wFile.get("value"),
                function (value) { result['file'] = value; promise.resolve(result) },
                promise.reject
            );

            return promise;
        },

        validate: function () {
            var promise = new Deferred();

            when(this.wFile.get("value"),
                function (value) { promise.resolve(value != undefined) },
                promise.reject
            );

            return promise;
        }

    });
})