/*global define, ngwConfig*/
define([
    "dojo/_base/declare",
    "ngw-pyramid/modelWidget/Widget",
    "ngw-pyramid/modelWidget/ErrorDisplayMixin",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-pyramid/i18n!auth",
    "ngw-pyramid/hbs-i18n",
    "dojo/text!./template/GroupWidget.hbs",
    "dojo/_base/array",
    "dojo/on",
    "dojo/dom-construct",
    // template
    "dijit/form/CheckBox",
    "dijit/form/SimpleTextarea",
    "dojox/layout/TableContainer",
    "dijit/form/MultiSelect",
    "ngw-pyramid/form/KeynameTextBox",
    "ngw-pyramid/form/DisplayNameTextBox"
], function (
    declare,
    Widget,
    ErrorDisplayMixin,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    i18n,
    hbsI18n,
    template,
    array,
    on,
    domConstruct
) {
    return declare([Widget, ErrorDisplayMixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: hbsI18n(template, i18n),
        identity: "auth_user",
        title: i18n.gettext("Group"),

        postCreate: function () {
            this.inherited(arguments);

            if (this.operation === 'create') {
                this.members.destroy();
            }
        },

        validateWidget: function () {
            var widget = this;

            var result = { isValid: true, error: [] };

            array.forEach([this.displayName, this.keyname], function (subw) {
                // форсируем показ значка при проверке
                subw._hasBeenBlurred = true;
                subw.validate();

                // если есть ошибки, фиксируем их
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

            array.forEach(this.users, function (user) {
                domConstruct.create("option", {
                    innerHTML: user.label,
                    value: user.value
                }, this.members.domNode);
            }, this);
        },

        _getValueAttr: function () {
            return {
                display_name: this.displayName.get("value"),
                keyname: this.keyname.get("value"),
                description: this.description.get("value"),
                register: this.register.get("checked")
            };
        }
    });
});
