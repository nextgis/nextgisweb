define([
    "dojo/_base/declare",
    "dijit/form/Select",
    "@nextgisweb/pyramid/i18n!",
    "@nextgisweb/pyramid/settings!"
], function (
    declare,
    Select,
    i18n,
    settings
) {
    return declare([Select], {
        _setValueAttr: function (value) {
            if (value === null) {
                arguments[0] = '';
            }
            return this.inherited(arguments);
        },
        postCreate: function () {
            this.inherited(arguments);

            this.addOption({
                value: null,
                label: i18n.gettext("Browser default")
            });
            settings.langages.forEach(function (langage) {
                this.addOption({ value: langage.value, label: langage.display_name});
            }.bind(this));
        }
    });
});
