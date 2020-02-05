define([
    'dojo/_base/declare',
    'ngw-pyramid/i18n!pyramid',
    'ngw-pyramid/hbs-i18n',
    'dojo/_base/lang',
    'dojo/dom-class',
    'dojo/dom-construct',
    'dojo/_base/array',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    "dijit/_WidgetsInTemplateMixin",
    "dijit/form/Select",
    "ngw-pyramid/NGWDatePicker/NGWDatePicker",
    "dojo/text!./JournalFilter.hbs",
    "xstyle/css!./JournalFilter.css"
], function (
    declare,
    i18n,
    hbsI18n,
    lang,
    domClass,
    domConstruct,
    array,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    Select,
    NGWDatePicker,
    template
) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin],{
        templateString: hbsI18n(template, i18n),
        buttonText: i18n.gettext('Search'),
        constructor: function (options) {
            declare.safeMixin(this,options);
            this.dateTo = '2015-06-03';
            if (!this.dateFrom || !this.dateTo){
                this._setDefaultDateRange();
            }
        },
        postCreate: function(){
            array.forEach(this.users, lang.hitch(this, function(user){
                this.userSelect.addOption({
                    label: user.label,
                    value: user.value,
                    selected: user.selected
                });
            }));
        },
        _setDefaultDateRange() {
            function getISODate(date, offsetDays) {
                var result;
                if (!offsetDays) {
                    result = date.toISOString().slice(0, 10);
                } else {
                    date.setDate(date.getDate() + offsetDays);
                    result = date.toISOString().slice(0, 10);
                }
                return result;
            }

            if (!this.dateFrom && !this.dateTo){
                this.dateTo = getISODate(new Date());
                this.dateFrom = getISODate(new Date(), -7);
            } else if (!this.dateTo) { 
                this.dateTo = getISODate(new Date(this.dateFrom.replace(/-/g, ',')), 7);
            } else if (!this.dateFrom) {
                this.dateFrom = getISODate(new Date(this.dateTo.replace(/-/g, ',')), -7);
            }

        }
    });
});
