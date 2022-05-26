define([
    "dojo/_base/declare",
    "ngw-pyramid/modelWidget/Widget",
    "@nextgisweb/pyramid/i18n!",
    "dijit/Editor",
    "dijit/_editor/plugins/LinkDialog",
    "dijit/_editor/plugins/ViewSource",
], function (
    declare,
    Widget,
    i18n,
    Editor
) {
    return declare([Widget, Editor], {
        title: i18n.gettext("Description"),
        extraPlugins: ["|", {
            name: "dijit/_editor/plugins/LinkDialog",
            command: "createLink",
            // Allow everything except malicious javascript
            urlRegExp: '(?!\\s*javascript\\s*:).*',
        }, "unlink", "insertImage", "viewsource"],

        hasData: function () {
            return this.get('value') !== '';
        },

        _getValueAttr: function () {
            var value = this.getValue(true);
            if (value) {
                value = value.replace("<br _moz_editor_bogus_node=\"TRUE\" />", "");
            }
            if (value === '<br />') { value = ''; }
            return value;
        },

        _setValueAttr: function (value) {
            if (value !== null && value !== undefined) {
                this.inherited(arguments);
            } else {
                this.set("value", "");
            }
        }
    });
});
