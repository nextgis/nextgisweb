/*global define, ngwConfig*/
define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/promise/all",
    "dojo/request/xhr",
    "dojo/json",
    "ngw/route",
    "ngw-pyramid/ErrorDialog/ErrorDialog",
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
    all,
    xhr,
    json,
    route,
    ErrorDialog,
    i18n,
    hbsI18n,
    template
) {
    var API_URL = route.pyramid.miscellaneous();
    var SRS_URL = route.spatial_ref_sys.collection();

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
            all([
                xhr.get(API_URL, {handleAs: 'json'}),
                xhr.get(SRS_URL, {handleAs: 'json'})
            ]).then(function (res) {
                var data = res[0];
                var srs_list = res[1];
                srs_list.forEach(function(srs) {
                    widget.wMeasurementSRID.addOption({value: srs.id,label: srs.display_name});
                });
                widget.wMeasurementUnits.set('value', data.units);
                widget.wDegreeFormat.set('value', data.degree_format);
                widget.wMeasurementSRID.set('value', data.measurement_srid);
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
                    degree_format: this.wDegreeFormat.get('value'),
                    measurement_srid: this.wMeasurementSRID.get('value')
                })
            }).then(
                function () {
                    window.location.reload(true);
                },
                function (err) { new ErrorDialog({response: err}).show() }
            );
        }
    });
});
