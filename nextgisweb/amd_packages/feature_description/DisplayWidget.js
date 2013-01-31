define([
    "dojo/_base/declare",
    "feature_layer/DisplayWidget"
], function (
    declare,
    DisplayWidget
) {
    return declare(DisplayWidget, {
        title: "Описание",

        render: function () {
            var widget = this,
                feature = this._feature,
                containerNode = this.containerNode;

            containerNode.innerHTML = feature.ext.feature_description;
        }
    });
});