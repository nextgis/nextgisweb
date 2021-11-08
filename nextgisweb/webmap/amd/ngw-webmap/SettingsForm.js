define([
    "dojo/_base/declare", "dijit/_WidgetBase", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
    "dojo/promise/all", "dojo/request/xhr", "dojo/dom-style", "dojo/json",
    "ngw/route", "ngw-pyramid/ErrorDialog/ErrorDialog",
    "@nextgisweb/pyramid/i18n!", "dojo/text!./template/SettingsForm.hbs", 
    "dijit/form/Button", "dijit/form/CheckBox", "dijit/form/NumberTextBox", "dijit/layout/ContentPane",
    "dijit/layout/BorderContainer", "dojox/layout/TableContainer", "dijit/form/Select", "dijit/form/ValidationTextBox"
], function (
    declare, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
    all, xhr, domStyle, json,
    route, ErrorDialog,
    i18n, template
) {
    var API_URL = route.webmap.settings();
    var SRS_URL = route.spatial_ref_sys.collection();

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: i18n.renderTemplate(template),

        postCreate: function () {
            this.inherited(arguments);
            this._bindEvents();
        },

        startup: function () {
            this.inherited(arguments);
            all([
                xhr.get(API_URL, {handleAs: 'json'}),
                xhr.get(SRS_URL, {handleAs: 'json'})
            ]).then(function (res) {
                const [webMapSettings, srsList] = res;
                this._setValues(webMapSettings, srsList);
                this._handleGeocoderControls();
                this._handleAddressEnabled();
            }.bind(this));
        },

        _bindEvents: function () {
            this.buttonSave.on("click", this._save.bind(this));
            this.wAddressGeocoder.on("change", this._handleGeocoderControls.bind(this))
            this.wAddressEnabled.on("change", this._handleAddressEnabled.bind(this))
        },

        _setValues: function (webMapSettings, srsList) {
            srsList.forEach(function (srs) {
                this.wMeasurementSRID.addOption({value: srs.id, label: srs.display_name});
            }.bind(this));

            this.wIdentifyRadius.set('value', webMapSettings.identify_radius);
            this.wIdentifyAttributes.set('value', webMapSettings.identify_attributes);

            this.wPopupWidth.set('value', webMapSettings.popup_width);
            this.wPopupHeight.set('value', webMapSettings.popup_height);

            this.wAddressEnabled.set('value', webMapSettings.address_search_enabled);
            this.wAddressExtent.set('value', webMapSettings.address_search_extent);
            this.wAddressGeocoder.set('value', webMapSettings.address_geocoder);
            this.wYandexApiGeocoderKey.set('value', webMapSettings.yandex_api_geocoder_key);
            this.wNominatimCountryCodes.set('value', webMapSettings.nominatim_countrycodes);

            this.wUnitsLength.set('value', webMapSettings.units_length);
            this.wUnitsArea.set('value', webMapSettings.units_area);
            this.wDegreeFormat.set('value', webMapSettings.degree_format);
            this.wMeasurementSRID.set('value', webMapSettings.measurement_srid);
        },

        _handleGeocoderControls: function () {
            const addressGeocoder = this.wAddressGeocoder.get('value');
            this._displayWidget(this.wYandexApiGeocoderKey,addressGeocoder === 'yandex');
            this._displayWidget(this.wNominatimCountryCodes,addressGeocoder === 'nominatim');
        },
        
        _handleAddressEnabled: function () {
            const addressDisabled = this.wAddressEnabled.get("value") !== "on";

            this.wAddressExtent.set("disabled", addressDisabled);
            this.wAddressGeocoder.set("disabled", addressDisabled);
            this.wYandexApiGeocoderKey.set("disabled", addressDisabled);
            this.wNominatimCountryCodes.set("disabled", addressDisabled);
        },
        
        _displayWidget: function (widget, shouldDisplay) {
            const domNode = widget.domNode;

            if (!domNode.parentNode || !domNode.parentNode.parentNode) {
                return false;
            }

            if (shouldDisplay) {
                domStyle.set(domNode.parentNode.parentNode, 'display', 'table-row');
            } else {
                domStyle.set(domNode.parentNode.parentNode, 'display', 'none');
                widget.set('value', null);
            }
        },
        
        _validate: function () {
            return this.wNominatimCountryCodes.validate();
        },

        _save: function () {
            if (!this._validate()) {
                ErrorDialog.showMessage(
                    i18n.gettext("Validation error"),
                    i18n.gettext("Errors found during data validation. Controls with errors marked in red. Fix it, please.")
                );
                return false;
            }            
            
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

                    address_search_enabled: this.wAddressEnabled.get('value') === 'on',
                    address_search_extent: this.wAddressExtent.get('value') === 'on',
                    address_geocoder: this.wAddressGeocoder.get('value'),
                    yandex_api_geocoder_key: this.wYandexApiGeocoderKey.get('value'),
                    nominatim_countrycodes: this.wNominatimCountryCodes.get('value'),

                    units_length: this.wUnitsLength.get('value'),
                    units_area: this.wUnitsArea.get('value'),
                    degree_format: this.wDegreeFormat.get('value'),
                    measurement_srid: this.wMeasurementSRID.get('value')
                })
            }).then(
                function () {
                    window.location.reload();
                },
                ErrorDialog.xhrError
            );
        }
    });
});
