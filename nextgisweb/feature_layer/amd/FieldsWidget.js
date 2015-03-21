define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/Deferred",
    "dojo/when",
    "dojo/store/Memory",
    "dojo/store/Observable",
    "dojo/dom-construct",
    "dojo/dom-style",   
    "dojo/dom-class",
    "dijit/Tooltip",
    "dijit/layout/ContentPane",
    "dijit/form/CheckBox",
    "dijit/form/ValidationTextBox",
    "dgrid/OnDemandGrid",
    "dgrid/Selection",
    "dgrid/editor",
    "dgrid/extensions/DijitRegistry",
    "ngw/form/KeynameTextBox",
    "ngw-resource/serialize",
    //
    "xstyle/css!./resource/FieldsWidget.css",
    "ngw/dgrid/css"
], function (
    declare,
    lang,
    array,
    Deferred,
    when,
    Memory,
    Observable,
    domConstruct,
    domStyle,
    domClass,
    Tooltip,
    ContentPane,
    CheckBox,
    ValidationTextBox,
    Grid,
    Selection,
    editor,
    DijitRegistry,
    KeynameTextBox,
    serialize
) {
    var fid = 1;

    var GridClass = declare([Grid, Selection, DijitRegistry], {
        selectionMode: "single",

        columns: [
            { field: "idx", label: "#", sortable: false },
            
            editor({
                field: "keyname",
                label: "Ключ",
                sortable: false,
                autoSave: true,
                editor: KeynameTextBox,
                editorArgs: {
                    required: true,
                    style: "width: 100%; border: none"
                }
            }),
            
            { field: "datatype", label: "Тип", sortable: false },

            editor({
                field: "display_name",
                label: "Наименование",
                sortable: false,
                autoSave: true,
                editor: ValidationTextBox,
                editorArgs: {
                    value: "value",
                    required: true,
                    style: "width: 100%; border: none;"
                }
            }),

            editor({
                field: "grid_visibility",
                id: "grid_visibility",
                label: "ТО",
                sortable: false,
                autoSave: true,
                editor: CheckBox,
                editorArgs: { value: true }
            }),

            editor({
                field: "label_field",
                id: "label_field",
                label: "АН",
                sortable: false,
                autoSave: true, 
                editor: CheckBox,
                editorArgs: { value: true }
            })

        ]
    });


    return declare([ContentPane, serialize.Mixin], {
        title: "Атрибуты",
        prefix: "feature_layer",
        style: "padding: 0",

        constructor: function () {
            var store = new Observable(new Memory({idProperty: "fid"}));
            this.store = store;

            this.grid = new GridClass({ store: this.store });

            this.grid.on("dgrid-datachange", function(evt){
                if (evt.cell.column.field === "label_field" && evt.value === true) {
                    store.query({label_field: true}).forEach(function (obj) {
                        obj.label_field = false;
                        store.put(obj);
                    });
                }
            });

        },

        buildRendering: function () {
            this.inherited(arguments);
            domClass.add(this.domNode, "ngw-feature-layer-fields-widget");

            domClass.add(this.domNode, "dgrid-border-fix");
            domStyle.set(this.grid.domNode, "border", "none");
            
            domConstruct.place(this.grid.domNode, this.domNode);

            new Tooltip({
                connectId: [this.grid.column("label_field").headerNode],
                label: "Атрибут-наименование"
            });

            new Tooltip({
                connectId: [this.grid.column("grid_visibility").headerNode],
                label: "Таблица объектов"
            });

        },

        deserializeInMixin: function (data) {
            var value = data[this.prefix].fields,
                store = this.store,
                idx = 1;

            array.forEach(value, function (f) {
                var c = lang.clone(f);
                c.idx = idx; idx++;
                c.fid = fid; fid++;
                store.put(c);
            });
        },

        serializeInMixin: function (data) {
            var prefix = this.prefix,
                setObject = function (key, value) { lang.setObject(prefix + "." + key, value, data); };

            // TODO: Полагаемся на синхронность MemoryStore.query,
            // что возможно не совсем корректно
            setObject("fields", this.store.query().map(function (src) {
                var obj = lang.clone(src);
                obj.fid = undefined;
                obj.idx = undefined;
                return obj;
            }));
        }

    });
});