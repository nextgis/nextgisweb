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

            this.wCapmode.on('change', function(value) {
                var hold_params = value === "nextgis_geoservices";

                this.wURLTemplate.required = hold_params;
                this.wURLTemplate.set("disabled", hold_params);
                this.wAPIKeyParam.set("disabled", hold_params);
                this.wScheme.set("disabled", hold_params);
            }.bind(this));
        },

        serializeInMixin: function (data) {
            var capmode = this.wCapmode.get("value"),
                apikey = this.wAPIKey.get("value"),
                apikey_param = this.wAPIKeyParam.get("value");
            if (capmode === "") {
                lang.setObject(this.serializePrefix + ".capmode", null, data);
            }
            if (apikey === "") {
                lang.setObject(this.serializePrefix + ".apikey", null, data);
            }
            if (apikey_param === "") {
                lang.setObject(this.serializePrefix + ".apikey_param", null, data);
            }
        }
    });
});
