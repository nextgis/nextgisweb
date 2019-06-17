/* globals define */
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/request/xhr",
    "ngw/route",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-resource/serialize",
    "ngw-pyramid/i18n!webmap",
    "ngw-pyramid/hbs-i18n",
    // resource
    "dojo/text!./OtherSettings.hbs",
    // template
    "dijit/form/Select",
    "dijit/form/CheckBox",
    "dojox/layout/TableContainer"
], function (
    declare,
    lang,
    xhr,
    route,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    serialize,
    i18n,
    hbsI18n,
    template
) {
    return declare([_WidgetBase, serialize.Mixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        title: i18n.gettext("Settings"),
        templateString: hbsI18n(template, i18n),
        serializePrefix: "webmap",

       postCreate: function () {
            this.inherited(arguments);
        },

        serializeInMixin: function (data) {
            if (data.webmap === undefined) { data.webmap = {}; }
            var value = data.webmap;
            value.editable = this.chbEditable.get("checked");
        },

        deserializeInMixin: function (data) {
            var value = data.webmap;
            this.chbEditable.set("checked", value.editable);
        }
    });
});
