/* global define */
define([
    "dojo/_base/declare",
    "dijit/Editor"
], function (
    declare,
    Editor
) {
    return declare("ngw.resource.DescriptionWidget", Editor, {
        title: "Описание",
        value: "<br/>",

        deserialize: function (data) {
            var value = data.resource.description;
            value = value === null ? "" : value;
            this.set("value", value);
        },

        serialize: function (data) {
            if (data.resource === undefined) {data.resource = {}; }
            data.resource.description = this.get("value");
        }
    });
});
