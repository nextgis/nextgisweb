define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dijit/Editor",
    "dijit/_editor/plugins/LinkDialog",
    "dijit/_editor/plugins/ViewSource",
    "ngw-resource/serialize",
    "ngw-pyramid/i18n!resource"
], function (
    declare,
    lang,
    Editor,
    LinkDialog,
    ViewSource,
    serialize,
    i18n
) {
    return declare("ngw.resource.DescriptionWidget", [Editor, serialize.Mixin], {
        title: i18n.gettext("Description"),
        extraPlugins: ["|", "createLink", "unlink", "insertImage", "viewsource"],
        serattr: "resource.description",

        constructor: function () {
            this.value = "";
            this.contentPostFilters.push(function(value) {
                return (value === "") ? null : value;
            });
        },

        _setValueAttr: function (value) {
            if (value !== null && value !== undefined) {
                this.inherited(arguments);
            } else {
                this.set("value", "");
            }
        },

        deserializeInMixin: function (data) {
            this.set("value", lang.getObject(this.serattr, false, data));
        },

        serializeInMixin: function (data) {
            return this.onLoadDeferred.then(lang.hitch(this, function () {
                lang.setObject(this.serattr, this.get("value"), data);
            }));
        }
    });
});
