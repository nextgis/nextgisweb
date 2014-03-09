define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
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
    "ngw/form/KeynameTextBox",
    "ngw-resource/ResourceBox"
], function (
    declare,
    array,
    lang,
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

            this.wParent.set("value", this.composite.parent !== null ? {id: this.composite.parent} : null);
            this.wCls.set("value", resourceSchema.resources[this.composite.cls].label +
                " (" + this.composite.cls + ")");

            this.wParent.set("disabled", this.composite.operation === "create");
        },

        serializeInMixin: function (data) {
            if (!this.wParent.get("disabled")) {
                lang.setObject(
                    "resource.parent",
                    this.wParent.get("value"),
                    data);
            }
        }
    });
});