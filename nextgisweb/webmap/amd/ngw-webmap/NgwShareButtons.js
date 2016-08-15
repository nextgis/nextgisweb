/* globals define, console */
define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/dom-style",
    "dojo/on",
    "dojo/query",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/layout/ContentPane",
    "ngw-pyramid/i18n!webmap",
    "ngw-pyramid/hbs-i18n",
    "dojo/text!./template/NgwShareButtons.hbs",
    "ngw/settings!webmap",
    "ngw-webmap/Permalink",
    "xstyle/css!./template/resources/NgwShareButtons/css/fontello.css",
    "xstyle/css!./template/resources/NgwShareButtons/NgwShareButtons.css"
], function (declare, array, lang, domStyle, on, query,
             _TemplatedMixin, _WidgetsInTemplateMixin, ContentPane,
             i18n, hbsI18n, template, settings, Permalink) {
    return declare([ContentPane, _TemplatedMixin, _WidgetsInTemplateMixin], {
        title: i18n.gettext("Layers"),
        templateString: hbsI18n(template, i18n),
        url: window.location.href,

        constructor: function (params) {
            this.permalink = Permalink.getInstance(params.display);
        },

        postCreate: function () {
            on(query("a.permalink", this.domNode), "click",
                lang.hitch(this, function () {
                    this.permalink.showPermalink();
            }));
        },

        startup: function () {
            this.inherited(arguments);
        }
    });
});
