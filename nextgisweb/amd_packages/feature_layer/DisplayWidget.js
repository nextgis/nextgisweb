define([
    "dojo/_base/declare",
    "dijit/layout/ContentPane"
], function (
    declare,
    ContentPane
) {
    return declare(ContentPane, {
        _feature: null,

        render: function () {
            // abstract
        },

        _setFeatureAttr: function (value) {
            if (this._feature != value) {
                this._feature = value;
                this.render();
            };
        },

        _getFeatureAttr: function () {
            return this._feature;
        }
    });
});