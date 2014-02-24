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
            this.set("value", data.resource.description);
        },

        serialize: function (data) {
            if (data.resource === undefined) {data.resource = {}; }
            data.resource.description = this.get("value");
        }
    });
});
