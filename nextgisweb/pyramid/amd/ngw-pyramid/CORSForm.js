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
    "dojo/text!./template/CORSForm.hbs",
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
    i18n,
    hbsI18n,
    template
) {
    var API_URL = route.pyramid.cors();

    return declare([Widget, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: hbsI18n(template, i18n),

        postCreate: function () {
            this.inherited(arguments);
            var self = this;
            this.buttonSave.on("click", function () { self.save(); });
        },

        startup: function () {
            this.inherited(arguments);
            var self = this;
            xhr.get(API_URL, {
                handleAs: 'json'
            }).then(function (data) {
                var allow_origin = data.allow_origin;
                if (allow_origin !== null) {
                    self.widgetOriginList.set('value', allow_origin.join('\n'));
                }
            });
        },

        save: function () {
            var olist = array.map(this.widgetOriginList.get('value').split('\n'),
                function (i) { return lang.trim(i); });
            olist = array.filter(olist, function (i) { return i !== ''; });
            xhr.put(API_URL, {
                handleAs: 'json',
                headers: { "Content-Type": "application/json" },                
                data: json.stringify({allow_origin: olist}) 
            }).then(function () {}, function () { alert("Error!"); });
        }
    });
});
