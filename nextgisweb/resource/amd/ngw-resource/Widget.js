define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-resource/serialize",
    // resource
    "ngw/load-json!resource/schema",
    "dojo/text!./template/Widget.html",
    // template
    "dojox/layout/TableContainer",
    "ngw/form/DisplayNameTextBox",
    "ngw/form/KeynameTextBox"
], function (
    declare,
    array,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    serialize,
    resourceSchema,
    template
) {
    return declare([_WidgetBase, serialize.Mixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        identity: "resource",
        title: "Ресурс",
        style: "margin: 1ex;",

        postCreate: function () {
            this.inherited(arguments);
            this.wCls.set("value", resourceSchema.resources[this.composite.cls].label +
                " (" + this.composite.cls + ")");
        }
    });
});