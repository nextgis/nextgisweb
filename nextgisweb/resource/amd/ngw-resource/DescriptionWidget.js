define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dijit/Editor",
    "ngw-resource/serialize",
    "@nextgisweb/pyramid/i18n!",
    "dijit/_editor/plugins/LinkDialog",
    "dijit/_editor/plugins/ViewSource"
], function (
    declare,
    lang,
    Editor,
    serialize,
    i18n
) {
    return declare("ngw.resource.DescriptionWidget", [Editor, serialize.Mixin], {
        title: i18n.gettext("Description"),
        extraPlugins: ["|", {
            name: "dijit/_editor/plugins/LinkDialog",
            command: "createLink",
            // Allow everything except malicious javascript
            urlRegExp: '(?!\\s*javascript\\s*:).*',
        }, "unlink", "insertImage", "viewsource"],
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
