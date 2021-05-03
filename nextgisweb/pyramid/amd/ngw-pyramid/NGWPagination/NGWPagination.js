define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/on',
    'dojo/io-query',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'ngw-pyramid/NGWButton/NGWButton',
    '@nextgisweb/pyramid/i18n!',
    'dojo/text!./NGWPagination.hbs',
    'xstyle/css!./NGWPagination.css'
], function (
    declare, lang, on, ioQuery,
    _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
    NGWButton, i18n, template
) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: i18n.renderTemplate(template),
        action: "#",
        prevLabel: i18n.gettext('Backward'),
        nextLabel: i18n.gettext('Forward'),
        constructor: function (options) {
            declare.safeMixin(this, options);
            this.withPrev = this.prevQuery && typeof this.prevQuery  === 'object';
            this.withNext = this.nextQuery && typeof this.nextQuery  === 'object';
        },

        buildRendering: function () {
            this.inherited(arguments);
            if (this.withPrev) {
                this.prevButton = new NGWButton({
                    size: 'small',
                    color: 'primary',
                    label: this.prevLabel,
                    type: 'outlined',
                    icon: 'arrow_back_ios',
                    iconPosition: 'first'
                }).placeAt(this.domNode);
            }
            if (this.withNext) {
                this.nextButton = new NGWButton({
                    size: 'small',
                    color: 'primary',
                    label: this.nextLabel,
                    type: 'outlined',
                    icon: 'arrow_forward_ios',
                    iconPosition: 'last'
                }).placeAt(this.domNode);
            }
        },

        postCreate: function () {
            if (this.prevButton) {
                on(this.prevButton, 'click', lang.hitch(this, function () {
                    window.location.href = this.action + '?' + this._getQuery(this.prevQuery);
                }));
            }
            if (this.nextButton) {
                on(this.nextButton, 'click', lang.hitch(this, function () {
                    window.location.href = this.action + '?' + this._getQuery(this.nextQuery);
                }));
            }
        },

        _getQuery: function (query) {
            return ioQuery.objectToQuery(query);
        },
    });
});
