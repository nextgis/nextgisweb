define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/dom-style",
    "dojo/on",
    "dojo/query",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/layout/ContentPane",
    "ngw-pyramid/i18n!webmap",
    "ngw-pyramid/hbs-i18n",
    "dojo/text!./LinkToMainMap.hbs",
    "../NgwShareButtons/NgwShareButtons",
    "xstyle/css!./LinkToMainMap.css"
], function (declare, array, lang, domStyle, on, query,
             _WidgetBase, _TemplatedMixin, ContentPane,
             i18n, hbsI18n, template, NgwShareButtons) {
    return declare([_WidgetBase, _TemplatedMixin], {
        templateString: hbsI18n(template, i18n),
        tinyDisplayUrl: null,

        constructor: function (url) {
            this.inherited(arguments);
            this.tinyDisplayUrl = url;
            this.title = i18n.gettext('Open full map');
        },

        startup: function () {
            this.inherited(arguments);
        }
    });
});
