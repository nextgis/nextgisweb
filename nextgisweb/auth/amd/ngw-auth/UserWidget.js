/*global define, ngwConfig*/
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/store/Memory",
    "ngw-pyramid/modelWidget/Widget",
    "ngw-pyramid/modelWidget/ErrorDisplayMixin",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-pyramid/i18n!auth",
    "ngw-pyramid/hbs-i18n",
    "dojo/text!./template/UserWidget.hbs",
    "dojo/_base/array",
    // template
    "dijit/form/CheckBox",
    "dijit/form/ValidationTextBox",
    "dijit/form/SimpleTextarea",
    "dojox/layout/TableContainer",
    "ngw-auth/PrincipalMemberSelect",
    "ngw-pyramid/form/KeynameTextBox",
    "ngw-pyramid/form/DisplayNameTextBox"
], function (
    declare,
    lang,
    Memory,
    Widget,
    ErrorDisplayMixin,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    i18n,
    hbsI18n,
    template,
    array
) {
    return declare([Widget, ErrorDisplayMixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: hbsI18n(template, i18n),
        identity: "auth_user",
        title: i18n.gettext("User"),

        postCreate: function () {
            this.inherited(arguments);
            this.password.set('required', this.operation === 'create');

            if (this.operation !== 'create') {
                this.password.set(
                    'placeHolder',
                    i18n.gettext("Enter new password here")
                );
            }

            if (this.operation === 'create') {
                this.memberOf.addOption(lang.clone(this.groups));
            }
        },

        validateWidget: function () {
            var widget = this;

            var result = { isValid: true, error: [] };

            array.forEach([this.displayName, this.keyname, this.password], function (subw) {
                // force icon display when checking
                subw._hasBeenBlurred = true;
                subw.validate();

                // if there're errors, mark them
                if (!subw.isValid()) {
                    result.isValid = false;
                }
            });

            return result;
        },

        _setValueAttr: function (value) {
            this.displayName.set("value", value.display_name);
            this.keyname.set("value", value.keyname);
            this.cbDisabled.set("checked", value.disabled);
            this.cbSuperuser.set("checked", value.superuser);
            this.description.set("value", value.description);

            // show groups where user is a member at the top of the list
            var groupStore = new Memory({data: this.groups});
            this.memberOf.addOption(
                groupStore.query(null, {sort: [
                    {attribute: "selected", descending: true},
                    {attribute: "label"}
                ]})
            );
        },

        _getValueAttr: function () {
            var result = {
                display_name: this.displayName.get("value"),
                keyname: this.keyname.get("value"),
                superuser: this.cbSuperuser.get("checked"),
                disabled: this.cbDisabled.get("checked"),
                member_of: this.memberOf.get("value"),
                description: this.description.get("value")
            };
            if (this.password.get("value") !== "") {
                result.password = this.password.get("value");
            }
            return result;
        }
    });
});
