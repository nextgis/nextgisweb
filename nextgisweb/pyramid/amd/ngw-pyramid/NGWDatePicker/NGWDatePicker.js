define([
    'dojo/_base/declare',
    'ngw-pyramid/i18n!pyramid',
    'ngw-pyramid/hbs-i18n',
    'dojo/_base/lang',
    'dojo/dom-class',
    'dojo/dom-construct',
    'dojo/on',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    "dijit/_WidgetsInTemplateMixin",
    "dijit/form/DateTextBox",
    "dojo/text!./NGWDatePicker.hbs"
], function (
    declare,
    i18n,
    hbsI18n,
    lang,
    domClass,
    domConstruct,
    on,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    DateTextBox,
    template
) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin],{
        templateString: hbsI18n(template, i18n),
        dateFrom: '',
        dateTo: '',
        constructor: function (options) {
            declare.safeMixin(this,options);
        },
        postCreate: function(){
            on(this.dateFromControl, "change", lang.hitch(this, function(){
                this.dateFrom = this.dateFromControl.value;
            }));
            on(this.dateToControl, "change", lang.hitch(this, function(){
                this.dateTo = this.dateToControl.value;
            }));
        }
    });
});
