/*global define, ngwConfig*/
define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/request/xhr",
    "dojo/json",
    "ngw/route",
    "ngw-pyramid/i18n!pyramid",
    "ngw-pyramid/hbs-i18n",
    "dojo/text!./template/MiscellaneousForm.hbs",
    // template
    "dijit/form/Button",
    "dijit/layout/ContentPane",
    "dijit/layout/BorderContainer",
    "dojox/layout/TableContainer",
    "dijit/form/Select"
], function (
    declare,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    xhr,
    json,
    route,
    i18n,
    hbsI18n,
    template
) {
    var API_URL = route.pyramid.miscellaneous();

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
            xhr.get(API_URL, {
                handleAs: 'json'
            }).then(function (data) {
                widget.wMeasurementUnits.set('value', data.units);
                widget.wDegreeFormat.set('value', data.degree_format);
            });
        },

        save: function () {
            xhr.put(API_URL, {
                handleAs: 'json',
                headers: {
                    "Content-Type": "application/json"
                },
                data: json.stringify({
                    units: this.wMeasurementUnits.get('value'),
                    degree_format: this.wDegreeFormat.get('value')
                })
            }).then(
                function () {
                    window.location.reload(true);
                },
                function () {
                    alert("Error!");
                }
            );
        }
    });
});
