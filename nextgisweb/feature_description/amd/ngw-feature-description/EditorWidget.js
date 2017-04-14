define([
    "dojo/_base/declare",
    "ngw-pyramid/modelWidget/Widget",
    "ngw-pyramid/i18n!feature_description",
    "dijit/Editor",
    "dijit/_editor/plugins/LinkDialog"
], function (
    declare,
    Widget,
    i18n,
    Editor
) {
    return declare([Widget, Editor], {
        title: i18n.gettext("Description"),
        extraPlugins: ['|', 'createLink', 'unlink'],

        hasData: function () {
            return this.get('value') !== '';
        },

        _getValueAttr: function () {
            var value = this.value;
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
