define([
    "dojo/_base/declare",
    "ngw/modelWidget/Widget",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./templates/LayerFieldsWidget.html",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojox/grid/DataGrid",
    "dojox/grid/cells",
    "dojo/data/ItemFileWriteStore",
    "xstyle/css!" + ngwConfig.amdUrl + 'dojox/grid/resources/claroGrid.css',
], function (
    declare,
    Widget,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    template,
    lang,
    array,
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
            console.log(cells);

            var data = {
              identifier: "id",
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
        },

        postCreate: function () {
            this.inherited(arguments);
            this.grid.placeAt(this.domNode);
        },

        startup: function () {
            this.inherited(arguments);
            this.grid.startup();
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
                }, this.store)
            };
        }
    });
});
