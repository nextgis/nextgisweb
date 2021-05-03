define([
    'dojo/_base/declare', 'dojo/topic',
    'dijit/_WidgetBase', 'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin',
    'dojo/_base/array', 'dojo/_base/lang', 'dojo/on', 'dojo/Evented',
    '@nextgisweb/pyramid/i18n!',
    'dojo/text!./ScalesSelect.hbs', 'dijit/form/Select',
    'xstyle/css!./ScalesSelect.css'
], function (
    declare, topic,
    _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
    array, lang, on, Evented,
    i18n,
    template) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Evented], {
        templateString: i18n.renderTemplate(template),
        
        constructor: function (options) {
            declare.safeMixin(this, options);
        },

        postCreate: function () {
            this.inherited(arguments);

            on(this.scalesSelect, 'change', lang.hitch(this, function () {
                this.emit('change', this.scalesSelect.get('value'));
            }));
        },
        
        setCurrentScale: function (scale) {
            this.scalesSelect.updateOption({value: 'none', label: '1 : ' + scale, selected: true});
        }
    });
});
