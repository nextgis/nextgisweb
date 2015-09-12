define([
    "dojo/_base/declare",
    "dijit/layout/ContentPane",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-pyramid/hbs-i18n",
    "dojo/text!./template/DeleteWidget.hbs",
    "ngw-pyramid/i18n!resource",
    // template
    "dijit/form/CheckBox"
], function (
    declare,
    ContentPane,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    hbsI18n,
    template,
    i18n
) {
    return declare([ContentPane, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: hbsI18n(template, i18n),
        title: i18n.gettext("Delete resource"),

        validateData: function () {
            return this.wConfirm.get("checked") === true;
        },

        serialize: function () { }
    });
});