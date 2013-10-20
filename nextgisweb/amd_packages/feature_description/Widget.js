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
        extraPlugins: ['|', 'createLink', 'unlink']
    });
});