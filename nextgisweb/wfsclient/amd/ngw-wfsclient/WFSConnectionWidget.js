/* globals define */
define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-pyramid/i18n!postgis",
    "ngw-pyramid/hbs-i18n",
    "ngw-resource/serialize",
    // resource
    "dojo/text!./template/WFSConnectionWidget.hbs",
    // template
    "dijit/form/ValidationTextBox",
    "dojox/layout/TableContainer"
], function (
    declare,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    i18n,
    hbsI18n,
    serialize,
    template
) {
    var url_re = /^(https?:\/\/)([a-z0-9\-._~%]+|\[[a-z0-9\-._~%!$&'()*+,;=:]+\])+(:[0-9]+)?(\/[a-z0-9\-._~%!$&'()*+,;=:@]+)*\/?(\?[a-z0-9\-._~%!$&'()*+,;=:@\/?]*)?$/;

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, serialize.Mixin], {
        title: i18n.gettext("WFS connection"),
        templateString: hbsI18n(template, i18n),
        prefix: "wfsclient_connection",

        postCreate: function () {
            this.inherited(arguments);

            this.wPath.validator = function (value) {
                var success = url_re.test(value);
                return success;
            }.bind(this);
        }
    });
});
