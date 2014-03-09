define([
    "dojo/_base/declare",
    "dijit/layout/ContentPane",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./template/DeleteWidget.html",
    // template
    "dijit/form/CheckBox"
], function (
    declare,
    ContentPane,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    template
) {
    return declare([ContentPane, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        title: "Удаление ресурса",

        validateData: function () {
            return this.wConfirm.get("checked") === true;
        },

        serialize: function () { }
    });
});