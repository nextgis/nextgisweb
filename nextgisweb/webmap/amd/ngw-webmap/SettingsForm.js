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
    "@nextgisweb/pyramid/i18n!",
    "dojo/text!./template/SettingsForm.hbs",
    // template
    "dijit/form/Button",
    "dijit/form/CheckBox",
    "dijit/form/NumberTextBox",
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
    template
) {
    var API_URL = route.webmap.settings();
    var SRS_URL = route.spatial_ref_sys.collection();

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: i18n.renderTemplate(template),

        postCreate: function () {
            this.inherited(arguments);
            this.buttonSave.on("click", this.save.bind(this));
        },

        startup: function () {
            this.inherited(arguments);
            all([
                xhr.get(API_URL, {handleAs: 'json'}),
                xhr.get(SRS_URL, {handleAs: 'json'})
            ]).then(function (res) {
                var srs_list = res[1];
                srs_list.forEach(function(srs) {
                    this.wMeasurementSRID.addOption({value: srs.id, label: srs.display_name});
                }.bind(this));

                var data = res[0];
                this.wIdentifyRadius.set('value', data.identify_radius);
                this.wIdentifyAttributes.set('value', data.identify_attributes);

                this.wPopupWidth.set('value', data.popup_width);
                this.wPopupHeight.set('value', data.popup_height);

                this.wNominatimEnabled.set('value', data.nominatim_enabled);
                this.wNominatimExtent.set('value', data.nominatim_extent);

                this.wUnitsLength.set('value', data.units_length);
                this.wUnitsArea.set('value', data.units_area);
                this.wDegreeFormat.set('value', data.degree_format);
                this.wMeasurementSRID.set('value', data.measurement_srid);
            }.bind(this));
        },

        save: function () {
            xhr.put(API_URL, {
                handleAs: 'json',
                headers: {
                    "Content-Type": "application/json"
                },
                data: json.stringify({
                    identify_radius: this.wIdentifyRadius.get('value'),
                    identify_attributes: this.wIdentifyAttributes.get('value'),

                    popup_width: this.wPopupWidth.get('value'),
                    popup_height: this.wPopupHeight.get('value'),

                    nominatim_enabled: this.wNominatimEnabled.get('value'),
                    nominatim_extent: this.wNominatimExtent.get('value'),

                    units_length: this.wUnitsLength.get('value'),
                    units_area: this.wUnitsArea.get('value'),
                    degree_format: this.wDegreeFormat.get('value'),
                    measurement_srid: this.wMeasurementSRID.get('value')
                })
            }).then(
                function () {
                    window.location.reload(true);
                },
                ErrorDialog.xhrError
            );
        }
    });
});
