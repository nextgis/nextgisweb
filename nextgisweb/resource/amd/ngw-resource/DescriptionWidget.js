define([
    "dojo/_base/declare",
    "dijit/Editor",
    "ngw-resource/serialize"
], function (
    declare,
    Editor,
    serialize
) {
    return declare("ngw.resource.DescriptionWidget", [Editor, serialize.Mixin], {
        title: "Описание",

        constructor: function () {
            this.value = "";
        },

        postCreate: function () {
            this.inherited(arguments);
            this.serattrmap.push({key: "resource.description", widget: this});
        },

        _getValueAttr: function () {
            var value = this._get("value");
            if (value === "") { return null; }
            return value;
        },

        _setValueAttr: function (value) {
            if (value !== null) {
                this.inherited(arguments);
            } else {
                this.set("value", "");
            }
        }
    });
});
