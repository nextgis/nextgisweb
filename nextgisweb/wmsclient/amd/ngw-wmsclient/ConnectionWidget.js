define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dijit/layout/ContentPane",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    // resource
    "dojo/text!./template/ConnectionWidget.html",
    "ngw/settings!wmsclient",
    // template
    "dijit/form/ValidationTextBox",
    "dijit/form/Select",
    "dojox/layout/TableContainer"
], function (
    declare,
    array,
    ContentPane,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    template,
    settings
) {
    var IDENTITY = "wmsclient_connection";

    return declare([ContentPane, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        title: "WMS-клиент",

        postCreate: function () {
            this.inherited(arguments);

            array.forEach(settings.wms_versions, function (i) {
                this.wVersion.addOption([{value: i, label: i}]);
            }, this);

            if (this.value) {
                this.wVersion.set("value", this.value.version);
            }
        },

        validateWidget: function () {
            var result = { isValid: true, error: [] };

            array.forEach([this.wURL], function (subw) {
                // форсируем показ значка при проверке
                subw._hasBeenBlurred = true;
                subw.validate();

                // если есть ошибки, фиксируем их
                if ( !subw.isValid() ) { result.isValid = false; }
            });

            return result;
        },

        serialize: function (data) {
            if (data[IDENTITY] === undefined) { data[IDENTITY] = {}; }
            var value = data[IDENTITY];

            value.url = this.wURL.get("value");
            value.version = this.wVersion.get("value");
        },

        deserialize: function (data) {
            var value = data[IDENTITY];
            this.wURL.set("value", value.url);
            this.wVersion.set("value", value.url);
        }

    });
});