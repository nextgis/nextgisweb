/* globals define, console */
define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/dom-style",
    "dojo/on",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/layout/ContentPane",
    "ngw-pyramid/i18n!webmap",
    "ngw-pyramid/hbs-i18n",
    "dojo/text!./template/SocialButtons.hbs",
    "ngw/settings!webmap",
    "xstyle/css!./template/resources/SocialButtons/css/fontello.css",
    "xstyle/css!./template/resources/SocialButtons/SocialButtons.css"
], function (declare, array, lang, domStyle, on,
             _TemplatedMixin, _WidgetsInTemplateMixin, ContentPane,
             i18n, hbsI18n, template, settings) {
    return declare([ContentPane, _TemplatedMixin, _WidgetsInTemplateMixin], {
        title: i18n.gettext("Layers"),
        templateString: hbsI18n(template, i18n),
        url: window.location.href,

        constructor: function () {

        },

        postCreate: function () {

        },

        startup: function () {
            this.inherited(arguments);
        }
    });
});
