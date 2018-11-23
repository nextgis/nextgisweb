/* globals define */
define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/request/xhr",
    "dojo/store/Memory",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-pyramid/i18n!postgis",
    "ngw-pyramid/hbs-i18n",
    "ngw-resource/serialize",
    "ngw/route",
    // resource
    "dojo/text!./template/LayerWidget.hbs",
    // template
    "dijit/form/ValidationTextBox",
    "dijit/form/Select",
    "dijit/form/ComboBox",
    "dojox/layout/TableContainer",
    "ngw-resource/ResourceBox",
    "ngw-pyramid/form/IntegerValueTextBox",
    "ngw-spatial-ref-sys/SpatialRefSysSelect"
], function (
    declare,
    array,
    lang,
    xhr,
    Memory,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    i18n,
    hbsI18n,
    serialize,
    route,
    template
) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, serialize.Mixin], {
        title: i18n.gettext("PostGIS layer"),
        templateString: hbsI18n(template, i18n),
        prefix: "postgis_layer",

        postCreate: function () {
            this.inherited(arguments);

            this.geometrySRID.set("disabled", this.composite.operation !== "create");
            this.geometryType.set("disabled", this.composite.operation !== "create");
            this.srs.set("disabled", this.composite.operation !== "create");
            this.fields.set("value", this.composite.operation == "create" ? "update" : "keep");

            // once connection is selected populate schemas
            this.wConnection.on("update", lang.hitch(this, this.populateSchemas));

            // track schema and table changes
            this.wSchema.watch("value", lang.hitch(this, function (attr, oldval, newval) {
                this.populateTables(newval);
            }));
            this.wTable.watch("value", lang.hitch(this, function (attr, oldval, newval) {
                this.populateColumns(this.wSchema.get("value"), newval);
            }));
        },

        serializeInMixin: function (data) {
            if (data.postgis_layer === undefined) { data.postgis_layer = {}; }
            var value = data.postgis_layer;
            value.srs = { id: this.srs.get("value") };
            if (value.geometry_type === "") {
                value.geometry_type = null;
            }
            if (value.geometry_srid !== null) {
                value.geometry_srid = parseInt(value.geometry_srid);
            }
        },

        populateSchemas: function (connection) {
            this.connection = connection.value;
            this.schemas = {};
            xhr.get(route.postgis.connection.inspect(this.connection), {
                handleAs: "json"
            }).then(lang.hitch(this, function (response) {
                array.forEach(response, function (item) {
                    this.schemas[item.schema] = item.tables.concat(item.views);
                }, this);
                var data = array.map(Object.keys(this.schemas), function (schema) {
                    return { id: schema };
                });
                this.wSchema.set("store", new Memory({data: data}));
            }));
        },

        populateTables: function (schema) {
            if (!schema) { return; }
            var data = array.map(this.schemas[schema], function (table) {
                return { id: table };
            });
            this.wTable.set("store", new Memory({data: data}));
        },

        populateColumns: function (schema, table) {
            if (!table) { return; }
            xhr.get(route.postgis.connection.inspect.table(this.connection.id, table), {
                handleAs: "json",
                query: { schema: schema }
            }).then(lang.hitch(this, function (response) {
                var idcols = [], geomcols = [];
                array.forEach(response, function (item) {
                    if (!item.type.startsWith("Geometry")) {
                        idcols.push({id: item.name});
                    } else {
                        geomcols.push({id: item.name});
                    }
                }, this);

                this.wColumnID.set("store", new Memory({data: idcols}));
                this.wColumnGeometry.set("store", new Memory({data: geomcols}));
            }));
        }
    });
});