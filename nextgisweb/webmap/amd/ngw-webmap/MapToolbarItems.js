define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dojo/text!./template/MapToolbarItems.hbs',
    'ngw-pyramid/i18n!webmap',
    'ngw-pyramid/hbs-i18n',
    'dijit/form/DropDownButton',
    'dijit/form/Button',
    'dijit/ToolbarSeparator'
], function (declare, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
             template, i18n, hbsI18n) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: hbsI18n(template, i18n)
    });
});
