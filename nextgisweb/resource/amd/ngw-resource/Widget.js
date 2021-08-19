define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-resource/serialize",
    // resource
    "@nextgisweb/pyramid/api/load!resource/schema",
    "dojo/text!./template/Widget.hbs",
    "@nextgisweb/pyramid/i18n!",
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
    resourceSchema,
    template,
    i18n
) {
    return declare([_WidgetBase, serialize.Mixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: i18n.renderTemplate(template),
        identity: "resource",
        title: i18n.gettext("Resource"),

        postCreate: function () {
            this.inherited(arguments);

            this.wParent.set("value", this.composite.parent !== null ? {id: this.composite.parent} : null);
            this.wCls.set("value", resourceSchema.resources[this.composite.cls].label +
                " (" + this.composite.cls + ")");

            this.wParent.set("disabled", this.composite.operation === "create");
            if (this.params.composite.operation == "create") {
                this.wDisplayName._hasBeenBlurred = true;
                this.wDisplayName.validate();
            }
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
