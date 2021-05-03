define([
    "dojo/_base/declare",
    "@nextgisweb/pyramid/i18n!",
    "ngw-feature-layer/DisplayWidget"
], function (
    declare,
    i18n,
    DisplayWidget
) {
    return declare(DisplayWidget, {
        title: i18n.gettext("Description"),

        renderValue: function (value) {
            this.domNode.innerHTML = value;
        }
    });
});