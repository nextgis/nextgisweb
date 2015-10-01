/*global define, ngwConfig*/
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "ngw/modelWidget/Widget",
    "ngw/modelWidget/ErrorDisplayMixin",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-pyramid/i18n!auth",
    "ngw-pyramid/hbs-i18n",
    "dojo/text!./template/UserWidget.hbs",
    "dojo/_base/array",
    "dojo/on",
    // template
    "dijit/form/CheckBox",
    "dijit/form/ValidationTextBox",
    "dijit/form/SimpleTextarea",
    "dojox/layout/TableContainer",
    "dojox/form/CheckedMultiSelect",
    "ngw-pyramid/form/KeynameTextBox",
    "ngw-pyramid/form/DisplayNameTextBox",
    // css
    "xstyle/css!" + ngwConfig.amdUrl + 'dojox/form/resources/CheckedMultiSelect.css'
], function (
    declare,
    lang,
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
            this.cbSuperuser.set("checked", value.superuser);
            this.cbDisabled.set("checked", value.disabled);
            this.description.set("value", value.description);

            // По простому не работает, сделаем по сложному
            var groups = lang.clone(this.groups);
            if (this.value) {
                array.forEach(groups, function (opt) {
                    opt.selected = (this.value.member_of.indexOf(opt.value) !== -1);
                }, this);
            }
            this.memberOf.addOption(this.groups);
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
