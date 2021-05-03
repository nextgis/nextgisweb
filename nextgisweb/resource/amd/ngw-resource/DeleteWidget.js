define([
    "dojo/_base/declare",
    "dijit/layout/ContentPane",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./template/DeleteWidget.hbs",
    "@nextgisweb/pyramid/i18n!",
    // template
    "dijit/form/CheckBox"
], function (
    declare,
    ContentPane,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    template,
    i18n
) {
    return declare([ContentPane, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: i18n.renderTemplate(template),
        title: i18n.gettext("Delete resource"),

        validateData: function () {
            return this.wConfirm.get("checked") === true;
        },

        serialize: function () { }
    });
});