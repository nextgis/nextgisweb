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
    "dojo/text!./template/GroupWidget.hbs",
    "dojo/_base/array",
    "dojo/on",
    // template
    "dijit/form/CheckBox",
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
    array,
    on
) {
    return declare([Widget, ErrorDisplayMixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: hbsI18n(template, i18n),
        identity: "auth_user",
        title: i18n.gettext("Group"),

        postCreate: function () {
            this.inherited(arguments);

            if (this.operation === 'create') {
                this.members.addOption(lang.clone(this.users));
            }
        },

        validateWidget: function () {
            var widget = this;

            var result = { isValid: true, error: [] };

            array.forEach([this.displayName, this.keyname], function (subw) {
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
            this.description.set("value", value.description);
            this.register.set("checked", value.register);

            // show group members at the top of the list
            var userStore = new Memory({data: this.users});
            this.members.addOption(
                userStore.query(null, {sort: [
                    {attribute: "selected", descending: true},
                    {attribute: "label"}
                ]})
            );
        },

        _getValueAttr: function () {
            return {
                display_name: this.displayName.get("value"),
                keyname: this.keyname.get("value"),
                description: this.description.get("value"),
                register: this.register.get("checked"),
                members: this.members.get("value")
            };
        }
    });
});
