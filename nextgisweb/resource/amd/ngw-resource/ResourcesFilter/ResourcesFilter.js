define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-pyramid/hbs-i18n",
    "ngw-pyramid/i18n!resource",
    "dojo/text!./ResourcesFilter.hbs",
    "xstyle/css!./ResourcesFilter.css",
    "dijit/form/TextBox"
], function (
    declare,
    lang,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    hbsI18n,
    i18n,
    template
) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: hbsI18n(template, i18n),
        baseClass: "resources-filter",
        title: i18n.gettext("Search resources")
    });
});
