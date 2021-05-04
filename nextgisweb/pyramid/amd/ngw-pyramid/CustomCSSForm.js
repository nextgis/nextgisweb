define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
    "ngw-pyramid/modelWidget/Widget",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/request/xhr",
    "dojo/json",
    "ngw/route",
    "ngw-pyramid/ErrorDialog/ErrorDialog",
    "@nextgisweb/pyramid/i18n!",
    "dojo/text!./template/CustomCSSForm.hbs",
    // template
    "dijit/layout/ContentPane",
    "dijit/layout/BorderContainer",
    "dijit/form/Button",
    "ngw-pyramid/form/CodeMirror"
], function (
    declare,
    array,
    lang,
    Widget,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    xhr,
    json,
    route,
    ErrorDialog,
    i18n,
    template
) {
    var API_URL = route.pyramid.custom_css();

    return declare([Widget, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: i18n.renderTemplate(template),

        postCreate: function () {
            this.inherited(arguments);
            var self = this;
            this.buttonSave.on("click", function () { self.save(); });
        },

        startup: function () {
            this.inherited(arguments);
            var self = this;
            xhr.get(API_URL, {
                handleAs: 'text'
            }).then(function (data) {
                self.widgetBody.set('value', data);
            });
        },

        save: function () {
            var self = this;
            xhr.put(API_URL, {
                headers: { "Content-Type": "text/css" },
                data: self.widgetBody.get('value')
            }).then(function () {}, ErrorDialog.xhrError);
        }
    });
});
