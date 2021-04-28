/*global define, ngwConfig*/
define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-pyramid/ErrorDialog/ErrorDialog",
    "@nextgisweb/jsrealm/api",
    "ngw-pyramid/i18n!pyramid",
    "ngw-pyramid/hbs-i18n",
    "dojo/text!./template/SystemNameForm.hbs",
    // template
    "dijit/form/Button",
    "dijit/form/TextBox",
    "dijit/layout/ContentPane",
    "dijit/layout/BorderContainer"
], function (
    declare,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    ErrorDialog,
    api,
    i18n,
    hbsI18n,
    template
) {
    var route = api.route('pyramid.system_name');

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: hbsI18n(template, i18n),

        postCreate: function () {
            this.inherited(arguments);
            var widget = this;
            this.buttonSave.on("click", function () {
                widget.save();
            });
        },

        startup: function () {
            this.inherited(arguments);
            var widget = this;
            route.get().then(function (data) {
                widget.wSystemTitle.set('value', data.full_name);
            });
        },

        save: function () {
            var data = { full_name: this.wSystemTitle.get('value') };
            route.post({ json: data }).then(function () {
                window.location.reload(true)
            }, function (err) {
                new ErrorDialog(err).show()
            });
        }
    });
});
