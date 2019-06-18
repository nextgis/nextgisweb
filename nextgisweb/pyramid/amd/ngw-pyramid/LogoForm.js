/*global define, ngwConfig*/
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
    "ngw-pyramid/i18n!pyramid",
    "ngw-pyramid/hbs-i18n",
    "dojo/text!./template/LogoForm.hbs",
    // template
    "dijit/layout/ContentPane",
    "dijit/layout/BorderContainer",
    "ngw-file-upload/Uploader",
    "dijit/form/Button"
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
    i18n,
    hbsI18n,
    template
) {
    return declare([Widget, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: hbsI18n(template, i18n),

        postCreate: function () {
            this.inherited(arguments);
            var self = this;
            this.buttonSave.on("click", function () { self.save(false); });
            this.buttonRestore.on("click", function () { self.save(true); });
        },

        save: function (restoreDefault) {
            var data = null;
            if (!restoreDefault) {
                data = this.wFile.get("value");
            };
            xhr.put(route.pyramid.logo(), {
                handleAs: 'json',
                headers: { "Content-Type": "application/json" },                
                data: json.stringify(data) 
            }).then(function () {
                window.location = route.pyramid.control_panel();
            }, function () { alert("Error!"); });
        }
    });
});
