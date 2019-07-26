define([
    'dojo/_base/declare', 'dojo/on', 'dijit/_WidgetBase', 'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin',
    'ngw-pyramid/i18n!webmap', 'ngw-pyramid/hbs-i18n',
    'dojo/text!./AnnotationsSettings.hbs',
    'xstyle/css!./AnnotationsSettings.css',
    'xstyle/css!' + ngwConfig.amdUrl + 'dojox/widget/ColorPicker/ColorPicker.css',
    'dijit/form/NumberTextBox', 'dijit/form/DropDownButton', 'dojox/widget/ColorPicker'
], function (declare, on, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, i18n, hbsI18n, template) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: hbsI18n(template, i18n)
    });
});
