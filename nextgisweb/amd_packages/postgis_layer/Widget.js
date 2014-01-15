define([
    "dojo/_base/declare",
    "ngw/modelWidget/Widget",
    "ngw/modelWidget/ErrorDisplayMixin",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./templates/Widget.html",
    "ngw/settings!postgis_layer",
    // util
    "dojo/_base/array",
    "dojo/Deferred",
    "dojo/when",
    // template
    "dijit/form/ValidationTextBox",
    "dijit/form/Select",
    "dojox/layout/TableContainer",
    "ngw/form/SpatialRefSysSelect"
], function (
    declare,
    Widget,
    ErrorDisplayMixin,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    template,
    settings,
    array,
    Deferred,
    when
) {
    return declare([Widget, ErrorDisplayMixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        identity: "postgis_layer",
        title: "Слой PostGIS",

        postCreate: function () {
            this.inherited(arguments);

            this.wConnection.addOption(array.map(settings.connections, function(item) {
                return { value: item, label: item}
            }));
        },

        _getValueAttr: function () {
            var result = { 
                connection: this.wConnection.get("value"),
                table: this.wTable.get("value"),
                column_id: this.wColumnId.get("value"),
                column_geom: this.wColumnGeom.get("value"),
                srs_id: this.wSRS.get("value"),
            };

            return result;
        },

        validateWidget: function () {
            var widget = this;
            var result = { isValid: true, error: [] };

            array.forEach([this.wTable, this.wColumnId, this.wColumnGeom], function (subw) {
                // форсируем показ значка при проверке
                subw._hasBeenBlurred = true;
                subw.validate();   

                // если есть ошибки, фиксируем их
                if ( !subw.isValid() ) {
                    result.isValid = false;
                };
            });

            return result;
        }

    });
})