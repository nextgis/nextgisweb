/* globals define */
define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dijit/layout/ContentPane",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-resource/serialize",
    "ngw-pyramid/i18n!tmsclient",
    "ngw-pyramid/hbs-i18n",
    // resource
    "dojo/text!./template/ConnectionWidget.hbs",
    "ngw/settings!tmsclient",
    // template
    "dijit/form/ValidationTextBox",
    "dijit/form/Select",
    "dojox/layout/TableContainer"
], function (
    declare,
    array,
    lang,
    ContentPane,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    serialize,
    i18n,
    hbsI18n,
    template,
    settings
) {
    return declare([ContentPane, serialize.Mixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: hbsI18n(template, i18n),
        title: i18n.gettext("TMS connection"),
        serializePrefix: "tmsclient_connection",

        postCreate: function () {
            this.inherited(arguments);

            array.forEach(settings.schemes, function (i) {
                this.wScheme.addOption([{value: i, label: i}]);
            }, this);

            if (this.value) {
                this.wScheme.set("value", this.value.scheme);
            }
        },

        serializeInMixin: function (data) {
            var apikey = this.wAPIKey.get("value"),
                apikey_param = this.wAPIKeyParam.get("value");
            if (apikey === "") {
                lang.setObject(this.serializePrefix + ".apikey", null, data);
            }
            if (apikey_param === "") {
                lang.setObject(this.serializePrefix + ".apikey_param", null, data);
            }
        }
    });
});
