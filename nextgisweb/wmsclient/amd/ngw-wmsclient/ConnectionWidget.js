/* globals define */
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dijit/layout/ContentPane",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-resource/serialize",
    "ngw-pyramid/i18n!wmsclient",
    "ngw-pyramid/hbs-i18n",
    // resource
    "dojo/text!./template/ConnectionWidget.hbs",
    "ngw/settings!wmsclient",
    // template
    "dijit/form/ValidationTextBox",
    "dijit/form/Select",
    "dijit/form/CheckBox",
    "dojox/layout/TableContainer"
], function (
    declare,
    lang,
    array,
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
        title: i18n.gettext("WMS connection"),
        serializePrefix: "wmsclient_connection",

        postCreate: function () {
            this.inherited(arguments);

            array.forEach(settings.wms_versions, function (i) {
                this.wVersion.addOption([{value: i, label: i}]);
            }, this);

            if (this.value) {
                this.wVersion.set("value", this.value.version);
            }
        },

        serializeInMixin: function (data) {
            var capcache = this.wCapCache.get("value"),
                username = this.wUsername.get("value"),
                password = this.wPassword.get("value");
            if (capcache !== "") {
                lang.setObject(this.serializePrefix + ".capcache", capcache, data);
            }
            if (username === "") {
                lang.setObject(this.serializePrefix + ".username", null, data);
            }
            if (password === "") {
                lang.setObject(this.serializePrefix + ".password", null, data);
            }
        }

    });
});
