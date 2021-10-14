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
    "ngw-auth/PrincipalSelect",
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

            var principal_store = this.wOwnerUser.store;
            var principal_filter = [];
            principal_store.query(function (p) {
                if (p.cls !== 'U' || (p.system && p.keyname !== 'guest')) {
                    principal_filter.push(p.id)
                }
            });
            principal_filter.forEach(principal_store.remove.bind(principal_store));

            this.wParent.set("value", this.composite.parent !== null ? {id: this.composite.parent} : null);
            this.wOwnerUser.set("value", this.composite.owner_user);
            this.wCls.set("value", resourceSchema.resources[this.composite.cls].label +
                " (" + this.composite.cls + ")");

            this.wParent.set("disabled", this.composite.operation === "create");
            this.wOwnerUser.set("disabled", !ngwConfig.isAdministrator);
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
            if (!this.wOwnerUser.get("disabled")) {
                lang.setObject(
                    "resource.owner_user",
                    {id: this.wOwnerUser.get("value")},
                    data);
            }
        }
    });
});
