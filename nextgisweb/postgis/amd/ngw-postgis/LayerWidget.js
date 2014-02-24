/* globals define, console */
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-resource/ResourceStore",
    "ngw-resource/ResourcePicker",
    // resource
    "dojo/text!./templates/LayerWidget.html",
    // template
    "dijit/form/ValidationTextBox",
    "dijit/form/Select",
    "dojox/layout/TableContainer",
    "ngw/form/PickerBox",
    "ngw/form/SpatialRefSysSelect"
], function (
    declare,
    lang,
    array,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    ResourceStore,
    ResourcePicker,
    template
) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        identity: "postgis_layer",
        title: "Слой PostGIS",
        style: "padding: 1ex;",

        constructor: function () {
            this.connectionPicker = new ResourcePicker({cls: "postgis_connection"});
        },

        postCreate: function () {
            this.inherited(arguments);

            this.wGeometryType.addOption([
                { value: "", label: "Автоматически" },
                { value: "POINT", label: "Точка" },
                { value: "LINESTRING", label: "Линия" },
                { value: "POLYGON", label: "Полигон" }
            ]);

            if (this.composite.operation !== "create") {
                this.wFieldDefs.addOption([{value: "keep", label: "Сохранить текущие"}]);
            }

            this.wFieldDefs.addOption([{value: "update", label: "Прочитать из базы данных"}]);

            this.wGeometryType.set("disabled", this.composite.operation !== "create");
            this.wSRS.set("disabled", this.composite.operation !== "create");

            if (this.value) {
                this.wConnectionId.set("value", this.value.connection_id);
                this.wGeometryType.set("value", this.value.geometry_type);
                this.wSRS.set("value", this.value.srs_id);
            }
        },

        buildRendering: function () {
            this.inherited(arguments);

            this.wConnectionId.set("store", new ResourceStore());
            this.wConnectionId.on("pick", lang.hitch(this, function () {
                this.connectionPicker.pick().then(lang.hitch(this, function (itm) {
                    this.wConnectionId.set("value", itm.id);
                })).otherwise(console.error);
            }));
        },

        _setValueAttr: function (value) {
            this.wConnectionId.set("value", value.connection_id);
            this.wSchema.set("value", value.schema);
            this.wTable.set("value", value.table);
            this.wColumnId.set("value", value.column_id);
            this.wColumnGeom.set("value", value.column_geom);
            this.wGeometryType.set("value", value.geometry_type);
        },

        validateWidget: function () {
            var result = { isValid: true, error: [] };

            array.forEach([this.wSchema, this.wTable, this.wColumnId, this.wColumnGeom], function (subw) {
                // форсируем показ значка при проверке
                subw._hasBeenBlurred = true;
                subw.validate();

                // если есть ошибки, фиксируем их
                if ( !subw.isValid() ) {
                    result.isValid = false;
                }
            });

            return result;
        },

        serialize: function (data) {
            if (data.postgis_layer === undefined) { data.postgis_layer = {}; }
            var value = data.postgis_layer;

            value.connection = { id: this.wConnectionId.get("value") };
            value.schema = this.wSchema.get("value");
            value.table = this.wTable.get("value");
            value.column_id = this.wColumnId.get("value");
            value.column_geom = this.wColumnGeom.get("value");
            value.srs = { id: this.wSRS.get("value") };
            value.fields = this.wFieldDefs.get("value");

            if (this.wGeometryType.get("value") !== "") {
                value.geometry_type = this.wGeometryType.get("value");
            } else {
                value.geometry_type = null;
            }
        },

        deserialize: function (data) {
            this.wConnectionId.set("value", data.postgis_layer.connection.id);
            this.wSchema.set("value", data.postgis_layer.schema);
            this.wTable.set("value", data.postgis_layer.table);
            this.wColumnId.set("value", data.postgis_layer.column_id);
            this.wColumnGeom.set("value", data.postgis_layer.column_geom);
            this.wGeometryType.set("value", data.postgis_layer.geometry_type);
        }

    });
});