define([
    "dojo/_base/declare",
    "ngw/modelWidget/Widget",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./templates/LayerFieldsWidget.html",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dijit/form/FilteringSelect",
    "dojox/grid/DataGrid",
    "dojox/grid/cells",
    "dojo/data/ItemFileWriteStore",
    "xstyle/css!" + ngwConfig.amdUrl + 'dojox/grid/resources/claroGrid.css',
    // template
    "dojox/layout/TableContainer"    
], function (
    declare,
    Widget,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    template,
    lang,
    array,
    FilteringSelect,
    DataGrid,
    cells,
    ItemFileWriteStore
) {
    return declare([Widget, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        title: "Атрибуты",

        _structure: [
            {
                field: "keyname",
                name: "Ключ",
                width: '22.5%'
            }, {
                field: "datatype",
                name: "Тип",
                width: '12.5%'
            }, {
                field: "display_name",
                name: "Наименование",
                editable: true,
                width: "52.5%"
            }, {
                field: "grid_visibility",
                name: "Список",
                editable: true, cellType: cells.Bool,
                width: "12.5%"
            }
        ],

        constructor: function (params) {
            declare.safeMixin(this, params);

            var data = {
                identifier: "id",
                label: "keyname",
                items: lang.clone(this.value.fields)
            };

            this.store = new ItemFileWriteStore({data: data});

            this.grid = new DataGrid({
                store: this.store,
                structure: this._structure,
                autoHeight: true,
                singleClickEdit: true,
                canSort: function () { return false; }
            });

            this.wFeatureLabelField = new FilteringSelect({
                store: this.store,
                searchAttr: "keyname",
                required: false,
                label: "Наименование",
                style: "width: 100%"
            });
        },

        postCreate: function () {
            this.inherited(arguments);

            this.grid.placeAt(this.gridNode);

            this.tableContainer.addChild(this.wFeatureLabelField);
        },

        startup: function () {
            this.inherited(arguments);

            this.grid.startup();

            this.wFeatureLabelField.startup();
            this.wFeatureLabelField.set("value", this.value.feature_label_field_id);
        },

        _getValueAttr: function () {
            return {
                // Это не очень хорошая идея, но залезем во приватные переменные
                // store, чтобы получить текущие данные. Все остальные способы
                // дают результат только асинхронно.
                fields: array.map(this.store._arrayOfAllItems, function (f) {
                    return {
                        id: this.getValue(f, "id"),
                        keyname: this.getValue(f, "keyname"),
                        datatype: this.getValue(f, "datatype"),
                        display_name: this.getValue(f, "display_name"),
                        grid_visibility: this.getValue(f, "grid_visibility")
                    }
                }, this.store),

                feature_label_field_id: this.wFeatureLabelField.get("value")
            };
        }
    });
});
