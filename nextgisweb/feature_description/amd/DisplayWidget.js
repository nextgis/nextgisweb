define([
    "dojo/_base/declare",
    "ngw-feature-layer/DisplayWidget"
], function (
    declare,
    DisplayWidget
) {
    return declare(DisplayWidget, {
        title: "Описание",

        renderValue: function (value) {
            this.domNode.innerHTML = value;
        }
    });
});