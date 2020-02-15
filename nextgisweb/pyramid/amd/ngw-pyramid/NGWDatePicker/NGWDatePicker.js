define([
    'dojo/_base/declare',
    'ngw-pyramid/i18n!pyramid',
    'ngw-pyramid/hbs-i18n',
    'dojo/_base/lang',
    'dojo/dom-class',
    'dojo/dom-construct',
    'dojo/on',
    'dojo/Evented',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dijit/form/DateTextBox',
    'dojo/text!./NGWDatePicker.hbs'
], function (
    declare,
    i18n,
    hbsI18n,
    lang,
    domClass,
    domConstruct,
    on,
    Evented,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    DateTextBox,
    template
) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Evented], {
        templateString: hbsI18n(template, i18n),
        dateFrom: '',
        dateTo: '',

        constructor: function (options) {
            declare.safeMixin(this, options);
        },

        postCreate: function () {
            var dateValue;

            on(this.dateFromControl, 'change', lang.hitch(this, function () {
                dateValue = this.dateFromControl.value;
                this.dateFrom = dateValue ? this._dateToString(dateValue) : '';
            }));

            on(this.dateToControl, 'change', lang.hitch(this, function () {
                dateValue = this.dateToControl.value;
                this.dateTo = dateValue ? this._dateToString(dateValue) : '';
            }));
        },

        _dateToString: function (date) {
            var timeZoneOffset = date.getTimezoneOffset();
            date.setMinutes(date.getMinutes() - timeZoneOffset);
            return date.toISOString().slice(0, 10);
        }
    });
});
