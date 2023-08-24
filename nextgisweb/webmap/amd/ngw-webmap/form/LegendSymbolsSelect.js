define([
    "dojo/_base/declare",
    "dijit/form/Select",
    "@nextgisweb/pyramid/i18n!webmap",
], function (declare, Select, i18n) {
    return declare([Select], {
        title: i18n.gettext("Legend"),
        options: [
            { value: "default", label: i18n.gettext("Default") },
            { value: "expand", label: i18n.gettext("Expand") },
            { value: "collapse", label: i18n.gettext("Collapse") },
            { value: "disable", label: i18n.gettext("Disable") },
        ],

        _setValueAttr: function (value) {
            if (!value) {
                arguments[0] = "default";
            }
            this.inherited(arguments);
        },

        _getValueAttr: function () {
            var value = this.value;
            if (value === "default") {
                value = null;
            }
            return value;
        },
    });
});
