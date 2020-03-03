define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/on',
    'dojo/io-query',
    'dojo/dom-class',
    'dojo/dom-construct',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dijit/form/Select',
    'ngw-pyramid/i18n!audit',
    'ngw-pyramid/hbs-i18n',
    'ngw-pyramid/NGWDatePicker/NGWDatePicker',
    'dojo/text!./JournalFilter.hbs',
    'xstyle/css!./JournalFilter.css'
], function (
    declare, array, lang, on, ioQuery,
    domClass, domConstruct,
    _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
    Select, i18n, hbsI18n, NGWDatePicker,
    template
) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: hbsI18n(template, i18n),
        defaultRange: 7,

        constructor: function (options) {
            declare.safeMixin(this, options);
        },

        buildRendering: function () {
            if (this.dateFrom === null || this.dateTo === null) {
                this._setDefaultDateRange();
            }
            this.inherited(arguments);
        },

        postCreate: function () {
            array.forEach(this.users, lang.hitch(this, function (user) {
                this.userSelect.addOption({
                    label: user.label,
                    value: user.value
                });
                if (user.selected) {
                    this.userSelect.set('value', user.value);
                }
            }));

            on(this.searchButton, 'click', lang.hitch(this, function () {
                window.location.href = this.action + '?' + this._getQuery();
            }));

            on(this.exportButton, 'click', lang.hitch(this, function () {
                window.location.href = this.exportUrl + '?' + this._getQuery();
            }));
        },

        _getQuery: function () {
            var query = {
                date_from: this.dateRange.dateFrom,
                date_to: this.dateRange.dateTo,
                user: this.userSelect.get('value')
            };

            return ioQuery.objectToQuery(query);
        },

        _setDefaultDateRange: function () {
            function getISODate(date, offsetDays) {
                var timeZoneOffset = date.getTimezoneOffset(),
                    result;

                date.setMinutes(date.getMinutes() - timeZoneOffset);
                if (!offsetDays) {
                    result = date.toISOString().slice(0, 10);
                } else {
                    date.setDate(date.getDate() + offsetDays);
                    result = date.toISOString().slice(0, 10);
                }
                return result;
            }

            if (!this.dateFrom && !this.dateTo) {
                this.dateTo = getISODate(new Date());
                this.dateFrom = getISODate(new Date(), -this.defaultRange);
            } else if (!this.dateTo) {
                this.dateTo = getISODate(new Date(this.dateFrom.replace(/-/g, ',')), this.defaultRange);
            } else if (!this.dateFrom) {
                this.dateFrom = getISODate(new Date(this.dateTo.replace(/-/g, ',')), -this.defaultRange);
            }
        }
    });
});
