define([
    "dojo/_base/declare",
    "ngw/modelWidget/Widget",
    "dijit/Editor"
], function (
    declare,
    Widget,
    Editor
) {
    return declare([Widget, Editor], {
        title: "Описание"
    });
});