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
                ext = feature ? feature.ext.feature_description : null,
                containerNode = this.containerNode;

            this.set("disabled", !ext);

            containerNode.innerHTML = ext;
        }
    });
});