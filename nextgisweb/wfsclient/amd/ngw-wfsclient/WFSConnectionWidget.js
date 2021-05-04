define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "@nextgisweb/pyramid/i18n!",
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
    serialize,
    template
) {
    var url_re = /^(https?:\/\/)([a-zа-яё0-9\-._~%]+|\[[a-zа-яё0-9\-._~%!$&'()*+,;=:]+\])+(:[0-9]+)?(\/[a-zа-яё0-9\-._~%!$&'()*+,;=:@]+)*\/?(\?[a-zа-яё0-9\-._~%!$&'()*+,;=:@\/?]*)?$/i;

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, serialize.Mixin], {
        title: i18n.gettext("WFS connection"),
        templateString: i18n.renderTemplate(template),
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
