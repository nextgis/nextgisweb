/*global define*/
define([
    "dojo/_base/declare",
    "./Widget",
    "dijit/Editor"
], function (
    declare,
    Widget,
    Editor
) {
    return declare([Widget, Editor], {
        title: "Описание",

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
