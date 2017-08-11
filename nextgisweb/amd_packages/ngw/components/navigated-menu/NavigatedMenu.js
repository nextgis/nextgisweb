define([
    'dojo/_base/declare',
    'ngw-pyramid/i18n!webmap',
    'ngw-pyramid/hbs-i18n',
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/layout/ContentPane",
    "dojo/text!./NavigatedMenu.hbs",
    "dijit/layout/BorderContainer"
], function (
    declare,
    i18n,
    hbsI18n,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    ContentPane,
    template) {
    return declare([ContentPane,_TemplatedMixin, _WidgetsInTemplateMixin],{
        templateString: hbsI18n(template, i18n),

        constructor: function (options) {
            console.log(template);
            //this.display = options.display;
            //this.mapStates = MapStatesObserver.getInstance();
        }
    });
});