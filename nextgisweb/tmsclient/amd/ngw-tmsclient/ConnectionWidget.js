define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dijit/layout/ContentPane",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-resource/serialize",
    "@nextgisweb/pyramid/i18n!",
    // resource
    "dojo/text!./template/ConnectionWidget.hbs",
    "@nextgisweb/pyramid/settings!",
    // template
    "dijit/form/ValidationTextBox",
    "dijit/form/Select",
    "dijit/form/CheckBox",
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
    template,
    settings
) {
    var url_template_re = /^(https?:\/\/)([a-zа-яё0-9\-._~%]+|\[[a-zа-яё0-9\-._~%!$&'()*+,;=:]+\])+(:[0-9]+)?(\/[a-zа-яё0-9\-._~%!$&'()*+,;=:@\{\}]+)*\/?(\?[a-zа-яё0-9\-._~%!$&'()*+,;=:@\/\{\}?]*)?$/i;

    return declare([ContentPane, serialize.Mixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: i18n.renderTemplate(template),
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
                this.wUsername.set("disabled", hold_params);
                this.wPassword.set("disabled", hold_params);
            }.bind(this));

            this.wURLTemplate.validator = function (value) {
                var success = url_template_re.test(value);
                return success;
            }.bind(this);
        },

        serializeInMixin: function (data) {
            var url_template = this.wURLTemplate.get("value"),
                capmode = this.wCapmode.get("value"),
                apikey = this.wAPIKey.get("value"),
                apikey_param = this.wAPIKeyParam.get("value"),
                username = this.wUsername.get("value"),
                password = this.wPassword.get("value");
            if (url_template === "") {
                lang.setObject(this.serializePrefix + ".url_template", null, data);
            }
            if (capmode === "") {
                lang.setObject(this.serializePrefix + ".capmode", null, data);
            }
            if (apikey === "") {
                lang.setObject(this.serializePrefix + ".apikey", null, data);
            }
            if (apikey_param === "") {
                lang.setObject(this.serializePrefix + ".apikey_param", null, data);
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
