define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/dom-class',
    'dojo/dom-construct',
    'dojo/on',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dijit/form/DateTextBox',
    '@nextgisweb/pyramid/i18n!',
    'dojo/text!./NGWDatePicker.hbs'
], function (
    declare, lang, domClass, domConstruct,
    on, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
    DateTextBox, i18n, template
) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: i18n.renderTemplate(template),
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
