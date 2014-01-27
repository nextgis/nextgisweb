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

            this.wGeometryType.addOption([
                { value: "", label: "Автоматически" },
                { value: "POINT", label: "Точка" },
                { value: "LINESTRING", label: "Линия" },
                { value: "POLYGON", label: "Полигон" }
            ]);

            if (this.operation == 'edit') {
                this.wFieldDefs.addOption([{value: 'keep', label: 'Сохранить текущие'}]);
            };            
            this.wFieldDefs.addOption([{value: 'update', label: 'Прочитать из базы данных'}]);

            this.wGeometryType.set('disabled', this.operation == 'edit');
            this.wSRS.set('disabled', this.operation == 'edit');

            if (this.value) {
                this.wConnection.set("value", this.value.connection);
                this.wGeometryType.set("value", this.value.geometry_type);
                this.wSRS.set("value", this.value.srs_id);
            };
        },

        _getValueAttr: function () {
            var result = { 
                connection: this.wConnection.get("value"),
                schema: this.wSchema.get("value"),
                table: this.wTable.get("value"),
                column_id: this.wColumnId.get("value"),
                column_geom: this.wColumnGeom.get("value"),
                srs_id: this.wSRS.get("value"),
                field_defs: this.wFieldDefs.get("value")
            };

            if (this.wGeometryType.get("value") != "") {
                result.geometry_type = this.wGeometryType.get("value");
            } else {
                result.geometry_type = null;
            };

            return result;
        },

        _setValueAttr: function (value) {
            this.wConnection.set("value", value["connection"]);
            this.wSchema.set("value", value["schema"]);
            this.wTable.set("value", value["table"]);
            this.wColumnId.set("value", value["column_id"]);
            this.wColumnGeom.set("value", value["column_geom"]);
            this.wGeometryType.set("value", value["geometry_type"]);
            console.log(2);
        },        

        validateWidget: function () {
            var widget = this;
            var result = { isValid: true, error: [] };

            array.forEach([this.wSchema, this.wTable, this.wColumnId, this.wColumnGeom], function (subw) {
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