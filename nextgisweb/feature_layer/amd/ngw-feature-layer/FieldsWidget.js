define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
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
    "ngw-pyramid/form/KeynameTextBox",
    "ngw-resource/serialize",
    "ngw-pyramid/i18n!feature_layer",
    //
    "xstyle/css!./resource/FieldsWidget.css",
    "ngw/dgrid/css"
], function (
    declare,
    lang,
    array,
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
    serialize,
    i18n
) {
    var fid = 1;

    var GridClass = declare([Grid, Selection, DijitRegistry], {
        selectionMode: "single",

        columns: [
            { field: "idx", label: "#", sortable: false },
            
            editor({
                field: "keyname",
                label: i18n.gettext("Keyname"),
                sortable: false,
                autoSave: true,
                editor: KeynameTextBox,
                editorArgs: {
                    required: true,
                    style: "width: 100%; border: none"
                }
            }),
            
            { field: "datatype", label: i18n.gettext("Type"), sortable: false },

            editor({
                field: "display_name",
                label: i18n.gettext("Display name"),
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
                label: i18n.gettext("FT"),
                sortable: false,
                autoSave: true,
                editor: CheckBox,
                editorArgs: { value: true }
            }),

            editor({
                field: "label_field",
                id: "label_field",
                label: i18n.gettext("LA"),
                sortable: false,
                autoSave: true, 
                editor: CheckBox,
                editorArgs: { value: true }
            })

        ]
    });


    return declare([ContentPane, serialize.Mixin], {
        title: i18n.gettext("Attributes"),
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
                label: i18n.gettext("Label attribute")
            });

            new Tooltip({
                connectId: [this.grid.column("grid_visibility").headerNode],
                label: i18n.gettext("Feature table")
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

            // TODO: We rely on MemoryStore.query being synchronous,
            // this might be not wise
            setObject("fields", this.store.query().map(function (src) {
                var obj = lang.clone(src);
                obj.fid = undefined;
                obj.idx = undefined;
                return obj;
            }));
        }

    });
});
