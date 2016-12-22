define([
    "dojo/_base/declare",
    "ngw-pyramid/i18n!feature_description",
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