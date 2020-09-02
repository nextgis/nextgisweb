/*global define, ngwConfig*/
define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/request/xhr",
    "dojo/json",
    "ngw/route",
    "ngw-pyramid/ErrorDialog/ErrorDialog",
    "ngw-pyramid/i18n!pyramid",
    "ngw-pyramid/hbs-i18n",
    "dojo/text!./template/SettingsForm.hbs",
    // template
    "dijit/form/Button",
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
    xhr,
    json,
    route,
    ErrorDialog,
    i18n,
    hbsI18n,
    template
) {
    var API_URL = route.webmap.settings();

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: hbsI18n(template, i18n),

        postCreate: function () {
            this.inherited(arguments);
            this.buttonSave.on("click", this.save.bind(this));
        },

        startup: function () {
            this.inherited(arguments);
            xhr.get(API_URL, {handleAs: 'json'}).then(function (data) {
                this.wIdentifyRadius.set('value', data.identify_radius);
                this.wPopupWidth.set('value', data.popup_width);
                this.wPopupHeight.set('value', data.popup_height);
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
                    popup_width: this.wPopupWidth.get('value'),
                    popup_height: this.wPopupHeight.get('value')
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
