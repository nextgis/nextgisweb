/*global define*/
define([
    "dojo/_base/declare",
    "dijit/Editor"
], function (
    declare,
    Editor
) {
    return declare([Editor], {
        title: "Описание",

        _getValueAttr: function () {
            var value = this.value;
            value = value.replace("<br _moz_editor_bogus_node=\"TRUE\" />", "");
            if (value === '<br />') { value = ''; }
            return value;
        }
    });
});
