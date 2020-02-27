define([
    'dojo/_base/declare',
    'ngw-pyramid/i18n!pyramid',
    'ngw-pyramid/hbs-i18n',
    "dojo/_base/lang",
    "dojo/dom-construct",
    "dojo/dom-class",
    "dojo/json",
    "dojo/Evented",
    "ngw/settings!pyramid",
    "ngw-pyramid/form/CodeMirror",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dojo/text!./ErrorCard.hbs",
    "xstyle/css!./ErrorCard.css",
], function (
    declare,
    i18n,
    hbsI18n,
    lang,
    domConstruct,
    domClass,
    json,
    Evented,
    settings,
    CodeMirror,
    _TemplatedMixin,
    _WidgetBase,
    template
) {
    return declare([_WidgetBase, _TemplatedMixin, Evented],{
        templateString: hbsI18n(template, i18n, {
            showSupportUrl: settings['support_url'].trim() !== ''
        }),
        errorTitle: "Error",
        error: undefined,
        message: undefined,
        detail: undefined,
        technicalInfoText: i18n.gettext('Technical information'),
        supportUrl: settings['support_url'] + '?lang=' + dojoConfig.locale,
        supportText: i18n.gettext('Contact support'),
        mainActionUrl: '/',
        mainActionText: i18n.gettext('Back to home'),
        constructor: function (options) {
            declare.safeMixin(this, options);
            this.errorTitleWithCode = this.error.status_code ? this.error.status_code + ' — ' + this.errorTitle : this.errorTitle;
        },
        postCreate: function() {
            if (this.message) {
                domConstruct.create('p', { innerHTML: this.message }, this.contentNode, 'last');
            }

            if (this.detail) {
                domConstruct.create('p', { innerHTML: this.detail }, this.contentNode, 'last');
            }
            this._buildTechnicalInfo();
        },
        startup: function () {
            this.inherited(arguments);
            this.technicalInfo.startup();
        },
        _buildTechnicalInfo: function() {
            this.technicalInfo = new CodeMirror({
                readonly: true,
                lineNumbers: true,
                autoHeight: true,
                lang: 'javascript',
                value: json.stringify(this.error, undefined, 2)
            }).placeAt(this.technicalInfoNode);

            this.technicalInfoLink.addEventListener('click', lang.hitch(this, function() {
               this.showTechnicalInfo();
            }));
        },
        showTechnicalInfo: function() {
            domClass.toggle(this.technicalInfoLink, 'active');
            domClass.toggle(this.technicalInfoNode, 'active');
            this.technicalInfo.resize();
             this.emit('technicalInfoToggled');
        }
    });
});
