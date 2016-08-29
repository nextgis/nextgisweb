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
    "ngw-webmap/PermalinkDialog",
    "ngw-webmap/ShareEmbeddedMapDialog",
    "xstyle/css!./template/resources/NgwShareButtons/css/fontello.css",
    "xstyle/css!./template/resources/NgwShareButtons/NgwShareButtons.css"
], function (declare, array, lang, domStyle, on, query,
             _TemplatedMixin, _WidgetsInTemplateMixin, ContentPane,
             i18n, hbsI18n, template, settings, PermalinkDialog, ShareEmbeddedMapDialog) {
    return declare([ContentPane, _TemplatedMixin, _WidgetsInTemplateMixin], {
        title: i18n.gettext("Layers"),
        templateString: hbsI18n(template, i18n),
        url: window.location.href,

        constructor: function (params) {
            this.permalinkDialog = PermalinkDialog.getInstance(params.display);
            this.shareEmbeddedMapDialog = ShareEmbeddedMapDialog.getInstance(params.display);
        },

        postCreate: function () {
            on(query("a.permalink", this.domNode), "click",
                lang.hitch(this, function () {
                    this.permalinkDialog.show();
            }));

            on(query("a.embedded-map", this.domNode), "click",
                lang.hitch(this, function () {
                    this.shareEmbeddedMapDialog.show();
            }));
        },

        startup: function () {
            this.inherited(arguments);
        }
    });
});
