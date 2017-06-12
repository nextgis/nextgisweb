define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-resource/serialize",
    "ngw-pyramid/hbs-i18n",
    // resource
    "ngw/load-json!resource/schema",
    "dojo/text!./template/Widget.hbs",
    "ngw-pyramid/i18n!resource",
    // template
    "dojox/layout/TableContainer",
    "ngw-pyramid/form/DisplayNameTextBox",
    "ngw-pyramid/form/KeynameTextBox",
    "ngw-resource/ResourceBox"
], function (
    declare,
    lang,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    serialize,
    hbsI18n,
    resourceSchema,
    template,
    i18n
) {
    return declare([_WidgetBase, serialize.Mixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: hbsI18n(template, i18n),
        identity: "resource",
        title: i18n.gettext("Resource"),

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
