define([
    "dojo/_base/declare",
    "ngw/ObjectWidget",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./templates/Widget.html",
    "dojo/Deferred",
    "dojo/when",
    // template
    "dojox/layout/TableContainer",
    "ngw/form/Uploader",
    "dijit/form/ComboBox"
], function (
    declare,
    ObjectWidget,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    template,
    Deferred,
    when
) {
    return declare("vector_layer.Widget", [ObjectWidget, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        identity: "vector_layer",
        title: "Векторный слой",

        _getValueAttr: function () {
            return {
                file: this.wFile.get("value"),
                encoding: this.wEncoding.get("value")
            };
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