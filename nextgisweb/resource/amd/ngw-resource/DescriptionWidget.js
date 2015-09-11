define([
    "dojo/_base/declare",
    "dijit/Editor",
    "dijit/_editor/plugins/LinkDialog",
    "ngw-resource/serialize",
    "ngw-pyramid/i18n!resource"
], function (
    declare,
    Editor,
    LinkDialog,
    serialize,
    i18n
) {
    return declare("ngw.resource.DescriptionWidget", [Editor, serialize.Mixin], {
        title: i18n.gettext("Description"),
        extraPlugins: ["|", "createLink", "unlink"],

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
