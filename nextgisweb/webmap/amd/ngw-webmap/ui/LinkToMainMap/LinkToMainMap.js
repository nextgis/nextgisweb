define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "ngw-pyramid/i18n!webmap",
    "ngw-pyramid/hbs-i18n",
    "dojo/text!./LinkToMainMap.hbs",
    "xstyle/css!./LinkToMainMap.css",
    "xstyle/css!../NgwShareButtons/NgwShareButtons.css"
], function (declare, _WidgetBase, _TemplatedMixin,
             i18n, hbsI18n, template) {
    return declare([_WidgetBase, _TemplatedMixin], {
        templateString: hbsI18n(template, i18n),
        tinyDisplayUrl: null,

        constructor: function (url) {
            this.tinyDisplayUrl = url;
            this.title = i18n.gettext('Open full map');
        }
    });
});
