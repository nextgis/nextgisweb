define([
    "dojo/_base/declare",
    "ngw/modelWidget/Widget",
    "dijit/Editor",
    "dijit/_editor/plugins/LinkDialog"
], function (
    declare,
    Widget,
    Editor
) {
    return declare([Widget, Editor], {
        title: "Описание",
        extraPlugins: ['|', 'createLink', 'unlink'],

        hasData: function () {
            return this.get('value') != '';
        },

        _getValueAttr: function () {
            var value = this.value;
            if (value) {
                value = value.replace("<br _moz_editor_bogus_node=\"TRUE\" />", "");
            }
            if (value === '<br />') { value = ''; }
            return value;
        }       
    });
});